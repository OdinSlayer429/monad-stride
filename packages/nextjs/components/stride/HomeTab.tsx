import React from "react";
import { StarburstBadge, StatusPill } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { useCountUp } from "~~/hooks/stride/useCountUp";
import { Pool, UserProfile, UserRun } from "~~/types/stride";

interface HomeTabProps {
  profile: UserProfile;
  pools: Pool[];
  recentRuns: UserRun[];
  onStartRunClick: () => void;
  onSelectPool: (pool: Pool) => void;
  onViewAllPools: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  profile,
  pools,
  recentRuns,
  onStartRunClick,
  onSelectPool,
  onViewAllPools,
}) => {
  const activePools = pools.filter(p => p.status === "active" || p.status === "open");

  const { ref: streakRef, value: streakValue } = useCountUp<HTMLSpanElement>(profile.streakDays);
  const { ref: distanceRef, value: distanceValue } = useCountUp<HTMLSpanElement>(profile.totalDistanceMeters / 1000);
  const monWonTarget = parseFloat(profile.totalMONWon) || 0;
  const { ref: monWonRef, value: monWonValue } = useCountUp<HTMLSpanElement>(monWonTarget);
  const monWonSuffix = profile.totalMONWon.replace(/^[\d.]+\s*/, "");

  return (
    <div className="flex flex-col gap-5 pb-24 px-4 pt-2">
      {/* 1. HERO: THE BIG IMPOSSIBLE-TO-MISS "START RUN" CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1712] via-[#14100C] to-[#0B0906] border-2 border-[#CCFF00]/50 p-6 shadow-[0_12px_40px_rgba(204,255,0,0.15)] group">
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#CCFF00]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFF00]/15 border border-[#CCFF00]/40 text-[#CCFF00] text-xs font-black lowercase tracking-tight">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] beacon-pulse" />
              <span>ready to track</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#C7BEEA]/60">gps + motion ready</span>
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight lowercase">
              lace up & <br />
              <span className="text-[#CCFF00]">hit the road</span>
            </h1>
            <p className="text-xs text-[#C7BEEA]/80 mt-1 font-medium">Free solo tracking or stake in a friend pool.</p>
          </div>

          {/* THE GIANT START RUN BUTTON */}
          <StrideButton
            variant="neon"
            size="xl"
            fullWidth
            onClick={onStartRunClick}
            className="text-xl shadow-[0_6px_0_#000] active:shadow-[0_2px_0_#000]"
          >
            ⚡ start run ↗
          </StrideButton>
        </div>
      </div>

      {/* 2. STATS CHIPS BAR */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card p-3 flex flex-col items-center justify-center text-center">
          <span className="text-lg">🔥</span>
          <span ref={streakRef} className="text-base font-black text-white leading-tight mt-0.5 tabular-nums">
            {Math.round(streakValue)} days
          </span>
          <span className="text-[10px] text-[#C7BEEA]/60 font-bold lowercase">streak</span>
        </div>

        <div className="glass-card p-3 flex flex-col items-center justify-center text-center">
          <span className="text-lg">👟</span>
          <span ref={distanceRef} className="text-base font-black text-[#CCFF00] leading-tight mt-0.5 tabular-nums">
            {distanceValue.toFixed(1)} km
          </span>
          <span className="text-[10px] text-[#C7BEEA]/60 font-bold lowercase">total dist</span>
        </div>

        <div className="glass-card p-3 flex flex-col items-center justify-center text-center">
          <span className="text-lg">💰</span>
          <span ref={monWonRef} className="text-base font-black text-[#FF2E93] leading-tight mt-0.5 tabular-nums">
            {monWonValue.toFixed(2)} {monWonSuffix}
          </span>
          <span className="text-[10px] text-[#C7BEEA]/60 font-bold lowercase">won in pots</span>
        </div>
      </div>

      {/* 3. ACTIVE POOLS SECTION */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white tracking-tight lowercase flex items-center gap-2">
            active pools
            <span className="text-xs font-normal text-[#C7BEEA]/60">({activePools.length})</span>
          </h2>
          <button onClick={onViewAllPools} className="text-xs font-bold text-[#CCFF00] hover:underline lowercase">
            view all ↗
          </button>
        </div>

        {activePools.length === 0 ? (
          <div className="glass-card p-5 text-center text-xs text-[#C7BEEA]/70">
            No active pools yet. Create or join one to stake with friends!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activePools.map(pool => {
              const hasHitGoal = pool.participants.some(p => p.name.includes("You") && p.status === "hit_goal");
              return (
                <div
                  key={pool.id}
                  onClick={() => onSelectPool(pool)}
                  className="glass-card p-4 hover:border-[#CCFF00]/40 transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white lowercase group-hover:text-[#CCFF00] transition-colors">
                        {pool.title}
                      </span>
                      <span className="text-[11px] text-[#C7BEEA]/60 font-medium">
                        Goal: {(pool.goalDistanceMeters / 1000).toFixed(1)} km · Stake: {pool.stakeAmount}
                      </span>
                    </div>
                    <StatusPill
                      status={hasHitGoal ? "goal_hit" : pool.status}
                      label={hasHitGoal ? "goal hit ✅" : pool.status === "active" ? "2d left" : "open"}
                    />
                  </div>

                  {/* Mini-progress bar for pool participants */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 text-[#C7BEEA]/70">
                      <span>👥 {pool.participants.length} friends running</span>
                    </div>
                    <div className="text-[#CCFF00] font-mono">Pot: {pool.totalPot}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RECENT ACTIVITY FEED */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-white tracking-tight lowercase">recent runs</h2>

        {recentRuns.length === 0 ? (
          <div className="glass-card p-5 text-center text-xs text-[#C7BEEA]/70">
            No runs logged yet. Tap Start Run above to begin!
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentRuns.map(run => (
              <div key={run.id} className="glass-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#201B14] border border-white/10 flex items-center justify-center text-lg">
                    🗺️
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white lowercase leading-tight">{run.title}</span>
                    <span className="text-[11px] text-[#C7BEEA]/60 font-mono">
                      {(run.distanceMeters / 1000).toFixed(2)} km · {run.avgPace}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {run.poolTitle ? (
                    <span className="text-[10px] font-bold text-[#CCFF00] px-2 py-0.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 lowercase">
                      staked ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#C7BEEA]/50 px-2 py-0.5 rounded-full bg-white/5 lowercase">
                      solo run
                    </span>
                  )}
                  <span className="text-[10px] text-[#C7BEEA]/40 mt-1 font-mono">
                    {Math.floor(run.durationSeconds / 60)} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
