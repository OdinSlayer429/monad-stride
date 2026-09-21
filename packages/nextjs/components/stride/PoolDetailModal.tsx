import React, { useState } from "react";
import { StarburstBadge, StatusPill } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { Participant, Pool } from "~~/types/stride";

interface PoolDetailModalProps {
  pool: Pool | null;
  isOpen: boolean;
  onClose: () => void;
  onDispute: (poolId: string, suspectAddress: string) => void;
  onViewResults: (pool: Pool) => void;
  onTrackForThisPool: (pool: Pool) => void;
}

export const PoolDetailModal: React.FC<PoolDetailModalProps> = ({
  pool,
  isOpen,
  onClose,
  onDispute,
  onViewResults,
  onTrackForThisPool,
}) => {
  const [inspectingSuspect, setInspectingSuspect] = useState<Participant | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [disputing, setDisputing] = useState<boolean>(false);

  if (!isOpen || !pool) return null;

  const handleCopyInvite = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pool.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleConfirmDispute = () => {
    if (!inspectingSuspect) return;
    setDisputing(true);
    setTimeout(() => {
      setDisputing(false);
      onDispute(pool.id, inspectingSuspect.address);
      setInspectingSuspect(null);
    }, 700);
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

        {/* Invite Code Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#C7BEEA]/60 font-bold lowercase">invite code:</span>
            <span className="text-xs font-mono font-black text-[#CCFF00] tracking-wider">{pool.inviteCode}</span>
          </div>
          <button
            onClick={handleCopyInvite}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white lowercase"
          >
            {copiedCode ? "copied! ✓" : "copy link 📋"}
          </button>
        </div>

        {/* Action Button: Run for this pool or view results */}
        {pool.status === "resolved" ? (
          <StrideButton variant="pink" size="md" fullWidth onClick={() => onViewResults(pool)}>
            🎉 view winners & results ↗
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
              const isSuspect = p.suspiciousPattern && !p.isDisputed;
              const isSlashed = p.status === "slashed";

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                    isSlashed
                      ? "bg-rose-950/20 border-rose-500/30 opacity-60"
                      : isSuspect
                        ? "bg-amber-950/20 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                        : "bg-[#14100C] border-white/5"
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
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#C7BEEA]/60 text-[10px] font-bold">
                          in progress 🏃
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Playful "Spot the fake" Dispute Affordance with Bounty */}
                  {isSuspect && (
                    <div className="pt-1.5 border-t border-amber-400/20 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                        <span>🕵️</span>
                        <span>suspicious run detected</span>
                      </div>
                      <button
                        onClick={() => setInspectingSuspect(p)}
                        className="px-2.5 py-1 rounded-xl bg-amber-400 text-black font-black text-[11px] lowercase tracking-tight shadow-[0_2px_0_#000] active:translate-y-0.5"
                      >
                        spot the fake (+{p.suspiciousPattern?.bountyMON}) 🔎
                      </button>
                    </div>
                  )}

                  {p.disputeReason && <p className="text-[10px] text-rose-300 font-mono">⚠️ {p.disputeReason}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ANTI-CHEAT INSPECTOR MODAL */}
        {inspectingSuspect && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-xs bg-[#16130F] border-2 border-amber-400 rounded-3xl p-5 flex flex-col gap-3 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm lowercase">
                  <span>🕵️</span> spot the fake!
                </div>
                <button onClick={() => setInspectingSuspect(null)} className="text-white/60 hover:text-white text-xs">
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-amber-400/30 flex flex-col gap-2">
                <div className="text-xs font-bold text-white lowercase">runner: {inspectingSuspect.name}</div>
                <div className="text-[11px] text-amber-200 font-mono">
                  Violation: {inspectingSuspect.suspiciousPattern?.type}
                </div>
                <p className="text-[11px] text-[#C7BEEA]/80 leading-snug">
                  {inspectingSuspect.suspiciousPattern?.details}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-center">
                <span className="text-[10px] uppercase font-bold text-[#CCFF00] block">dispute watchdog bounty</span>
                <span className="text-xl font-black text-[#CCFF00] font-mono">
                  +{inspectingSuspect.suspiciousPattern?.bountyMON}
                </span>
              </div>

              <StrideButton variant="neon" size="md" fullWidth disabled={disputing} onClick={handleConfirmDispute}>
                {disputing ? "verifying onchain..." : "confirm dispute & claim bounty ⚡"}
              </StrideButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
