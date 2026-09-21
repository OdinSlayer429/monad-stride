// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Stride} from "../contracts/Stride.sol";

contract StrideTest is Test {
    Stride stride;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant STAKE = 1 ether;
    uint256 constant GOAL_METERS = 5000; // 5km
    uint32 constant DENSE_CHECKPOINTS_1800S = 180; // one every 10s across a 1800s run

    // San Francisco-ish base coordinates, degrees * 1e6
    int32 constant BASE_LAT = 37_774_900;
    int32 constant BASE_LNG = -122_419_400;

    function setUp() public {
        stride = new Stride();
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);
    }

    function _createStandardPool() internal returns (uint256 poolId) {
        poolId = stride.createPool({
            goalDistanceMeters: GOAL_METERS,
            stakeAmount: STAKE,
            joinDeadline: uint64(block.timestamp + 1 days),
            activityDeadline: uint64(block.timestamp + 7 days),
            disputeWindow: uint64(1 days)
        });
    }

    function _mk(uint256 poolId, address runner, uint32 index, uint64 timestamp, int32 lat, int32 lng, uint16 cadence, bytes32 prevHash)
        internal
        pure
        returns (Stride.Checkpoint memory)
    {
        return Stride.Checkpoint({
            poolId: poolId,
            runner: runner,
            index: index,
            timestamp: timestamp,
            lat: lat,
            lng: lng,
            cadenceSpm: cadence,
            prevHash: prevHash
        });
    }

    function _sign(uint256 privateKey, Stride.Checkpoint memory c) internal view returns (bytes memory) {
        bytes32 digest = stride.hashCheckpoint(c);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Builds and signs a full, internally-consistent checkpoint chain (each one's
    ///      prevHash correctly referencing the last) for `disputeAggregateDistance` tests.
    function _buildAndSignChain(uint256 poolId, address runner, uint256 privateKey, int32[] memory lats, uint64 startTs, uint64 interval)
        internal
        view
        returns (Stride.Checkpoint[] memory chain, bytes[] memory sigs)
    {
        chain = new Stride.Checkpoint[](lats.length);
        sigs = new bytes[](lats.length);
        bytes32 prevHash = bytes32(0);
        for (uint256 i = 0; i < lats.length; i++) {
            chain[i] = _mk(poolId, runner, uint32(i), startTs + uint64(i) * interval, lats[i], BASE_LNG, 160, prevHash);
            sigs[i] = _sign(privateKey, chain[i]);
            prevHash = stride.hashCheckpoint(chain[i]);
        }
    }

    // ---------------------------------------------------------------------
    // Core pool lifecycle (Milestone 1)
    // ---------------------------------------------------------------------

    function test_FullHappyPath_TwoWinnersSplitOneLosersStake() public {
        uint256 poolId = _createStandardPool();

        vm.prank(alice);
        stride.joinPool{value: STAKE}(poolId);
        vm.prank(bob);
        stride.joinPool{value: STAKE}(poolId);
        vm.prank(carol);
        stride.joinPool{value: STAKE}(poolId);

        // alice and bob hit the goal, carol never submits (forfeits)
        vm.startPrank(alice);
        stride.registerDeviceKey(address(0xA11CE));
        stride.submitActivity(poolId, keccak256("alice-trace"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "ipfs://alice");
        vm.stopPrank();
        vm.startPrank(bob);
        stride.registerDeviceKey(address(0xB0B));
        stride.submitActivity(poolId, keccak256("bob-trace"), GOAL_METERS + 500, 1800, DENSE_CHECKPOINTS_1800S, "ipfs://bob");
        vm.stopPrank();

        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);

        stride.finalize(poolId);

        // pot = 3 ether, 2 winners => 1.5 ether each
        assertEq(stride.claimable(poolId, alice), 1.5 ether);
        assertEq(stride.claimable(poolId, bob), 1.5 ether);
        assertEq(stride.claimable(poolId, carol), 0);

        uint256 aliceBalBefore = alice.balance;
        vm.prank(alice);
        stride.withdraw(poolId);
        assertEq(alice.balance, aliceBalBefore + 1.5 ether);
        assertEq(stride.claimable(poolId, alice), 0);
    }

    function test_NoWinners_EveryoneRefundedTheirOwnStake() public {
        uint256 poolId = _createStandardPool();

        vm.prank(alice);
        stride.joinPool{value: STAKE}(poolId);
        vm.prank(bob);
        stride.joinPool{value: STAKE}(poolId);
        // nobody submits

        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);
        stride.finalize(poolId);

        assertEq(stride.claimable(poolId, alice), STAKE);
        assertEq(stride.claimable(poolId, bob), STAKE);
    }

    function test_DustFromRounding_GoesToFirstWinnerNotStuckForever() public {
        uint256 poolId = stride.createPool({
            goalDistanceMeters: GOAL_METERS,
            stakeAmount: 10, // 10 wei, deliberately not cleanly divisible by 3 winners
            joinDeadline: uint64(block.timestamp + 1 days),
            activityDeadline: uint64(block.timestamp + 7 days),
            disputeWindow: uint64(1 days)
        });

        address dave = makeAddr("dave");
        vm.deal(dave, 1 ether);

        vm.prank(alice);
        stride.joinPool{value: 10}(poolId);
        vm.prank(bob);
        stride.joinPool{value: 10}(poolId);
        vm.prank(carol);
        stride.joinPool{value: 10}(poolId);
        vm.prank(dave);
        stride.joinPool{value: 10}(poolId);
        // dave forfeits -> pot = 40 wei across 3 winners = 13 each + 1 dust

        vm.startPrank(alice);
        stride.registerDeviceKey(address(0xA11CE));
        stride.submitActivity(poolId, keccak256("a"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.stopPrank();
        vm.startPrank(bob);
        stride.registerDeviceKey(address(0xB0B));
        stride.submitActivity(poolId, keccak256("b"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.stopPrank();
        vm.startPrank(carol);
        stride.registerDeviceKey(address(0xCA401));
        stride.submitActivity(poolId, keccak256("c"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.stopPrank();

        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);
        stride.finalize(poolId);

        uint256 total = stride.claimable(poolId, alice) + stride.claimable(poolId, bob) + stride.claimable(poolId, carol);
        assertEq(total, 40, "all 40 wei must be accounted for, none stuck in the contract");
    }

    function test_RevertWhen_JoiningAfterDeadline() public {
        uint256 poolId = _createStandardPool();
        vm.warp(block.timestamp + 2 days);

        vm.prank(alice);
        vm.expectRevert(Stride.JoinClosed.selector);
        stride.joinPool{value: STAKE}(poolId);
    }

    function test_RevertWhen_WrongStakeAmount() public {
        uint256 poolId = _createStandardPool();
        vm.prank(alice);
        vm.expectRevert(Stride.WrongStakeAmount.selector);
        stride.joinPool{value: STAKE - 1}(poolId);
    }

    function test_RevertWhen_DoubleJoin() public {
        uint256 poolId = _createStandardPool();
        vm.startPrank(alice);
        stride.joinPool{value: STAKE}(poolId);
        vm.expectRevert(Stride.AlreadyJoined.selector);
        stride.joinPool{value: STAKE}(poolId);
        vm.stopPrank();
    }

    function test_RevertWhen_SubmittingWithoutJoining() public {
        uint256 poolId = _createStandardPool();
        vm.prank(alice);
        vm.expectRevert(Stride.NotParticipant.selector);
        stride.submitActivity(poolId, keccak256("x"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
    }

    function test_RevertWhen_DoubleSubmit() public {
        uint256 poolId = _createStandardPool();
        vm.startPrank(alice);
        stride.registerDeviceKey(address(0xA11CE));
        stride.joinPool{value: STAKE}(poolId);
        stride.submitActivity(poolId, keccak256("x"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.expectRevert(Stride.AlreadySubmitted.selector);
        stride.submitActivity(poolId, keccak256("y"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.stopPrank();
    }

    function test_RevertWhen_SubmittingWithInsufficientCheckpointDensity() public {
        uint256 poolId = _createStandardPool();
        vm.startPrank(alice);
        stride.registerDeviceKey(address(0xA11CE));
        stride.joinPool{value: STAKE}(poolId);
        // 1800s claimed with only 2 checkpoints => 900s/checkpoint, way over the 30s cap
        vm.expectRevert(Stride.InsufficientCheckpointDensity.selector);
        stride.submitActivity(poolId, keccak256("x"), GOAL_METERS, 1800, 2, "");
        vm.stopPrank();
    }

    function test_RevertWhen_SubmittingWithSingleCheckpoint() public {
        uint256 poolId = _createStandardPool();
        vm.startPrank(alice);
        stride.registerDeviceKey(address(0xA11CE));
        stride.joinPool{value: STAKE}(poolId);
        // Density math alone would pass (10s / 1 checkpoint = 10s <= 30s), but a single
        // checkpoint has no successor, so it could never be disputed — must be rejected
        // by the separate MIN_CHECKPOINT_COUNT floor.
        vm.expectRevert(Stride.InsufficientCheckpointDensity.selector);
        stride.submitActivity(poolId, keccak256("x"), GOAL_METERS, 10, 1, "");
        vm.stopPrank();
    }

    function test_RevertWhen_SubmittingWithoutDeviceKeyRegistered() public {
        uint256 poolId = _createStandardPool();
        vm.startPrank(bob); // bob joins but never registers a device key
        stride.joinPool{value: STAKE}(poolId);
        vm.expectRevert(Stride.NoDeviceKeyRegistered.selector);
        stride.submitActivity(poolId, keccak256("x"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.stopPrank();
    }

    function test_RevertWhen_PoolFull() public {
        uint256 poolId = _createStandardPool();
        uint256 max = stride.MAX_PARTICIPANTS();
        for (uint256 i = 0; i < max; i++) {
            address filler = address(uint160(uint256(keccak256(abi.encode("filler", i)))));
            vm.deal(filler, STAKE);
            vm.prank(filler);
            stride.joinPool{value: STAKE}(poolId);
        }

        vm.prank(alice);
        vm.expectRevert(Stride.PoolFull.selector);
        stride.joinPool{value: STAKE}(poolId);
    }

    function test_RevertWhen_DisputeWindowTooShort() public {
        vm.expectRevert(Stride.DisputeWindowTooShort.selector);
        stride.createPool({
            goalDistanceMeters: GOAL_METERS,
            stakeAmount: STAKE,
            joinDeadline: uint64(block.timestamp + 1 days),
            activityDeadline: uint64(block.timestamp + 7 days),
            disputeWindow: uint64(30 minutes) // below MIN_DISPUTE_WINDOW (1 hour)
        });
    }

    function test_RevertWhen_FinalizingTooEarly() public {
        uint256 poolId = _createStandardPool();
        vm.expectRevert(Stride.TooEarly.selector);
        stride.finalize(poolId);
    }

    function test_RevertWhen_FinalizingTwice() public {
        uint256 poolId = _createStandardPool();
        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);
        stride.finalize(poolId);
        vm.expectRevert(Stride.AlreadyFinalized.selector);
        stride.finalize(poolId);
    }

    function test_RevertWhen_WithdrawingNothing() public {
        vm.prank(alice);
        vm.expectRevert(Stride.NothingToWithdraw.selector);
        stride.withdraw(0);
    }

    // ---------------------------------------------------------------------
    // Dispute mechanism (Milestone 2 — the GPS anti-cheat layer)
    // ---------------------------------------------------------------------

    uint256 constant ALICE_DEVICE_SK = 0xA11CE5E55104;

    /// @dev Sets up a pool with alice joined, a device key registered, and a submission
    ///      in place, ready to be disputed. Returns the poolId.
    function _setUpDisputableSubmission() internal returns (uint256 poolId) {
        poolId = _createStandardPool();
        address device = vm.addr(ALICE_DEVICE_SK);

        vm.startPrank(alice);
        stride.registerDeviceKey(device);
        stride.joinPool{value: STAKE}(poolId);
        stride.submitActivity(poolId, keccak256("placeholder"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "ipfs://alice");
        vm.stopPrank();
    }

    function test_Dispute_HashChainBroken_SlashesParticipantAndPaysDisputer() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        // b's prevHash should be hashCheckpoint(a) but we deliberately break the chain
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100, BASE_LNG, 160, keccak256("wrong-prev-hash"));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        uint256 bobBalBefore = bob.balance;
        // NOTE: everything above (including any stride.* calls, e.g. inside _sign) must
        // happen BEFORE vm.prank — prank only applies to the literal next call, and an
        // inline `stride.something()` evaluated as a call argument silently consumes it.
        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.HashChainBroken);

        assertEq(uint8(stride.getSubmissionStatus(poolId, alice)), uint8(Stride.SubmissionStatus.Slashed));
        // bob gets his bond back plus a bounty, claimable (not yet withdrawn)
        assertGt(stride.claimable(poolId, bob), bond);
        assertEq(bob.balance, bobBalBefore - bond, "bond left bob's wallet, sitting in claimable now");
    }

    function test_Dispute_InvalidCoordinates_SlashesParticipant() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        int32 outOfBoundsLat = stride.MAX_LAT() + 1;
        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, outOfBoundsLat, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.InvalidCoordinates);

        assertEq(uint8(stride.getSubmissionStatus(poolId, alice)), uint8(Stride.SubmissionStatus.Slashed));
    }

    function test_Dispute_SpeedImpossible_SlashesParticipant() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        // ~11km jump in 10 seconds => ~1100 m/s, way beyond any human pace
        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100_000, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);

        assertEq(uint8(stride.getSubmissionStatus(poolId, alice)), uint8(Stride.SubmissionStatus.Slashed));
    }

    function test_Dispute_MotionMismatch_SlashesParticipant() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        // ~668m in 100s => ~6.7 m/s (well above MIN_SPEED_FOR_MOTION_MPS's margin for GPS
        // jitter / the flat-earth latitude overestimate) but cadence is 0 at both ends
        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 0, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1100, BASE_LAT + 6000, BASE_LNG, 0, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.MotionMismatch);

        assertEq(uint8(stride.getSubmissionStatus(poolId, alice)), uint8(Stride.SubmissionStatus.Slashed));
    }

    function test_Dispute_LegitimateCheckpoints_FailsAndForfeitsDisputerBond() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        // ~11m in 10s => ~1.1 m/s, ordinary jogging pace, cadence present — nothing wrong here
        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);

        assertEq(uint8(stride.getSubmissionStatus(poolId, alice)), uint8(Stride.SubmissionStatus.Submitted), "still standing, not slashed");
        assertEq(stride.claimable(poolId, bob), 0, "frivolous disputer gets nothing back immediately");
        assertEq(stride.forfeitedBonds(poolId), bond, "bond forfeited into the pot for finalize to distribute");
    }

    function test_RevertWhen_DisputeWrongBond() public {
        uint256 poolId = _setUpDisputableSubmission();
        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        vm.expectRevert(Stride.WrongBond.selector);
        stride.dispute{value: 1 wei}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);
    }

    function test_RevertWhen_DisputeSignedByWrongKey() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();
        uint256 wrongSk = 0xBADBAD;

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(wrongSk, a); // signed by a key that was never registered
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(wrongSk, b);

        vm.prank(bob);
        vm.expectRevert(Stride.BadCheckpointSignature.selector);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);
    }

    /// @dev Found in an independent fresh-context audit, not the earlier hardening pass:
    ///      a participant holds their own device key, so without this guard they could
    ///      sign a throwaway, never-actually-submitted checkpoint pair (e.g. with a
    ///      deliberately broken prevHash) and dispute THEMSELVES — collecting the
    ///      whistleblower bounty out of their own forfeited stake instead of it going to
    ///      the winner pool, and shorting whoever actually won.
    function test_RevertWhen_DisputingSelf() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        // Deliberately broken prevHash — a real violation, but alice is disputing her own
        // submission with it, trying to self-slash and pocket the bounty.
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100, BASE_LNG, 160, keccak256("wrong-prev-hash"));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(alice);
        vm.expectRevert(Stride.CannotDisputeSelf.selector);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.HashChainBroken);
    }

    function test_RevertWhen_DisputingAlreadySlashedSubmission() public {
        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100_000, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);

        // second dispute against the same (now-slashed) submission must not be possible
        vm.prank(carol);
        vm.expectRevert(Stride.SubmissionNotDisputable.selector);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);
    }

    /// @dev THE critical regression test for the device-key-rotation bug: before the fix,
    ///      `dispute` looked up the participant's CURRENT `deviceKey`, so a cheater could
    ///      submit a fraudulent activity and then immediately rotate their device key —
    ///      every future dispute would recover the old, still-valid signatures against
    ///      the NEW key, never match, and revert `BadCheckpointSignature` forever,
    ///      permanently shielding the cheat. The fix snapshots the signing key into the
    ///      Submission at submission time and disputes must verify against that snapshot,
    ///      not the live mapping. This test proves rotation no longer breaks disputes.
    function test_Dispute_StillWorksAfterParticipantRotatesDeviceKey() public {
        uint256 poolId = _setUpDisputableSubmission(); // alice registered ALICE_DEVICE_SK, submitted
        uint256 bond = stride.DISPUTE_BOND();

        // alice rotates her device key for her NEXT run, as the docs intend ("re-call to
        // rotate it") — this must NOT retroactively affect the submission already made.
        vm.prank(alice);
        stride.registerDeviceKey(address(0xC0FFEE));

        // Checkpoints signed with the ORIGINAL (now-rotated-away-from) key.
        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100_000, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);

        assertEq(
            uint8(stride.getSubmissionStatus(poolId, alice)),
            uint8(Stride.SubmissionStatus.Slashed),
            "dispute must still succeed against the key active at submission time"
        );
    }

    /// @dev Slashed cheater loses their whole stake (none refunded even if nobody else
    ///      wins) and the disputer who caught them gets bond + bounty. When the cheater
    ///      is ALSO the pool creator, the creator-sweep is deliberately skipped — see
    ///      the companion test below for the honest-creator case where it does sweep.
    function test_SlashedCheaterWhoIsAlsoCreator_CannotRecoverOwnForfeitedStake() public {
        uint256 poolId = _setUpDisputableSubmission(); // alice is creator, joined, submitted
        vm.prank(bob);
        stride.joinPool{value: STAKE}(poolId);
        // bob never submits -> if alice gets slashed, there are zero winners
        uint256 bond = stride.DISPUTE_BOND();

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100_000, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(carol);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);

        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);
        stride.finalize(poolId);

        assertEq(stride.claimable(poolId, alice), 0, "cheater gets nothing back");
        assertEq(stride.claimable(poolId, bob), STAKE, "honest non-winner still refunded");
        // Here the cheater (alice) is ALSO the pool creator — the creator-sweep is
        // deliberately skipped in that case (see finalize's comment), so her forfeited
        // stake minus the disputer's bounty (0.9 ether) is intentionally left unclaimed
        // in the contract rather than let a cheating creator recover it through the
        // "leftover goes to creator" back door. This is the correct, safe outcome, not
        // a bug: the alternative (letting it flow to her) would be a real exploit.
        uint256 totalIn = STAKE * 2 + bond;
        uint256 totalOut = stride.claimable(poolId, alice) + stride.claimable(poolId, bob) + stride.claimable(poolId, carol);
        uint256 intentionallyStuck = totalIn - totalOut;
        assertEq(intentionallyStuck, 0.9 ether, "exactly the cheater's forfeited stake minus the paid bounty, and only because they were also the creator");
    }

    /// @dev Same zero-winner + slash scenario, but this time the creator (bob) is NOT
    ///      the cheater (alice) — the leftover correctly sweeps to the honest creator,
    ///      and every wei is accounted for.
    function test_SlashedCheaterInZeroWinnerPool_HonestCreatorSweepsLeftover() public {
        vm.prank(bob); // bob is the creator this time — must prank BEFORE createPool,
        // not after, since createPool itself has no prior stride.* calls to accidentally
        // consume it, but every other call in this file follows the same discipline.
        uint256 poolId = stride.createPool({
            goalDistanceMeters: GOAL_METERS,
            stakeAmount: STAKE,
            joinDeadline: uint64(block.timestamp + 1 days),
            activityDeadline: uint64(block.timestamp + 7 days),
            disputeWindow: uint64(1 days)
        });

        address device = vm.addr(ALICE_DEVICE_SK);
        vm.prank(alice);
        stride.registerDeviceKey(device);
        vm.prank(alice);
        stride.joinPool{value: STAKE}(poolId);
        vm.prank(alice);
        stride.submitActivity(poolId, keccak256("x"), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, "");
        vm.prank(bob);
        stride.joinPool{value: STAKE}(poolId);
        // bob (creator) never submits -> zero winners once alice is slashed
        uint256 bond = stride.DISPUTE_BOND();

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, BASE_LAT, BASE_LNG, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b = _mk(poolId, alice, 1, 1010, BASE_LAT + 100_000, BASE_LNG, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        vm.prank(carol);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);

        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);
        stride.finalize(poolId);

        assertEq(stride.claimable(poolId, alice), 0, "cheater gets nothing");
        assertEq(stride.claimable(poolId, bob), STAKE + 0.9 ether, "honest creator gets own refund plus the leftover sweep");
        uint256 totalIn = STAKE * 2 + bond;
        uint256 totalOut = stride.claimable(poolId, alice) + stride.claimable(poolId, bob) + stride.claimable(poolId, carol);
        assertEq(totalOut, totalIn, "every wei accounted for when the creator is honest");
    }

    /// @dev The squared-distance speed check is the core anti-cheat arithmetic — if any
    ///      in-bounds, otherwise-valid checkpoint pair could make `dispute` revert
    ///      (overflow) instead of resolving to true/false, a cheater could craft data
    ///      that's un-disputable, defeating the whole mechanism. Fuzz across the full
    ///      valid coordinate range and a wide range of elapsed time to rule that out.
    function testFuzz_SpeedCheckNeverRevertsForInBoundsCheckpoints(
        int32 lat0,
        int32 lng0,
        int32 lat1,
        int32 lng1,
        uint32 dtSeconds
    ) public {
        lat0 = int32(bound(lat0, -90_000_000, 90_000_000));
        lng0 = int32(bound(lng0, -180_000_000, 180_000_000));
        lat1 = int32(bound(lat1, -90_000_000, 90_000_000));
        lng1 = int32(bound(lng1, -180_000_000, 180_000_000));
        dtSeconds = uint32(bound(dtSeconds, 1, 30 days));

        uint256 poolId = _setUpDisputableSubmission();
        uint256 bond = stride.DISPUTE_BOND();

        Stride.Checkpoint memory a = _mk(poolId, alice, 0, 1000, lat0, lng0, 160, bytes32(0));
        bytes memory sigA = _sign(ALICE_DEVICE_SK, a);
        Stride.Checkpoint memory b =
            _mk(poolId, alice, 1, 1000 + uint64(dtSeconds), lat1, lng1, 160, stride.hashCheckpoint(a));
        bytes memory sigB = _sign(ALICE_DEVICE_SK, b);

        // Must not revert with a panic (arithmetic overflow) — confirmed true or false
        // are both fine outcomes, an unexpected revert is the only failure mode here.
        vm.prank(bob);
        stride.dispute{value: bond}(poolId, alice, a, sigA, b, sigB, Stride.ViolationType.SpeedImpossible);
    }

    // ---------------------------------------------------------------------
    // Aggregate distance dispute — catches an inflated total-distance claim that no
    // single adjacent-pair check in `dispute` could ever see.
    // ---------------------------------------------------------------------

    /// @dev Shared setup: a real, honestly-signed 3-checkpoint chain covering ~20m
    ///      total (two ~10m northward hops), with a genuine commitHash tying the
    ///      submission to that exact chain's final checkpoint.
    function _setUpChainAndCommitHash(uint256 poolId)
        internal
        view
        returns (Stride.Checkpoint[] memory chain, bytes[] memory sigs, bytes32 commitHash)
    {
        int32[] memory lats = new int32[](3);
        lats[0] = BASE_LAT;
        lats[1] = BASE_LAT + 90; // ~10m north
        lats[2] = BASE_LAT + 180; // another ~10m north, ~20m total
        (chain, sigs) = _buildAndSignChain(poolId, alice, ALICE_DEVICE_SK, lats, 1000, 20);
        commitHash = stride.hashCheckpoint(chain[2]);
    }

    function test_DisputeAggregateDistance_CatchesInflatedClaim() public {
        uint256 poolId = _createStandardPool();
        address device = vm.addr(ALICE_DEVICE_SK);
        vm.startPrank(alice);
        stride.registerDeviceKey(device);
        stride.joinPool{value: STAKE}(poolId);
        vm.stopPrank();

        (Stride.Checkpoint[] memory chain, bytes[] memory sigs, bytes32 commitHash) = _setUpChainAndCommitHash(poolId);

        // Claims the full 5km goal off a chain that's really only ~20m — exactly the
        // lie no adjacent-pair check in `dispute` could ever catch, since every
        // individual ~10m hop is completely unremarkable on its own.
        vm.prank(alice);
        stride.submitActivity(poolId, commitHash, GOAL_METERS, 60, 3, "ipfs://alice");

        uint256 bond = stride.DISPUTE_BOND();
        vm.prank(bob);
        stride.disputeAggregateDistance{value: bond}(poolId, alice, chain, sigs);

        assertEq(
            uint8(stride.getSubmissionStatus(poolId, alice)),
            uint8(Stride.SubmissionStatus.Slashed),
            "inflated aggregate distance claim must be catchable even with an honest-looking chain"
        );
    }

    function test_DisputeAggregateDistance_HonestChain_NotConfirmed() public {
        uint256 poolId = _createStandardPool();
        address device = vm.addr(ALICE_DEVICE_SK);
        vm.startPrank(alice);
        stride.registerDeviceKey(device);
        stride.joinPool{value: STAKE}(poolId);
        vm.stopPrank();

        (Stride.Checkpoint[] memory chain, bytes[] memory sigs, bytes32 commitHash) = _setUpChainAndCommitHash(poolId);

        // Claims 15m off a chain that's really ~20m — honest (even a slight undersell),
        // must NOT be slashable.
        vm.prank(alice);
        stride.submitActivity(poolId, commitHash, 15, 60, 3, "ipfs://alice");

        uint256 bond = stride.DISPUTE_BOND();
        vm.prank(bob);
        stride.disputeAggregateDistance{value: bond}(poolId, alice, chain, sigs);

        assertEq(
            uint8(stride.getSubmissionStatus(poolId, alice)),
            uint8(Stride.SubmissionStatus.Submitted),
            "honest claim must survive an aggregate-distance dispute"
        );
        assertEq(stride.forfeitedBonds(poolId), bond, "frivolous disputer's bond forfeited into the pot");
    }

    function test_RevertWhen_DisputeAggregateDistance_ChainLengthMismatch() public {
        uint256 poolId = _createStandardPool();
        address device = vm.addr(ALICE_DEVICE_SK);
        vm.startPrank(alice);
        stride.registerDeviceKey(device);
        stride.joinPool{value: STAKE}(poolId);
        vm.stopPrank();

        (Stride.Checkpoint[] memory chain, bytes[] memory sigs, bytes32 commitHash) = _setUpChainAndCommitHash(poolId);

        vm.prank(alice);
        stride.submitActivity(poolId, commitHash, 15, 60, 3, "");

        Stride.Checkpoint[] memory shortChain = new Stride.Checkpoint[](2);
        shortChain[0] = chain[0];
        shortChain[1] = chain[1];
        bytes[] memory shortSigs = new bytes[](2);
        shortSigs[0] = sigs[0];
        shortSigs[1] = sigs[1];

        uint256 bond = stride.DISPUTE_BOND();
        vm.prank(bob);
        vm.expectRevert(Stride.ChainLengthMismatch.selector);
        stride.disputeAggregateDistance{value: bond}(poolId, alice, shortChain, shortSigs);
    }

    /// @dev A disputer cannot fabricate an alternate story: presenting a fully valid,
    ///      self-consistent, correctly-signed chain that simply doesn't match what the
    ///      runner actually committed to at submission time must be rejected.
    function test_RevertWhen_DisputeAggregateDistance_CommitHashMismatch() public {
        uint256 poolId = _createStandardPool();
        address device = vm.addr(ALICE_DEVICE_SK);
        vm.startPrank(alice);
        stride.registerDeviceKey(device);
        stride.joinPool{value: STAKE}(poolId);
        vm.stopPrank();

        (Stride.Checkpoint[] memory chain, bytes[] memory sigs,) = _setUpChainAndCommitHash(poolId);

        vm.prank(alice);
        stride.submitActivity(poolId, keccak256("not-the-real-commit-hash"), 15, 60, 3, "");

        uint256 bond = stride.DISPUTE_BOND();
        vm.prank(bob);
        vm.expectRevert(Stride.CommitHashMismatch.selector);
        stride.disputeAggregateDistance{value: bond}(poolId, alice, chain, sigs);
    }

    function test_RevertWhen_DisputeAggregateDistance_Self() public {
        uint256 poolId = _createStandardPool();
        address device = vm.addr(ALICE_DEVICE_SK);
        vm.startPrank(alice);
        stride.registerDeviceKey(device);
        stride.joinPool{value: STAKE}(poolId);
        vm.stopPrank();

        (Stride.Checkpoint[] memory chain, bytes[] memory sigs, bytes32 commitHash) = _setUpChainAndCommitHash(poolId);

        vm.prank(alice);
        stride.submitActivity(poolId, commitHash, GOAL_METERS, 60, 3, "");

        uint256 bond = stride.DISPUTE_BOND();
        vm.prank(alice);
        vm.expectRevert(Stride.CannotDisputeSelf.selector);
        stride.disputeAggregateDistance{value: bond}(poolId, alice, chain, sigs);
    }

    // ---------------------------------------------------------------------
    // Fuzz: fund conservation holds under arbitrary winner/loser splits
    // ---------------------------------------------------------------------

    function testFuzz_PayoutNeverExceedsPotAndNoDustIsLost(uint96 stakeAmount, uint8 winnerCount, uint8 loserCount)
        public
    {
        stakeAmount = uint96(bound(stakeAmount, 1, 1 ether));
        winnerCount = uint8(bound(winnerCount, 1, 5));
        loserCount = uint8(bound(loserCount, 0, 5));

        uint256 poolId = stride.createPool({
            goalDistanceMeters: GOAL_METERS,
            stakeAmount: stakeAmount,
            joinDeadline: uint64(block.timestamp + 1 days),
            activityDeadline: uint64(block.timestamp + 7 days),
            disputeWindow: uint64(1 days)
        });

        address[] memory winners = new address[](winnerCount);
        for (uint256 i = 0; i < winnerCount; i++) {
            address a = address(uint160(uint256(keccak256(abi.encode("winner", i)))));
            winners[i] = a;
            vm.deal(a, stakeAmount);
            vm.startPrank(a);
            stride.registerDeviceKey(address(uint160(uint256(keccak256(abi.encode("device", i))))));
            stride.joinPool{value: stakeAmount}(poolId);
            stride.submitActivity(
                poolId, keccak256(abi.encode("trace", i)), GOAL_METERS, 1800, DENSE_CHECKPOINTS_1800S, ""
            );
            vm.stopPrank();
        }
        for (uint256 i = 0; i < loserCount; i++) {
            address a = address(uint160(uint256(keccak256(abi.encode("loser", i)))));
            vm.deal(a, stakeAmount);
            vm.prank(a);
            stride.joinPool{value: stakeAmount}(poolId);
            // losers never submit
        }

        Stride.Pool memory pool = stride.getPool(poolId);
        vm.warp(uint256(pool.activityDeadline) + uint256(pool.disputeWindow) + 1);
        stride.finalize(poolId);

        uint256 pot = uint256(stakeAmount) * (uint256(winnerCount) + uint256(loserCount));
        uint256 totalClaimable;
        for (uint256 i = 0; i < winnerCount; i++) {
            totalClaimable += stride.claimable(poolId, winners[i]);
        }

        assertEq(totalClaimable, pot, "every wei of the pot must be claimable by exactly the winners");
        assertLe(address(stride).balance, pot, "contract should never hold more than the pot for this pool");
    }
}
