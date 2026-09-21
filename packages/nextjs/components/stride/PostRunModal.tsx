import React, { useState } from "react";
import { StarburstBadge } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { Pool, UserRun } from "~~/types/stride";

interface PostRunModalProps {
  run: UserRun | null;
  pools: Pool[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitToPool: (run: UserRun, poolId: string) => void;
  onSaveSolo: (run: UserRun) => void;
}

export const PostRunModal: React.FC<PostRunModalProps> = ({
  run,
  pools,
  isOpen,
  onClose,
  onSubmitToPool,
  onSaveSolo,
}) => {
  const [selectedPoolId, setSelectedPoolId] = useState<string>(run?.poolId || "");
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !run) return null;

  const eligiblePools = pools.filter(p => p.status === "active" || p.status === "open");

  const handlePoolSubmit = () => {
    if (!selectedPoolId) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmitToPool(run, selectedPoolId);
    }, 800);
  };

  const handleShareCard = () => {
    setCopiedShare(true);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `🏃 Just crushed ${(run.distanceMeters / 1000).toFixed(2)} km in ${Math.floor(
          run.durationSeconds / 60,
        )} mins on Stride! Pace: ${run.avgPace} ⚡ Tracked on Monad testnet.`,
      );
    }
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm bg-[#100E0A] border-2 border-[#362A5E] rounded-3xl p-5 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] my-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏁</span>
            <h2 className="text-xl font-black text-white lowercase tracking-tight">run completed!</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* CRENCY SHAREABLE STORY CARD (Ready for Instagram / Group Chat) */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#191510] to-[#150E2C] border-2 border-[#CCFF00]/60 p-5 shadow-[0_8px_30px_rgba(204,255,0,0.15)] overflow-hidden">
          {/* Ambient neon corner glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#CCFF00]/25 rounded-full blur-2xl pointer-events-none" />

          {/* Top card bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white lowercase">⚡ stride</span>
              <span className="text-[10px] text-[#CCFF00] font-mono">monad</span>
            </div>
            <div className="scale-75 origin-right">
              <StarburstBadge text="CRUSHED" color="neon" size="sm" />
            </div>
          </div>

          {/* Route Mini-vector preview */}
          <div className="w-full h-24 my-2 flex items-center justify-center">
            <svg viewBox="0 0 200 80" className="w-full h-full">
              <path
                d="M 10 50 Q 50 10, 90 40 T 170 30 T 190 60"
                fill="none"
                stroke="#CCFF00"
                strokeWidth="5"
                strokeLinecap="round"
                filter="drop-shadow(0 0 6px rgba(204,255,0,0.8))"
              />
            </svg>
          </div>

          {/* Big Story Numbers */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#C7BEEA]/60 tracking-wider">distance covered</span>
            <div className="text-4xl font-black text-white tracking-tight leading-none mt-0.5">
              {(run.distanceMeters / 1000).toFixed(2)} <span className="text-lg font-bold text-[#CCFF00]">km</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center font-mono">
            <div>
              <span className="text-[9px] text-[#C7BEEA]/60 block uppercase">pace</span>
              <span className="text-xs font-black text-white">{run.avgPace}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#C7BEEA]/60 block uppercase">time</span>
              <span className="text-xs font-black text-white">
                {Math.floor(run.durationSeconds / 60)}:{(run.durationSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-[#C7BEEA]/60 block uppercase">cadence</span>
              <span className="text-xs font-black text-white">{run.avgCadence} spm</span>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShareCard}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-black text-white lowercase flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>📸 {copiedShare ? "copied story link! 📋" : "share card to group chat"}</span>
        </button>

        {/* POOL SUBMISSION SELECTOR */}
        {eligiblePools.length > 0 && (
          <div className="glass-card p-3.5 flex flex-col gap-2.5">
            <div>
              <span className="text-xs font-black text-white lowercase">submit to staking pool</span>
              <p className="text-[11px] text-[#C7BEEA]/60">
                Commit your signed GPS checkpoint chain to claim your stake.
              </p>
            </div>

            <select
              value={selectedPoolId}
              onChange={e => setSelectedPoolId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#201B14] border border-white/10 text-white text-xs font-bold focus:border-[#CCFF00] outline-none lowercase"
            >
              <option value="">-- select a pool --</option>
              {eligiblePools.map(pool => (
                <option key={pool.id} value={pool.id}>
                  {pool.title} (Goal: {(pool.goalDistanceMeters / 1000).toFixed(1)} km)
                </option>
              ))}
            </select>

            {selectedPoolId && (
              <StrideButton variant="neon" size="md" fullWidth disabled={submitting} onClick={handlePoolSubmit}>
                {submitting ? "signing & submitting..." : "submit to pool ↗"}
              </StrideButton>
            )}
          </div>
        )}

        {/* Solo Save Action */}
        <StrideButton variant="outline" size="md" fullWidth onClick={() => onSaveSolo(run)}>
          save run & finish 💾
        </StrideButton>
      </div>
    </div>
  );
};
