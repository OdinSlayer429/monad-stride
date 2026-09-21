import React, { useState } from "react";
import { StarburstBadge, StatusPill } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { Pool, PoolStatus } from "~~/types/stride";

interface PoolsTabProps {
  pools: Pool[];
  onSelectPool: (pool: Pool) => void;
  onCreatePool: (newPool: Omit<Pool, "id" | "participants" | "totalPot" | "status" | "inviteCode">) => void;
  onJoinPool: (inviteCode: string) => boolean;
}

export const PoolsTab: React.FC<PoolsTabProps> = ({ pools, onSelectPool, onCreatePool, onJoinPool }) => {
  const [filter, setFilter] = useState<PoolStatus | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);

  // Form states for Create Pool
  const [title, setTitle] = useState<string>("Weekend 5K Run");
  const [goalKm, setGoalKm] = useState<string>("5.0");
  const [stakeMON, setStakeMON] = useState<string>("0.5");
  const [durationDays, setDurationDays] = useState<string>("3");

  // Form state for Join Pool
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [joinError, setJoinError] = useState<string>("");

  const filteredPools = pools.filter(p => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goalMeters = Math.round((parseFloat(goalKm) || 5) * 1000);
    const stake = `${parseFloat(stakeMON) || 0.5} MON`;
    const days = parseInt(durationDays) || 3;

    onCreatePool({
      title: `⚡ ${title}`,
      creator: "0xCurrentUser",
      creatorName: "You",
      stakeAmount: stake,
      goalDistanceMeters: goalMeters,
      joinDeadline: Date.now() + 3600 * 1000 * 24, // 24 hours to join
      activityDeadline: Date.now() + 3600 * 1000 * 24 * days,
      disputeWindowSeconds: 3600,
    });

    setShowCreateModal(false);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    const success = onJoinPool(joinCodeInput.trim());
    if (success) {
      setShowJoinModal(false);
      setJoinCodeInput("");
      setJoinError("");
    } else {
      setJoinError("Pool code not found or already joined.");
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-2 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white lowercase tracking-tight">friend pools</h1>
          <p className="text-xs text-[#C7BEEA]/60">stake together on shared goals</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold lowercase transition-all"
          >
            join 🔗
          </button>
          <StrideButton variant="neon" size="sm" onClick={() => setShowCreateModal(true)}>
            + create pool
          </StrideButton>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1C1440] border border-white/5 overflow-x-auto">
        {(["all", "active", "open", "resolved"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
              filter === f
                ? "bg-[#CCFF00] text-black shadow-[0_2px_8px_rgba(204,255,0,0.3)]"
                : "text-[#C7BEEA]/60 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Pools List */}
      <div className="flex flex-col gap-3">
        {filteredPools.map(pool => {
          const hasHitGoal = pool.participants.some(p => p.name.includes("You") && p.status === "hit_goal");

          return (
            <div
              key={pool.id}
              onClick={() => onSelectPool(pool)}
              className="glass-card p-4 hover:border-[#CCFF00]/50 transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-base font-black text-white lowercase group-hover:text-[#CCFF00] transition-colors leading-snug">
                    {pool.title}
                  </span>
                  <span className="text-xs text-[#C7BEEA]/70 font-medium mt-0.5">
                    Created by {pool.creatorName} · Code:{" "}
                    <span className="font-mono text-white">{pool.inviteCode}</span>
                  </span>
                </div>
                <StatusPill
                  status={hasHitGoal ? "goal_hit" : pool.status}
                  label={hasHitGoal ? "goal hit ✅" : undefined}
                />
              </div>

              {/* Pool Metrics Row */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-[#0D0B08] border border-white/5 text-center">
                <div>
                  <span className="text-[10px] text-[#C7BEEA]/60 block uppercase">goal</span>
                  <span className="text-xs font-black text-white">
                    {(pool.goalDistanceMeters / 1000).toFixed(1)} km
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#C7BEEA]/60 block uppercase">stake</span>
                  <span className="text-xs font-black text-[#CCFF00] font-mono">{pool.stakeAmount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#C7BEEA]/60 block uppercase">total pot</span>
                  <span className="text-xs font-black text-[#FF2E93] font-mono">{pool.totalPot}</span>
                </div>
              </div>

              {/* Participants and Tap indicator */}
              <div className="flex items-center justify-between text-[11px] font-bold text-[#C7BEEA]/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <span>👥 {pool.participants.length} runners</span>
                  {pool.participants.some(p => p.suspiciousPattern && !p.isDisputed) && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/40">
                      bounty available 🕵️
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#CCFF00] group-hover:translate-x-0.5 transition-transform">
                  details ↗
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE POOL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#110F0B] border-2 border-[#362A5E] rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white lowercase">create new pool</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/60 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">pool title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#201B14] border border-white/10 text-white text-xs font-bold focus:border-[#CCFF00] outline-none"
                  placeholder="e.g. Morning 5K Sprints"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">goal (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={goalKm}
                    onChange={e => setGoalKm(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#201B14] border border-white/10 text-white text-xs font-mono font-bold focus:border-[#CCFF00] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">stake (MON)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stakeMON}
                    onChange={e => setStakeMON(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#201B14] border border-white/10 text-white text-xs font-mono font-bold focus:border-[#CCFF00] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">
                  activity window (days)
                </label>
                <select
                  value={durationDays}
                  onChange={e => setDurationDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#201B14] border border-white/10 text-white text-xs font-bold focus:border-[#CCFF00] outline-none lowercase"
                >
                  <option value="1">1 day sprint</option>
                  <option value="3">3 days weekend challenge</option>
                  <option value="7">7 days full week</option>
                </select>
              </div>

              <StrideButton variant="neon" size="lg" fullWidth type="submit" className="mt-2">
                create & deposit stake ↗
              </StrideButton>
            </form>
          </div>
        </div>
      )}

      {/* JOIN POOL MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#110F0B] border-2 border-[#362A5E] rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white lowercase">join via code / link</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-white/60 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">
                  invite code or shared link
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={e => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinError("");
                  }}
                  className="w-full p-3 rounded-xl bg-[#201B14] border border-white/10 text-white text-sm font-mono font-black uppercase tracking-wider focus:border-[#CCFF00] outline-none"
                  placeholder="e.g. MON5K or CLIMB10"
                  required
                />
                {joinError && <p className="text-[11px] text-rose-400 mt-1">{joinError}</p>}
              </div>

              <p className="text-[11px] text-[#C7BEEA]/60">
                Joining will deposit the required stake amount into the pool pot.
              </p>

              <StrideButton variant="neon" size="lg" fullWidth type="submit" className="mt-2">
                join pool & stake 🏃
              </StrideButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
