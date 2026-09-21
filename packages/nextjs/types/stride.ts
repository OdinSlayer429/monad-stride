export type PoolStatus = "open" | "active" | "awaiting_results" | "resolved";

export type ParticipantStatus = "joined" | "in_progress" | "hit_goal" | "didnt_submit" | "slashed";

export interface Checkpoint {
  poolId: number;
  runner: string;
  index: number;
  timestamp: number;
  lat: number; // degrees * 1e6
  lng: number; // degrees * 1e6
  cadenceSpm: number; // steps/min
  prevHash: string;
  signature?: string;
  /** The EIP-712 digest of this checkpoint — what the next checkpoint's prevHash
   * references, and what `signature` is a signature over. Same value Stride.sol's
   * `hashCheckpoint()` would compute onchain. */
  digest?: string;
}

export interface CheckpointSubmission {
  commitHash: string;
  distanceMeters: number;
  durationSeconds: number;
  checkpointCount: number;
  checkpoints: Checkpoint[];
  ipfsCID: string;
  submittedAt: number;
}

export interface Participant {
  address: string;
  name: string;
  avatar: string;
  status: ParticipantStatus;
  distanceMeters: number;
  durationSeconds: number;
  isDisputed: boolean;
  disputeReason?: string;
  disputeBounty?: string;
  submission?: CheckpointSubmission;
  suspiciousPattern?: {
    type: "SpeedImpossible" | "MotionMismatch" | "HashChainBroken";
    details: string;
    bountyMON: string;
  };
}

export interface Pool {
  id: string;
  title: string;
  creator: string;
  creatorName: string;
  stakeAmount: string; // e.g. "0.5 MON"
  stakeAmountWei?: bigint;
  goalDistanceMeters: number; // e.g. 5000 for 5km
  joinDeadline: number; // epoch ms
  activityDeadline: number; // epoch ms
  disputeWindowSeconds: number;
  status: PoolStatus;
  participants: Participant[];
  inviteCode: string;
  totalPot: string; // e.g. "2.5 MON"
  winnerCount?: number;
  payoutPerWinner?: string;
  finalized?: boolean;
}

export interface UserRun {
  id: string;
  title: string;
  timestamp: number;
  distanceMeters: number;
  durationSeconds: number;
  avgPace: string; // e.g. "5:12 /km"
  avgCadence: number; // e.g. 168 spm
  elevationMeters: number;
  calories: number;
  routeCoordinates: [number, number][]; // [lat, lng]
  checkpoints: Checkpoint[];
  poolId?: string;
  poolTitle?: string;
  submittedToPool: boolean;
}

export interface TrophyBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: string;
  unlockedAt?: string;
  tag: string;
}

export interface UserProfile {
  address: string;
  displayName: string;
  streakDays: number;
  totalDistanceMeters: number;
  poolsWon: number;
  totalMONWon: string;
  claimableMON: string;
  deviceSessionKey: string;
  isDeviceKeyRegistered: boolean;
  permissions: {
    location: boolean;
    motion: boolean;
    notifications: boolean;
  };
}
