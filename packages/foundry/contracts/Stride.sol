// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Stride
/// @notice Friends stake MON on a shared activity goal. Anyone who hits the goal
///         splits the stakes forfeited by anyone who doesn't. `submitActivity`'s
///         numbers are a claim, backed by a signed GPS+motion checkpoint chain
///         (pinned offchain, only its hash committed here) that any participant
///         can challenge with `dispute` if they think it's fake.
contract Stride is ReentrancyGuard, EIP712 {
    enum SubmissionStatus {
        None,
        Submitted,
        Slashed
    }

    enum ViolationType {
        HashChainBroken,
        InvalidCoordinates,
        SpeedImpossible,
        MotionMismatch,
        /// @dev Resolved via `disputeAggregateDistance`, not `dispute` — listed here so
        ///      both dispute paths share one outcome event with a consistent enum.
        DistanceMismatch
    }

    /// @notice One signed GPS+motion sample. `prevHash` is the EIP-712 digest of the
    ///         previous checkpoint in the chain (0x0 for index 0) — signing each one
    ///         the instant it's captured, referencing the last, makes editing any
    ///         point after the fact detectable: every signature after it breaks.
    struct Checkpoint {
        uint256 poolId;
        address runner;
        uint32 index;
        uint64 timestamp;
        int32 lat; // degrees * 1e6
        int32 lng; // degrees * 1e6
        uint16 cadenceSpm; // motion-sensor-derived steps/min; 0 = no motion detected
        bytes32 prevHash;
    }

    struct Pool {
        address creator;
        uint256 stakeAmount;
        uint256 goalDistanceMeters;
        uint64 joinDeadline;
        uint64 activityDeadline;
        uint64 disputeWindow;
        bool finalized;
        address[] participants;
    }

    struct Submission {
        SubmissionStatus status;
        bytes32 commitHash;
        uint256 distanceMeters;
        uint256 durationSeconds;
        uint32 checkpointCount;
        string ipfsCID;
        uint64 submittedAt;
        /// @dev Snapshot of deviceKey[runner] AT SUBMISSION TIME. Disputes must verify
        ///      signatures against this, never against the live `deviceKey` mapping —
        ///      otherwise a runner could rotate their device key right after submitting
        ///      to make their own signatures stop recovering to the "current" key,
        ///      permanently blocking every future dispute against that submission.
        address signingKey;
    }

    bytes32 private constant CHECKPOINT_TYPEHASH = keccak256(
        "Checkpoint(uint256 poolId,address runner,uint32 index,uint64 timestamp,int32 lat,int32 lng,uint16 cadenceSpm,bytes32 prevHash)"
    );

    /// @dev Flat meters-per-degree approximation, not latitude-corrected. Documented MVP
    ///      simplification (see stride/CLAUDE.md) — fine for a hackathon demo, a known
    ///      limitation for a v2, not a silent bug.
    uint256 public constant METERS_PER_DEGREE = 111_320;
    int32 public constant MAX_LAT = 90_000_000; // degrees * 1e6
    int32 public constant MAX_LNG = 180_000_000; // degrees * 1e6
    /// @dev Generous ceiling (world-class sustained sprint pace) chosen to avoid false
    ///      positives on legitimate fast running — this only needs to catch "drove a car"
    ///      or "teleported," not penalize a fast runner.
    uint256 public constant MAX_SPEED_MPS = 12;
    uint256 public constant DISPUTE_BOND = 0.01 ether;
    /// @dev Share of a slashed stake paid to whoever caught the cheat, in basis points.
    uint256 public constant BOUNTY_BPS = 1000;
    /// @dev Checkpoints must average at least one every 30s across the claimed duration,
    ///      checked at submission time — rejects trivially-sparse ("2 points, huge claimed
    ///      distance") fake chains outright instead of relying on someone noticing and
    ///      disputing it. Real client samples every ~10s, so this leaves real headroom
    ///      for a few dropped GPS reads without penalizing honest runs.
    uint256 public constant MAX_CHECKPOINT_INTERVAL_SECONDS = 30;
    /// @dev Below this implied speed, "no motion detected" is just standing still and
    ///      isn't suspicious (waiting at a crosswalk, catching your breath). Set well
    ///      above a literal 1 m/s walking pace deliberately: METERS_PER_DEGREE is a flat,
    ///      non-latitude-corrected conversion, which *always overestimates* east-west
    ///      distance away from the equator (by 1/cos(latitude) — ~2x at 60°N/S, real
    ///      running/hiking latitudes like Helsinki, Oslo, Stockholm, Anchorage). An
    ///      earlier value of 3 here was proven, by an actual PoC test, still too tight:
    ///      a genuinely stationary participant at 60°N with only ~20m of ordinary GPS
    ///      jitter (degraded signal, e.g. urban canyon or tree cover) computed to ~4 m/s
    ///      and got falsely slashed. Raised to give real headroom above that demonstrated
    ///      failure case (~30m of jitter at the same latitude would be needed to
    ///      false-trigger here) while staying comfortably below real vehicle speed,
    ///      which is what this check exists to catch — genuine GPS spoofing also tends
    ///      to fake a fast pace, not a slow one, since a cheater wants to finish quickly.
    ///      A real fix (an actual cos(latitude) correction) is a known, deliberately
    ///      deferred v2 item, same as METERS_PER_DEGREE's flatness generally — this is a
    ///      documented mitigation, not a claim the underlying bias is gone.
    uint256 public constant MIN_SPEED_FOR_MOTION_MPS = 6;
    /// @dev A single checkpoint has no successor, so `dispute` (which always needs an
    ///      adjacent pair) could never be run against it — a 1-checkpoint submission
    ///      would be permanently undisputable no matter what it claims. Require at
    ///      least 2 so every submission has at least one disputable pair.
    uint32 public constant MIN_CHECKPOINT_COUNT = 2;
    /// @dev Bounds `finalize`'s participant loops so a pool can't be Sybil-joined with
    ///      enough cheap addresses to push finalize() over the block gas limit and
    ///      freeze everyone's stake permanently.
    uint256 public constant MAX_PARTICIPANTS = 100;
    /// @dev Floor on disputeWindow so a pool (deliberately or carelessly configured)
    ///      can't finalize so fast nobody has real time to catch a cheater.
    uint64 public constant MIN_DISPUTE_WINDOW = 1 hours;
    /// @dev Grace margin for `disputeAggregateDistance`: the real, re-summed distance is
    ///      allowed to fall this far short of the claimed `distanceMeters` before it
    ///      counts as a mismatch — covers integer-sqrt rounding (always rounds down,
    ///      so real segment sums are a slight systematic underestimate) and ordinary
    ///      GPS noise across many segments, without opening a wide enough gap for a
    ///      meaningfully inflated claim to slip through.
    uint256 public constant DISTANCE_TOLERANCE_BPS = 500; // 5%

    uint256 public poolCount;
    mapping(uint256 => Pool) private _pools;
    mapping(uint256 => mapping(address => bool)) public hasJoined;
    mapping(uint256 => mapping(address => Submission)) public submissions;

    /// @notice main wallet => disposable session key authorized to sign that wallet's checkpoints
    mapping(address => address) public deviceKey;

    /// @notice poolId => address => amount owed, withdrawn via `withdraw`. Pull-payment
    ///         pattern: `finalize` only computes balances, never pushes ETH, so one
    ///         recipient that can't receive funds can never block everyone else's payout.
    mapping(uint256 => mapping(address => uint256)) public claimable;

    /// @notice poolId => total bounties already paid out to successful disputers —
    ///         subtracted from the pot in `finalize` so it isn't double-counted.
    mapping(uint256 => uint256) public bountyPaidOut;
    /// @notice poolId => total bonds forfeited by failed (spam) disputes — added back
    ///         into the pot in `finalize` so no wei from a failed dispute gets stuck.
    mapping(uint256 => uint256) public forfeitedBonds;

    constructor() EIP712("Stride", "1") {}

    event DeviceKeyRegistered(address indexed owner, address indexed sessionKey);
    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        uint256 stakeAmount,
        uint256 goalDistanceMeters,
        uint64 joinDeadline,
        uint64 activityDeadline,
        uint64 disputeWindow
    );
    event Joined(uint256 indexed poolId, address indexed participant);
    event ActivitySubmitted(
        uint256 indexed poolId,
        address indexed participant,
        bytes32 commitHash,
        uint256 distanceMeters,
        uint256 durationSeconds,
        string ipfsCID
    );
    event Finalized(uint256 indexed poolId, uint256 winnerCount, uint256 payoutPerWinner);
    event ActivityDisputed(
        uint256 indexed poolId,
        address indexed participant,
        address indexed disputer,
        ViolationType violationType,
        bool confirmed
    );

    error ZeroGoal();
    error ZeroStake();
    error BadDeadlines();
    error JoinClosed();
    error AlreadyJoined();
    error WrongStakeAmount();
    error NotParticipant();
    error SubmissionClosed();
    error AlreadySubmitted();
    error TooEarly();
    error AlreadyFinalized();
    error TransferFailed();
    error NothingToWithdraw();
    error PoolFinalized();
    error NotInDisputeWindow();
    error SubmissionNotDisputable();
    error NoDeviceKeyRegistered();
    error CheckpointMismatch();
    error InvalidChainedCheckpoints();
    error BadCheckpointSignature();
    error WrongBond();
    error InsufficientCheckpointDensity();
    error PoolFull();
    error DisputeWindowTooShort();
    error CannotDisputeSelf();
    error ChainLengthMismatch();
    error ChainNotContiguous();
    error CommitHashMismatch();

    /// @notice Authorize a disposable key to sign this wallet's GPS checkpoints for future runs,
    ///         so a run doesn't need a wallet popup every ~10 seconds. Re-call to rotate it.
    function registerDeviceKey(address sessionKey) external {
        deviceKey[msg.sender] = sessionKey;
        emit DeviceKeyRegistered(msg.sender, sessionKey);
    }

    function createPool(
        uint256 goalDistanceMeters,
        uint256 stakeAmount,
        uint64 joinDeadline,
        uint64 activityDeadline,
        uint64 disputeWindow
    ) external returns (uint256 poolId) {
        if (goalDistanceMeters == 0) revert ZeroGoal();
        if (stakeAmount == 0) revert ZeroStake();
        if (joinDeadline <= block.timestamp || activityDeadline <= joinDeadline) {
            revert BadDeadlines();
        }
        if (disputeWindow < MIN_DISPUTE_WINDOW) revert DisputeWindowTooShort();

        poolId = poolCount++;
        Pool storage p = _pools[poolId];
        p.creator = msg.sender;
        p.stakeAmount = stakeAmount;
        p.goalDistanceMeters = goalDistanceMeters;
        p.joinDeadline = joinDeadline;
        p.activityDeadline = activityDeadline;
        p.disputeWindow = disputeWindow;

        emit PoolCreated(
            poolId, msg.sender, stakeAmount, goalDistanceMeters, joinDeadline, activityDeadline, disputeWindow
        );
    }

    function joinPool(uint256 poolId) external payable {
        Pool storage p = _pools[poolId];
        if (block.timestamp > p.joinDeadline) revert JoinClosed();
        if (hasJoined[poolId][msg.sender]) revert AlreadyJoined();
        if (msg.value != p.stakeAmount) revert WrongStakeAmount();
        if (p.participants.length >= MAX_PARTICIPANTS) revert PoolFull();

        hasJoined[poolId][msg.sender] = true;
        p.participants.push(msg.sender);

        emit Joined(poolId, msg.sender);
    }

    /// @notice Claim you hit the goal. `commitHash` is the EIP-712 digest of the final
    ///         checkpoint in your signed chain (index = checkpointCount - 1) — tying the
    ///         claim to a specific, checkable checkpoint rather than an opaque blob.
    ///         `ipfsCID` is where the full chain is pinned so anyone can pull it down and
    ///         verify or dispute it. Reverts outright if `checkpointCount` is too low for
    ///         the claimed `durationSeconds` — a real run samples every ~10s, so a claim
    ///         that can't back itself with enough checkpoints never even gets submitted.
    ///         Requires a device key to already be registered: the key is snapshotted
    ///         into the submission right now, so it's fixed for this submission's whole
    ///         life even if the runner later rotates `deviceKey` for their next run.
    function submitActivity(
        uint256 poolId,
        bytes32 commitHash,
        uint256 distanceMeters,
        uint256 durationSeconds,
        uint32 checkpointCount,
        string calldata ipfsCID
    ) external {
        Pool storage p = _pools[poolId];
        if (!hasJoined[poolId][msg.sender]) revert NotParticipant();
        if (block.timestamp > p.activityDeadline) revert SubmissionClosed();
        if (submissions[poolId][msg.sender].status != SubmissionStatus.None) {
            revert AlreadySubmitted();
        }
        if (
            checkpointCount < MIN_CHECKPOINT_COUNT
                || durationSeconds / checkpointCount > MAX_CHECKPOINT_INTERVAL_SECONDS
        ) {
            revert InsufficientCheckpointDensity();
        }
        address key = deviceKey[msg.sender];
        if (key == address(0)) revert NoDeviceKeyRegistered();

        submissions[poolId][msg.sender] = Submission({
            status: SubmissionStatus.Submitted,
            commitHash: commitHash,
            distanceMeters: distanceMeters,
            durationSeconds: durationSeconds,
            checkpointCount: checkpointCount,
            ipfsCID: ipfsCID,
            // forge-lint: disable-next-line(unsafe-typecast) -- doesn't overflow uint64 until year 2554
            submittedAt: uint64(block.timestamp),
            signingKey: key
        });

        emit ActivitySubmitted(poolId, msg.sender, commitHash, distanceMeters, durationSeconds, ipfsCID);
    }

    /// @notice The EIP-712 digest for a checkpoint — the exact 32 bytes the device key
    ///         signs, and what the next checkpoint's `prevHash` must reference.
    function hashCheckpoint(Checkpoint calldata c) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                CHECKPOINT_TYPEHASH, c.poolId, c.runner, c.index, c.timestamp, c.lat, c.lng, c.cadenceSpm, c.prevHash
            )
        );
        return _hashTypedDataV4(structHash);
    }

    /// @notice Challenge a participant's submission by presenting two consecutive
    ///         checkpoints from their signed chain that prove a specific violation.
    ///         Requires a bond (anti-spam). Confirmed: participant is slashed, disputer
    ///         gets their bond back plus a bounty from the slashed stake. Not confirmed:
    ///         disputer's bond is forfeited into the pool's winner pot.
    function dispute(
        uint256 poolId,
        address participant,
        Checkpoint calldata a,
        bytes calldata sigA,
        Checkpoint calldata b,
        bytes calldata sigB,
        ViolationType violationType
    ) external payable {
        // A participant holds their own device key, so they can trivially sign a
        // throwaway, never-actually-submitted checkpoint pair (e.g. with a deliberately
        // broken prevHash) and "catch" themselves cheating — collecting the whistleblower
        // bounty out of their own forfeited stake, which should go to the winner pool
        // instead. Also kills the incentive for real disputers: a genuine cheater could
        // always self-slash first and take the bounty before anyone else could.
        if (msg.sender == participant) revert CannotDisputeSelf();

        Pool storage p = _pools[poolId];
        if (p.finalized) revert PoolFinalized();
        if (block.timestamp > uint256(p.activityDeadline) + uint256(p.disputeWindow)) {
            revert NotInDisputeWindow();
        }
        if (msg.value != DISPUTE_BOND) revert WrongBond();

        Submission storage s = submissions[poolId][participant];
        if (s.status != SubmissionStatus.Submitted) revert SubmissionNotDisputable();

        // Use the key snapshotted at submission time, NOT the live `deviceKey` mapping —
        // submitActivity guarantees this is already non-zero, so no separate zero-check
        // is needed here.
        address key = s.signingKey;

        if (a.poolId != poolId || b.poolId != poolId || a.runner != participant || b.runner != participant) {
            revert CheckpointMismatch();
        }
        if (b.index != a.index + 1 || b.timestamp <= a.timestamp) revert InvalidChainedCheckpoints();

        bytes32 digestA = hashCheckpoint(a);
        bytes32 digestB = hashCheckpoint(b);
        if (ECDSA.recover(digestA, sigA) != key || ECDSA.recover(digestB, sigB) != key) {
            revert BadCheckpointSignature();
        }

        bool confirmed = _checkViolation(a, b, digestA, violationType);

        if (confirmed) {
            _slashAndRewardDisputer(poolId, s, p.stakeAmount, msg.sender);
        } else {
            forfeitedBonds[poolId] += DISPUTE_BOND;
        }

        emit ActivityDisputed(poolId, participant, msg.sender, violationType, confirmed);
    }

    /// @notice Challenge a participant's TOTAL claimed distance by presenting their
    ///         entire signed checkpoint chain (not just an adjacent pair like `dispute`)
    ///         and proving the real, re-summed path length falls meaningfully short of
    ///         what they claimed at submission. `dispute` can only ever catch a
    ///         physically-impossible SEGMENT; it was never able to catch an honest-looking
    ///         chain paired with a simply-inflated total distance claim — this closes
    ///         that gap. The disputer must produce the runner's REAL chain: `chain`'s
    ///         length must match the claimed `checkpointCount`, every checkpoint must
    ///         chain-hash back to index 0, every signature must verify against the
    ///         snapshotted device key, and the final checkpoint must hash to the
    ///         `commitHash` fixed at submission time — a disputer cannot fabricate an
    ///         alternate story, only present what was actually committed to. Gas scales
    ///         with `checkpointCount`, so this is meant for genuine mismatches, not
    ///         casual spam (the bond still applies).
    function disputeAggregateDistance(
        uint256 poolId,
        address participant,
        Checkpoint[] calldata chain,
        bytes[] calldata sigs
    ) external payable {
        if (msg.sender == participant) revert CannotDisputeSelf();

        Pool storage p = _pools[poolId];
        if (p.finalized) revert PoolFinalized();
        if (block.timestamp > uint256(p.activityDeadline) + uint256(p.disputeWindow)) {
            revert NotInDisputeWindow();
        }
        if (msg.value != DISPUTE_BOND) revert WrongBond();

        Submission storage s = submissions[poolId][participant];
        if (s.status != SubmissionStatus.Submitted) revert SubmissionNotDisputable();
        if (chain.length != s.checkpointCount || sigs.length != chain.length) {
            revert ChainLengthMismatch();
        }

        address key = s.signingKey;
        bytes32 prevHash = bytes32(0);
        uint256 totalDistance = 0;

        for (uint256 i = 0; i < chain.length; i++) {
            Checkpoint calldata c = chain[i];
            if (c.poolId != poolId || c.runner != participant) revert CheckpointMismatch();
            if (c.index != i) revert ChainNotContiguous();
            if (c.prevHash != prevHash) revert InvalidChainedCheckpoints();
            if (i > 0 && c.timestamp <= chain[i - 1].timestamp) revert InvalidChainedCheckpoints();

            bytes32 digest = hashCheckpoint(c);
            if (ECDSA.recover(digest, sigs[i]) != key) revert BadCheckpointSignature();

            if (i > 0) {
                totalDistance += _segmentDistanceMeters(chain[i - 1], c);
            }

            prevHash = digest;
        }

        if (prevHash != s.commitHash) revert CommitHashMismatch();

        bool confirmed = totalDistance * 10_000 < s.distanceMeters * (10_000 - DISTANCE_TOLERANCE_BPS);

        if (confirmed) {
            _slashAndRewardDisputer(poolId, s, p.stakeAmount, msg.sender);
        } else {
            forfeitedBonds[poolId] += DISPUTE_BOND;
        }

        emit ActivityDisputed(poolId, participant, msg.sender, ViolationType.DistanceMismatch, confirmed);
    }

    /// @dev Shared slash-and-reward accounting for both dispute paths — keeps the two
    ///      functions from drifting out of sync on how a confirmed violation pays out.
    function _slashAndRewardDisputer(uint256 poolId, Submission storage s, uint256 stakeAmount, address disputer)
        internal
    {
        s.status = SubmissionStatus.Slashed;
        uint256 bounty = (stakeAmount * BOUNTY_BPS) / 10_000;
        bountyPaidOut[poolId] += bounty;
        claimable[poolId][disputer] += DISPUTE_BOND + bounty;
    }

    function _checkViolation(Checkpoint calldata a, Checkpoint calldata b, bytes32 digestA, ViolationType violationType)
        internal
        pure
        returns (bool)
    {
        if (violationType == ViolationType.HashChainBroken) {
            return b.prevHash != digestA;
        }

        if (violationType == ViolationType.InvalidCoordinates) {
            return _outOfBounds(a) || _outOfBounds(b);
        }

        uint256 dt = uint256(b.timestamp - a.timestamp);

        if (violationType == ViolationType.SpeedImpossible) {
            // Physically impossible: implied speed exceeds what a human can sustain.
            // Catches "drove a car" / "teleported" GPS traces.
            return _impliedSpeedExceeds(a, b, dt, MAX_SPEED_MPS);
        }

        // ViolationType.MotionMismatch — GPS shows real movement (faster than a slow
        // walk) but the phone's own motion sensor detected zero footstep rhythm at
        // *both* ends of the segment. This is the cheapest, most valuable check: it's
        // exactly what a GPS-only spoofing app leaves behind, since those tools fake
        // location but essentially never also fake a convincing accelerometer signal.
        // Requiring zero cadence at both ends (not just one) tolerates a single noisy
        // sensor read without flagging an honest runner.
        bool noMotion = a.cadenceSpm == 0 && b.cadenceSpm == 0;
        return noMotion && _impliedSpeedExceeds(a, b, dt, MIN_SPEED_FOR_MOTION_MPS);
    }

    /// @dev true if (distance between a and b, in meters)^2 > (speedThresholdMps * dt)^2.
    ///      No square root needed: both sides are scaled up instead of dividing down, so
    ///      there's no precision loss from Solidity's lack of floating point.
    function _impliedSpeedExceeds(Checkpoint calldata a, Checkpoint calldata b, uint256 dt, uint256 speedThresholdMps)
        internal
        pure
        returns (bool)
    {
        int256 dLat = int256(b.lat) - int256(a.lat);
        int256 dLng = int256(b.lng) - int256(a.lng);
        uint256 rawDistSq = uint256(dLat * dLat + dLng * dLng); // always >= 0

        uint256 lhs = rawDistSq * METERS_PER_DEGREE * METERS_PER_DEGREE;
        uint256 maxDist = speedThresholdMps * dt;
        uint256 rhs = maxDist * maxDist * 1e12;
        return lhs > rhs;
    }

    /// @dev Real (not squared-comparison) segment distance in meters, for summing across
    ///      a whole chain in `disputeAggregateDistance`. Same flat, non-latitude-corrected
    ///      METERS_PER_DEGREE approximation as `_impliedSpeedExceeds` — same documented
    ///      limitation, not a new one. `Math.sqrt` rounds down, so this is a slight
    ///      systematic underestimate per segment; DISTANCE_TOLERANCE_BPS covers it.
    function _segmentDistanceMeters(Checkpoint calldata a, Checkpoint calldata b) internal pure returns (uint256) {
        int256 dLat = int256(b.lat) - int256(a.lat);
        int256 dLng = int256(b.lng) - int256(a.lng);
        uint256 rawDistSq = uint256(dLat * dLat + dLng * dLng);
        uint256 distSqMeters = (rawDistSq * METERS_PER_DEGREE * METERS_PER_DEGREE) / 1e12;
        return Math.sqrt(distSqMeters);
    }

    function _outOfBounds(Checkpoint calldata c) internal pure returns (bool) {
        return c.lat > MAX_LAT || c.lat < -MAX_LAT || c.lng > MAX_LNG || c.lng < -MAX_LNG;
    }

    /// @notice Permissionless — anyone can trigger this once the dispute window has passed.
    ///         Computes who's owed what; does not move any ETH itself (see `withdraw`).
    ///         Winners split the stakes of anyone who didn't submit or didn't hit the goal.
    ///         If nobody hit the goal, everyone gets their own stake back.
    function finalize(uint256 poolId) external {
        Pool storage p = _pools[poolId];
        if (p.finalized) revert AlreadyFinalized();
        if (block.timestamp <= uint256(p.activityDeadline) + uint256(p.disputeWindow)) {
            revert TooEarly();
        }
        p.finalized = true;

        address[] memory participants = p.participants;
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (_isWinner(poolId, p, participants[i])) winnerCount++;
        }

        if (winnerCount == 0) {
            // Refund everyone who didn't win — except proven cheaters, who never get
            // their stake back even if nobody else "won" either. Their stake (minus
            // whatever bounty was already paid to whoever caught them), plus any bonds
            // forfeited by failed disputes, has no winner to go to here, so it goes to
            // the pool creator rather than being permanently stuck in the contract —
            // UNLESS the creator is themselves the slashed cheater, in which case it's
            // deliberately left unclaimed rather than let a cheater recover their own
            // forfeited stake through the "I'm the creator" back door.
            uint256 leftover = forfeitedBonds[poolId];
            for (uint256 i = 0; i < participants.length; i++) {
                if (submissions[poolId][participants[i]].status == SubmissionStatus.Slashed) {
                    leftover += p.stakeAmount;
                } else {
                    claimable[poolId][participants[i]] += p.stakeAmount;
                }
            }
            leftover -= bountyPaidOut[poolId];
            if (leftover > 0 && submissions[poolId][p.creator].status != SubmissionStatus.Slashed) {
                claimable[poolId][p.creator] += leftover;
            }
            emit Finalized(poolId, 0, 0);
            return;
        }

        uint256 pot =
            (participants.length * p.stakeAmount) - bountyPaidOut[poolId] + forfeitedBonds[poolId];
        uint256 payoutPerWinner = pot / winnerCount;
        // This is `pot % winnerCount`, not a precision-sensitive fraction —
        // payoutPerWinner's truncation above is intentional.
        // forge-lint: disable-next-line(divide-before-multiply)
        uint256 dust = pot - (payoutPerWinner * winnerCount);

        bool firstWinnerPaid = false;
        for (uint256 i = 0; i < participants.length; i++) {
            if (_isWinner(poolId, p, participants[i])) {
                uint256 amount = payoutPerWinner;
                if (!firstWinnerPaid) {
                    amount += dust;
                    firstWinnerPaid = true;
                }
                claimable[poolId][participants[i]] += amount;
            }
        }

        emit Finalized(poolId, winnerCount, payoutPerWinner);
    }

    /// @notice Pull your own payout after `finalize` has run. CEI + nonReentrant: your
    ///         balance is zeroed before the transfer, so this can't be re-entered to drain twice.
    function withdraw(uint256 poolId) external nonReentrant {
        uint256 amount = claimable[poolId][msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        claimable[poolId][msg.sender] = 0;

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _isWinner(uint256 poolId, Pool storage p, address participant) internal view returns (bool) {
        Submission storage s = submissions[poolId][participant];
        return s.status == SubmissionStatus.Submitted && s.distanceMeters >= p.goalDistanceMeters;
    }

    function getPool(uint256 poolId) external view returns (Pool memory) {
        return _pools[poolId];
    }

    function getParticipants(uint256 poolId) external view returns (address[] memory) {
        return _pools[poolId].participants;
    }

    function getSubmissionStatus(uint256 poolId, address participant) external view returns (SubmissionStatus) {
        return submissions[poolId][participant].status;
    }
}
