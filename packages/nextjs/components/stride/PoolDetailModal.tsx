import React, { useState } from "react";
import { StarburstBadge, StatusPill } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { VIOLATION_TYPE_INDEX, ViolatingPair, findViolatingPair } from "~~/services/stride/disputeCheck";
import { fetchCheckpoints } from "~~/services/stride/ipfs";
import { Participant, Pool } from "~~/types/stride";
import { notification } from "~~/utils/scaffold-eth";

interface PoolDetailModalProps {
  pool: Pool | null;
  isOpen: boolean;
  onClose: () => void;
  onViewResults: (pool: Pool) => void;
  onTrackForThisPool: (pool: Pool) => void;
  onPoolsChanged: () => void;
}

type InspectStatus = "loading" | "no-data" | "no-violation" | "found";

export const PoolDetailModal: React.FC<PoolDetailModalProps> = ({
  pool,
  isOpen,
  onClose,
  onViewResults,
  onTrackForThisPool,
  onPoolsChanged,
}) => {
  const [inspecting, setInspecting] = useState<Participant | null>(null);
  const [inspectStatus, setInspectStatus] = useState<InspectStatus>("loading");
  const [violation, setViolation] = useState<ViolatingPair | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [disputing, setDisputing] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);

  const { address: connectedAddress } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Stride" });

  if (!isOpen || !pool) return null;

  const handleCopyInvite = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pool.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Permissionless — anyone can call finalize() once the dispute window has passed.
  // It only computes who's owed what (claimable balances); withdraw() is separate.
  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const hash = await writeContractAsync({
        functionName: "finalize",
        args: [BigInt(pool.id)],
      });
      if (!hash) return;
      notification.success("Pool finalized onchain — winnings are now claimable.");
      onPoolsChanged();
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    } finally {
      setFinalizing(false);
    }
  };

  // Fetches this participant's real signed checkpoint chain from IPFS (the trimmed
  // public copy — see services/stride/ipfs.ts) and runs the exact same violation
  // checks the contract itself would run, client-side, so we only ever offer to
  // dispute something that's actually guaranteed to pass onchain.
  const handleInspect = async (p: Participant) => {
    setInspecting(p);
    setInspectStatus("loading");
    setViolation(null);

    const cid = p.submission?.ipfsCID;
    const checkpoints = cid ? await fetchCheckpoints(cid) : null;
    if (!checkpoints || checkpoints.length < 2) {
      setInspectStatus("no-data");
      return;
    }

    const found = findViolatingPair(checkpoints);
    if (found) {
      setViolation(found);
      setInspectStatus("found");
    } else {
      setInspectStatus("no-violation");
    }
  };

  const handleConfirmDispute = async () => {
    if (!inspecting || !violation) return;
    setDisputing(true);
    try {
      const { a, b, violationType } = violation;
      const hash = await writeContractAsync({
        functionName: "dispute",
        args: [
          BigInt(pool.id),
          inspecting.address as `0x${string}`,
          {
            poolId: BigInt(a.poolId),
            runner: a.runner as `0x${string}`,
            index: a.index,
            timestamp: BigInt(a.timestamp),
            lat: a.lat,
            lng: a.lng,
            cadenceSpm: a.cadenceSpm,
            prevHash: a.prevHash as `0x${string}`,
          },
          a.signature as `0x${string}`,
          {
            poolId: BigInt(b.poolId),
            runner: b.runner as `0x${string}`,
            index: b.index,
            timestamp: BigInt(b.timestamp),
            lat: b.lat,
            lng: b.lng,
            cadenceSpm: b.cadenceSpm,
            prevHash: b.prevHash as `0x${string}`,
          },
          b.signature as `0x${string}`,
          VIOLATION_TYPE_INDEX[violationType],
        ],
        value: parseEther("0.01"),
      });
      if (!hash) return;
      notification.success("Dispute confirmed onchain — cheater slashed, bounty is now claimable!");
      onPoolsChanged();
      setInspecting(null);
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    } finally {
      setDisputing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm bg-[#100E0A] border-2 border-[#362A5E] rounded-3xl p-5 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] my-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white lowercase tracking-tight">{pool.title}</h2>
            <span className="text-xs text-[#C7BEEA]/60 font-medium">
              Goal: {(pool.goalDistanceMeters / 1000).toFixed(1)} km · Stake: {pool.stakeAmount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Big Pot Banner with Starburst */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#1C1813] to-[#0C0A07] border-2 border-[#CCFF00]/50 p-4 flex items-center justify-between shadow-[0_8px_24px_rgba(204,255,0,0.12)]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#C7BEEA]/70 tracking-wider">total prize pot</span>
            <span className="text-3xl font-black text-white font-mono tracking-tight leading-none mt-1">
              {pool.totalPot}
            </span>
            <span className="text-[11px] text-[#CCFF00] font-bold mt-1 lowercase">
              {pool.status === "resolved" ? "pool finalized" : "split among goal finishers"}
            </span>
          </div>

          <StarburstBadge text="POT" subtext="MON" color="neon" size="md" />
        </div>

        {/* Pool ID Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#C7BEEA]/60 font-bold lowercase">pool id:</span>
            <span className="text-xs font-mono font-black text-[#CCFF00] tracking-wider">{pool.inviteCode}</span>
          </div>
          <button
            onClick={handleCopyInvite}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white lowercase"
          >
            {copiedCode ? "copied! ✓" : "copy id 📋"}
          </button>
        </div>

        {/* Action Button: finalize, view results, or track a run */}
        {pool.status === "resolved" ? (
          <StrideButton variant="pink" size="md" fullWidth onClick={() => onViewResults(pool)}>
            🎉 view winners & results ↗
          </StrideButton>
        ) : pool.status === "awaiting_results" ? (
          <StrideButton variant="pink" size="md" fullWidth disabled={finalizing} onClick={handleFinalize}>
            {finalizing ? "confirm in wallet..." : "finalize pool ⚡"}
          </StrideButton>
        ) : (
          <StrideButton variant="neon" size="md" fullWidth onClick={() => onTrackForThisPool(pool)}>
            ⚡ track run for this pool ↗
          </StrideButton>
        )}

        {/* LIVE MINI-LEADERBOARD & PARTICIPANTS */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white lowercase tracking-tight">live participant standings</span>
            <span className="text-[11px] text-[#C7BEEA]/60 font-mono">{pool.participants.length} runners</span>
          </div>

          <div className="flex flex-col gap-2">
            {pool.participants.map((p, idx) => {
              const isSlashed = p.status === "slashed";
              const isSelf = !!connectedAddress && p.address.toLowerCase() === connectedAddress.toLowerCase();
              // Only worth inspecting once there's a real submission to check, while
              // the pool is still in its real dispute window (matches the contract's
              // own NotInDisputeWindow / CannotDisputeSelf checks) — otherwise a real
              // dispute() call would just revert.
              const canInspect = !!p.submission && !isSelf && !isSlashed && pool.status === "active";

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                    isSlashed ? "bg-rose-950/20 border-rose-500/30 opacity-60" : "bg-[#14100C] border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white lowercase">{p.name}</span>
                        <span className="text-[10px] text-[#C7BEEA]/60 font-mono">
                          {p.distanceMeters > 0
                            ? `${(p.distanceMeters / 1000).toFixed(2)} km in ${Math.floor(p.durationSeconds / 60)}m`
                            : "not started yet"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSlashed ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40">
                          slashed ❌
                        </span>
                      ) : p.status === "hit_goal" ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#CCFF00]/20 text-[#CCFF00] text-[10px] font-bold border border-[#CCFF00]/40">
                          hit goal 🏅
                        </span>
                      ) : p.status === "didnt_submit" ? (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#C7BEEA]/60 text-[10px] font-bold">
                          fell short
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#C7BEEA]/60 text-[10px] font-bold">
                          joined
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real dispute affordance — only shown once there's an actual
                      submission to check, not a fabricated "suspicious" flag */}
                  {canInspect && (
                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#C7BEEA]/70">
                        <span>🕵️</span>
                        <span>inspect their signed GPS chain</span>
                      </div>
                      <button
                        onClick={() => handleInspect(p)}
                        className="px-2.5 py-1 rounded-xl bg-amber-400 text-black font-black text-[11px] lowercase tracking-tight shadow-[0_2px_0_#000] active:translate-y-0.5"
                      >
                        inspect 🔎
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* REAL DISPUTE INSPECTOR — fetches the runner's actual signed chain from IPFS
            and runs the same checks the contract would, before ever offering to submit
            a real bonded dispute. */}
        {inspecting && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-xs bg-[#16130F] border-2 border-amber-400 rounded-3xl p-5 flex flex-col gap-3 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm lowercase">
                  <span>🕵️</span> inspecting {inspecting.name}
                </div>
                <button onClick={() => setInspecting(null)} className="text-white/60 hover:text-white text-xs">
                  ✕
                </button>
              </div>

              {inspectStatus === "loading" && (
                <p className="text-[11px] text-[#C7BEEA]/70 leading-snug">
                  Pulling their signed checkpoint chain from IPFS...
                </p>
              )}

              {inspectStatus === "no-data" && (
                <p className="text-[11px] text-[#C7BEEA]/70 leading-snug">
                  Couldn&apos;t fetch a checkpoint chain to inspect — either IPFS pinning isn&apos;t active yet, or
                  nothing&apos;s pinned for this submission.
                </p>
              )}

              {inspectStatus === "no-violation" && (
                <p className="text-[11px] text-[#C7BEEA]/70 leading-snug">
                  No violation found in the public portion of this chain. A dispute here would likely fail and forfeit
                  your bond — not recommended.
                </p>
              )}

              {inspectStatus === "found" && violation && (
                <>
                  <div className="p-3 rounded-2xl bg-black/40 border border-amber-400/30 flex flex-col gap-2">
                    <div className="text-[11px] text-amber-200 font-mono">Violation: {violation.violationType}</div>
                    <p className="text-[11px] text-[#C7BEEA]/80 leading-snug">{violation.details}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#CCFF00] block">
                      bond required · bounty on success
                    </span>
                    <span className="text-xl font-black text-[#CCFF00] font-mono">0.01 MON</span>
                  </div>

                  <StrideButton variant="neon" size="md" fullWidth disabled={disputing} onClick={handleConfirmDispute}>
                    {disputing ? "confirm in wallet..." : "confirm dispute ⚡"}
                  </StrideButton>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
