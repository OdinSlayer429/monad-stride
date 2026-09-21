import React, { useState } from "react";
import { StatusPill } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { parseEther, parseEventLogs } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { setPoolTitle } from "~~/services/stride/poolMeta";
import { Pool, PoolStatus } from "~~/types/stride";
import { notification } from "~~/utils/scaffold-eth";

const CHAIN_ID = 10143;
const STRIDE_ABI = deployedContracts[CHAIN_ID].Stride.abi;
const ONE_DAY_SECONDS = 24 * 3600;
const DISPUTE_WINDOW_SECONDS = 3600; // matches contract's MIN_DISPUTE_WINDOW floor exactly

interface PoolsTabProps {
  pools: Pool[];
  isLoading: boolean;
  onSelectPool: (pool: Pool) => void;
  onPoolsChanged: () => void;
}

export const PoolsTab: React.FC<PoolsTabProps> = ({ pools, isLoading, onSelectPool, onPoolsChanged }) => {
  const [filter, setFilter] = useState<PoolStatus | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [joining, setJoining] = useState<boolean>(false);

  const { isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Stride" });

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      notification.error("Connect a wallet first.");
      return;
    }

    setCreating(true);
    try {
      const goalMeters = BigInt(Math.round((parseFloat(goalKm) || 5) * 1000));
      const stakeWei = parseEther(String(parseFloat(stakeMON) || 0.5));
      const days = parseInt(durationDays) || 3;
      const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
      const joinDeadline = nowSeconds + BigInt(ONE_DAY_SECONDS);
      const activityDeadline = joinDeadline + BigInt(days * ONE_DAY_SECONDS);
      const disputeWindow = BigInt(DISPUTE_WINDOW_SECONDS);

      const hash = await writeContractAsync({
        functionName: "createPool",
        args: [goalMeters, stakeWei, joinDeadline, activityDeadline, disputeWindow],
      });

      if (hash && publicClient) {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        const [created] = parseEventLogs({ abi: STRIDE_ABI, eventName: "PoolCreated", logs: receipt.logs });
        const poolId = created?.args?.poolId;
        if (poolId !== undefined) {
          setPoolTitle(poolId.toString(), title.trim() || `pool #${poolId.toString()}`);
        }
      }

      notification.success("Pool created onchain — stake it out!");
      setShowCreateModal(false);
      onPoolsChanged();
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const poolIdStr = joinCodeInput.trim();
    const pool = pools.find(p => p.id === poolIdStr);
    if (!pool) {
      setJoinError("Pool ID not found. Ask the creator for their pool ID.");
      return;
    }
    if (!isConnected) {
      notification.error("Connect a wallet first.");
      return;
    }

    setJoining(true);
    try {
      await writeContractAsync({
        functionName: "joinPool",
        args: [BigInt(poolIdStr)],
        value: pool.stakeAmountWei ?? parseEther(pool.stakeAmount.split(" ")[0]),
      });

      notification.success("Joined pool — stake deposited onchain!");
      setShowJoinModal(false);
      setJoinCodeInput("");
      setJoinError("");
      onPoolsChanged();
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    } finally {
      setJoining(false);
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
        {(["all", "open", "active", "awaiting_results", "resolved"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
              filter === f
                ? "bg-[#CCFF00] text-black shadow-[0_2px_8px_rgba(204,255,0,0.3)]"
                : "text-[#C7BEEA]/60 hover:text-white"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Pools List */}
      {isLoading && pools.length === 0 && (
        <div className="glass-card p-6 text-center text-xs text-[#C7BEEA]/60 font-bold">
          reading pools from the Stride contract...
        </div>
      )}

      {!isLoading && filteredPools.length === 0 && (
        <div className="glass-card p-6 text-center text-xs text-[#C7BEEA]/60 font-bold">
          no pools yet — create one to get friends staking.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filteredPools.map(pool => {
          const hasHitGoal = pool.participants.some(p => p.name === "You" && p.status === "hit_goal");

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
                    Created by {pool.creatorName} · Pool ID: <span className="font-mono text-white">{pool.id}</span>
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
                <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">
                  pool title (local label only, not stored onchain)
                </label>
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
                  activity window (days, after a 24h join period)
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

              <StrideButton variant="neon" size="lg" fullWidth type="submit" className="mt-2" disabled={creating}>
                {creating ? "confirm in wallet..." : "create & deposit stake ↗"}
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
              <h3 className="text-xl font-black text-white lowercase">join by pool id</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-white/60 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-[#C7BEEA]/80 block lowercase mb-1">pool id</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={joinCodeInput}
                  onChange={e => {
                    setJoinCodeInput(e.target.value.replace(/[^0-9]/g, ""));
                    setJoinError("");
                  }}
                  className="w-full p-3 rounded-xl bg-[#201B14] border border-white/10 text-white text-sm font-mono font-black tracking-wider focus:border-[#CCFF00] outline-none"
                  placeholder="e.g. 0, 1, 2..."
                  required
                />
                {joinError && <p className="text-[11px] text-rose-400 mt-1">{joinError}</p>}
              </div>

              <p className="text-[11px] text-[#C7BEEA]/60">
                Joining sends the pool&apos;s exact stake amount onchain, straight from your wallet.
              </p>

              <StrideButton variant="neon" size="lg" fullWidth type="submit" className="mt-2" disabled={joining}>
                {joining ? "confirm in wallet..." : "join pool & stake 🏃"}
              </StrideButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
