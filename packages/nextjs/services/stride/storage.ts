import { Participant, Pool, TrophyBadge, UserProfile, UserRun } from "~~/types/stride";

const STORAGE_KEYS = {
  PROFILE: "stride_user_profile_v1",
  POOLS: "stride_pools_v1",
  RUNS: "stride_runs_v1",
  BADGES: "stride_badges_v1",
  HAS_ONBOARDED: "stride_has_onboarded_v1",
  PERMISSIONS_GRANTED: "stride_permissions_granted_v1",
};

// Initial mock pools
export const INITIAL_POOLS: Pool[] = [
  {
    id: "pool-1",
    title: "⚡ Monad Morning 5K Sprints",
    creator: "0x71C8364...a2B9",
    creatorName: "Maya",
    stakeAmount: "0.5 MON",
    goalDistanceMeters: 5000,
    joinDeadline: Date.now() - 3600 * 1000 * 4,
    activityDeadline: Date.now() + 3600 * 1000 * 48, // 2 days left
    disputeWindowSeconds: 3600,
    status: "active",
    inviteCode: "MON5K",
    totalPot: "2.5 MON",
    participants: [
      {
        address: "0x71C8364...a2B9",
        name: "Maya ⚡",
        avatar: "🏃‍♀️",
        status: "hit_goal",
        distanceMeters: 5240,
        durationSeconds: 1512,
        isDisputed: false,
      },
      {
        address: "0x34A91E...91b1",
        name: "Alex G.",
        avatar: "⚡",
        status: "in_progress",
        distanceMeters: 3820,
        durationSeconds: 1200,
        isDisputed: false,
      },
      {
        address: "0x000000000000000000000000000000000000dEaD", // current user
        name: "You (Runner)",
        avatar: "🔥",
        status: "in_progress",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
      {
        address: "0x88fA12...C731",
        name: "SpeedyGonzales",
        avatar: "🏎️",
        status: "hit_goal",
        distanceMeters: 5120,
        durationSeconds: 360, // Suspicious! 5km in 6 minutes = 50 km/h car!
        isDisputed: false,
        suspiciousPattern: {
          type: "SpeedImpossible",
          details: "Implied speed 14.2 m/s (> 12 m/s human world record). Cadence 0 spm (car ride).",
          bountyMON: "0.25 MON",
        },
      },
      {
        address: "0x44B123...4e5f",
        name: "Devon R.",
        avatar: "🎯",
        status: "joined",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
    ],
  },
  {
    id: "pool-2",
    title: "⛰️ Sunday Group 10K Climb",
    creator: "0x12dF7...99b2",
    creatorName: "Sam K.",
    stakeAmount: "1.0 MON",
    goalDistanceMeters: 10000,
    joinDeadline: Date.now() + 3600 * 1000 * 24, // 1 day left to join
    activityDeadline: Date.now() + 3600 * 1000 * 96,
    disputeWindowSeconds: 7200,
    status: "open",
    inviteCode: "CLIMB10",
    totalPot: "4.0 MON",
    participants: [
      {
        address: "0x12dF7...99b2",
        name: "Sam K.",
        avatar: "🧗‍♂️",
        status: "joined",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
      {
        address: "0x55cC1...12a4",
        name: "Taylor W.",
        avatar: "👟",
        status: "joined",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
      {
        address: "0x9911e...3412",
        name: "Elena P.",
        avatar: "✨",
        status: "joined",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
      {
        address: "0x000000000000000000000000000000000000dEaD",
        name: "You (Runner)",
        avatar: "🔥",
        status: "joined",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
    ],
  },
  {
    id: "pool-3",
    title: "🏆 Sunset 3K Dash (Resolved)",
    creator: "0x9812A...f1e2",
    creatorName: "Jordan",
    stakeAmount: "0.25 MON",
    goalDistanceMeters: 3000,
    joinDeadline: Date.now() - 3600 * 1000 * 72,
    activityDeadline: Date.now() - 3600 * 1000 * 24,
    disputeWindowSeconds: 3600,
    status: "resolved",
    inviteCode: "DASH3K",
    totalPot: "1.0 MON",
    winnerCount: 2,
    payoutPerWinner: "0.5 MON",
    finalized: true,
    participants: [
      {
        address: "0x000000000000000000000000000000000000dEaD",
        name: "You (Winner)",
        avatar: "🏅",
        status: "hit_goal",
        distanceMeters: 3180,
        durationSeconds: 940,
        isDisputed: false,
      },
      {
        address: "0x9812A...f1e2",
        name: "Jordan",
        avatar: "🌟",
        status: "hit_goal",
        distanceMeters: 3040,
        durationSeconds: 915,
        isDisputed: false,
      },
      {
        address: "0x77c...11a2",
        name: "Casey (Forfeited)",
        avatar: "💤",
        status: "didnt_submit",
        distanceMeters: 1200,
        durationSeconds: 600,
        isDisputed: false,
      },
      {
        address: "0x33e...aa99",
        name: "Morgan (Forfeited)",
        avatar: "🌧️",
        status: "didnt_submit",
        distanceMeters: 0,
        durationSeconds: 0,
        isDisputed: false,
      },
    ],
  },
];

// Initial mock runs
export const INITIAL_RUNS: UserRun[] = [
  {
    id: "run-101",
    title: "Morning River Loop",
    timestamp: Date.now() - 3600 * 1000 * 26,
    distanceMeters: 5120,
    durationSeconds: 1540,
    avgPace: "5:00 /km",
    avgCadence: 172,
    elevationMeters: 42,
    calories: 385,
    routeCoordinates: [
      [37.7749, -122.4194],
      [37.7758, -122.4172],
      [37.7782, -122.415],
      [37.781, -122.4168],
      [37.7802, -122.421],
      [37.7765, -122.4225],
      [37.7749, -122.4194],
    ],
    checkpoints: [],
    poolId: "pool-1",
    poolTitle: "⚡ Monad Morning 5K Sprints",
    submittedToPool: true,
  },
  {
    id: "run-100",
    title: "Sunset 3K Quick Pace",
    timestamp: Date.now() - 3600 * 1000 * 50,
    distanceMeters: 3180,
    durationSeconds: 940,
    avgPace: "4:55 /km",
    avgCadence: 176,
    elevationMeters: 18,
    calories: 230,
    routeCoordinates: [
      [37.782, -122.41],
      [37.7845, -122.408],
      [37.787, -122.412],
      [37.7835, -122.414],
      [37.782, -122.41],
    ],
    checkpoints: [],
    poolId: "pool-3",
    poolTitle: "🏆 Sunset 3K Dash",
    submittedToPool: true,
  },
];

// Initial mock trophies
export const INITIAL_BADGES: TrophyBadge[] = [
  {
    id: "b1",
    title: "7-Day Streak 🔥",
    description: "Maintained active running streak for a full week.",
    icon: "🔥",
    unlocked: true,
    unlockedAt: "Yesterday",
    tag: "STREAK",
  },
  {
    id: "b2",
    title: "5K Crusher ⚡",
    description: "Completed 5km under 25 minutes in a staked pool.",
    icon: "⚡",
    unlocked: true,
    unlockedAt: "3 days ago",
    tag: "SPEED",
  },
  {
    id: "b3",
    title: "Spot the Fake 🕵️",
    description: "Catch a cheater with speed or cadence mismatch.",
    icon: "🕵️",
    unlocked: false,
    progress: "0/1 disputes",
    tag: "BOUNTY",
  },
  {
    id: "b4",
    title: "Pool Champion 🏆",
    description: "Win the pot in 3 multi-friend staking pools.",
    icon: "🏆",
    unlocked: true,
    unlockedAt: "Last week",
    tag: "STAKING",
  },
  {
    id: "b5",
    title: "Ghost Buster 👻",
    description: "Beat a friend's recorded ghost pace in a live tracking session.",
    icon: "👻",
    unlocked: false,
    progress: "1/1 race left",
    tag: "SOCIAL",
  },
];

// Initial user profile
export const INITIAL_PROFILE: UserProfile = {
  address: "0xAEB87d56A552F9a9FA795853e1cEeEc4aC0D149e",
  displayName: "Alex / Stride Runner",
  streakDays: 7,
  totalDistanceMeters: 42800,
  poolsWon: 4,
  totalMONWon: "3.25 MON",
  claimableMON: "0.5 MON",
  deviceSessionKey: "0x89C572...B31D (EIP-712 Auto-Signer)",
  isDeviceKeyRegistered: true,
  permissions: {
    location: true,
    motion: true,
    notifications: true,
  },
};

// Storage helper functions
export const StrideStorage = {
  getProfile(): UserProfile {
    if (typeof window === "undefined") return INITIAL_PROFILE;
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_PROFILE));
      return INITIAL_PROFILE;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_PROFILE;
    }
  },

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    }
    return updated;
  },

  getPools(): Pool[] {
    if (typeof window === "undefined") return INITIAL_POOLS;
    const stored = localStorage.getItem(STORAGE_KEYS.POOLS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(INITIAL_POOLS));
      return INITIAL_POOLS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_POOLS;
    }
  },

  savePools(pools: Pool[]): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(pools));
    }
  },

  addPool(newPool: Pool): void {
    const pools = this.getPools();
    pools.unshift(newPool);
    this.savePools(pools);
  },

  joinPool(poolId: string, participant: Participant): boolean {
    const pools = this.getPools();
    const pool = pools.find(p => p.id === poolId || p.inviteCode.toUpperCase() === poolId.toUpperCase());
    if (!pool) return false;
    const exists = pool.participants.some(p => p.address === participant.address || p.name === participant.name);
    if (!exists) {
      pool.participants.push(participant);
      this.savePools(pools);
    }
    return true;
  },

  disputeParticipant(
    poolId: string,
    suspectAddress: string,
    disputerAddress: string,
  ): { success: boolean; bounty: string } {
    const pools = this.getPools();
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return { success: false, bounty: "0 MON" };

    const participant = pool.participants.find(p => p.address === suspectAddress);
    if (!participant || !participant.suspiciousPattern) {
      return { success: false, bounty: "0 MON" };
    }

    // Slash participant
    participant.status = "slashed";
    participant.isDisputed = true;
    const bounty = participant.suspiciousPattern.bountyMON || "0.25 MON";
    participant.disputeReason = `Caught by ${disputerAddress.slice(0, 6)}: ${participant.suspiciousPattern.details}`;

    this.savePools(pools);

    // Update user profile claimable
    const prof = this.getProfile();
    const currClaimableNum = parseFloat(prof.claimableMON.replace(/[^0-9.]/g, "")) || 0;
    const bountyNum = parseFloat(bounty.replace(/[^0-9.]/g, "")) || 0.25;
    this.updateProfile({
      claimableMON: `${(currClaimableNum + bountyNum).toFixed(2)} MON`,
    });

    // Unlock "Spot the Fake" badge
    this.unlockBadge("b3");

    return { success: true, bounty };
  },

  getRuns(): UserRun[] {
    if (typeof window === "undefined") return INITIAL_RUNS;
    const stored = localStorage.getItem(STORAGE_KEYS.RUNS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(INITIAL_RUNS));
      return INITIAL_RUNS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_RUNS;
    }
  },

  addRun(run: UserRun): void {
    const runs = this.getRuns();
    runs.unshift(run);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
    }

    // Update profile stats
    const prof = this.getProfile();
    this.updateProfile({
      totalDistanceMeters: prof.totalDistanceMeters + run.distanceMeters,
    });

    // If submitted to pool, update participant in pool
    if (run.poolId) {
      const pools = this.getPools();
      const pool = pools.find(p => p.id === run.poolId);
      if (pool) {
        const p = pool.participants.find(part => part.name.includes("You"));
        if (p) {
          p.distanceMeters = run.distanceMeters;
          p.durationSeconds = run.durationSeconds;
          if (run.distanceMeters >= pool.goalDistanceMeters) {
            p.status = "hit_goal";
          } else {
            p.status = "in_progress";
          }
          this.savePools(pools);
        }
      }
    }
  },

  getBadges(): TrophyBadge[] {
    if (typeof window === "undefined") return INITIAL_BADGES;
    const stored = localStorage.getItem(STORAGE_KEYS.BADGES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(INITIAL_BADGES));
      return INITIAL_BADGES;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_BADGES;
    }
  },

  unlockBadge(badgeId: string): void {
    const badges = this.getBadges();
    const b = badges.find(badge => badge.id === badgeId);
    if (b && !b.unlocked) {
      b.unlocked = true;
      b.unlockedAt = "Just now!";
      b.progress = undefined;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
      }
    }
  },

  claimAllWinnings(): string {
    const prof = this.getProfile();
    const claimed = prof.claimableMON;
    this.updateProfile({
      claimableMON: "0.00 MON",
      poolsWon: prof.poolsWon + 1,
    });
    return claimed;
  },

  hasOnboarded(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED) === "true";
  },

  setOnboarded(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, "true");
    }
  },

  hasGrantedPermissions(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEYS.PERMISSIONS_GRANTED) === "true";
  },

  setPermissionsGranted(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS_GRANTED, "true");
    }
  },
};
