import React, { useEffect, useRef, useState } from "react";
import { StarburstBadge } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { pinCheckpoints } from "~~/services/stride/ipfs";
import { PoolLink, UserRun } from "~~/types/stride";
import { notification } from "~~/utils/scaffold-eth";

// Mirrors Stride.sol's MIN_CHECKPOINT_COUNT — submitActivity reverts with
// InsufficientCheckpointDensity below this, and checkpoints only form every 10s of
// active foreground tracking, so a run needs ~10s+ elapsed before it's submittable.
const MIN_CHECKPOINT_COUNT = 2;

interface PostRunModalProps {
  run: UserRun | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (run: UserRun) => void;
  onSaveSolo: (run: UserRun) => void;
  onPoolsChanged: () => void;
}

export const PostRunModal: React.FC<PostRunModalProps> = ({
  run,
  isOpen,
  onClose,
  onSubmitted,
  onSaveSolo,
  onPoolsChanged,
}) => {
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState<boolean>(false);
  const notifiedDoneRef = useRef(false);

  const { isConnected, address: connectedAddress } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Stride" });

  // Reset per-run submission tracking whenever a genuinely new run comes in.
  useEffect(() => {
    setSubmittedIds(new Set());
    notifiedDoneRef.current = false;
  }, [run?.id]);

  // Once every linked pool has a confirmed submission, hand the finished run back up
  // exactly once — has to be an effect, not a render-time call, since onSubmitted
  // triggers parent state updates (saving to local history, switching tabs).
  useEffect(() => {
    if (!run || notifiedDoneRef.current) return;
    const allSubmitted = run.poolLinks.length > 0 && run.poolLinks.every(l => submittedIds.has(l.poolId));
    if (!allSubmitted) return;
    notifiedDoneRef.current = true;
    onSubmitted({
      ...run,
      poolLinks: run.poolLinks.map(l => ({ ...l, submitted: true })),
      submittedToPool: true,
    });
  }, [run, submittedIds, onSubmitted]);

  if (!isOpen || !run) return null;

  // Every pool this run was linked to (see TrackTab — all pools the runner had
  // joined at start, no picking) gets its own real submitActivity call, since each
  // has its own independently signed checkpoint chain and its own submission record.
  const handleSubmitOne = async (link: PoolLink) => {
    if (!isConnected) {
      notification.error("Connect a wallet first.");
      return;
    }
    const lastCheckpoint = link.checkpoints[link.checkpoints.length - 1];
    if (!lastCheckpoint?.digest || link.checkpoints.length === 0) {
      notification.error(`No signed checkpoints for ${link.poolTitle} — nothing to submit.`);
      return;
    }
    if (link.checkpoints.length < MIN_CHECKPOINT_COUNT) {
      notification.error(
        `${link.poolTitle} only recorded ${link.checkpoints.length} checkpoint — the chain requires at least ${MIN_CHECKPOINT_COUNT} (one every 10s of active tracking), so this would just revert onchain. Track for at least 10-15s longer next time.`,
      );
      return;
    }

    setSubmittingId(link.poolId);
    try {
      // Best-effort — a dispute checks the onchain commitHash/signatures below, never
      // ipfsCID, so a failed/unconfigured pin (e.g. no Pinata key set up yet) falls
      // back to an empty CID rather than blocking the real submission.
      const cid = await pinCheckpoints(link.poolId, connectedAddress ?? lastCheckpoint.runner, link.checkpoints);
      if (!cid) {
        notification.info(`IPFS pinning isn't set up yet — submitting ${link.poolTitle} without a CID.`);
      }

      const hash = await writeContractAsync({
        functionName: "submitActivity",
        args: [
          BigInt(link.poolId),
          lastCheckpoint.digest as `0x${string}`,
          BigInt(Math.round(run.distanceMeters)),
          BigInt(Math.round(run.durationSeconds)),
          link.checkpoints.length,
          cid ?? "",
        ],
      });
      // writeContractAsync can resolve to undefined without throwing (wrong network,
      // contract briefly not resolved yet, wallet not connected) — useScaffoldWriteContract
      // already shows its own error notification for those cases, but doesn't throw, so
      // this check is required or a real failure silently gets reported as a success.
      if (!hash) return;

      notification.success(`Submitted to ${link.poolTitle} — claimable if you hit the goal!`);
      setSubmittedIds(prev => new Set(prev).add(link.poolId));
      onPoolsChanged();
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSubmitAll = async () => {
    setSubmittingAll(true);
    for (const link of run.poolLinks) {
      if (submittedIds.has(link.poolId)) continue;
      await handleSubmitOne(link);
    }
    setSubmittingAll(false);
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

        {/* POOL SUBMISSION — one real submitActivity per pool this run was linked to */}
        {run.poolLinks.length > 0 && (
          <div className="glass-card p-3.5 flex flex-col gap-2.5">
            <div>
              <span className="text-xs font-black text-white lowercase">
                submit to {run.poolLinks.length} pool{run.poolLinks.length > 1 ? "s" : ""}
              </span>
              <p className="text-[11px] text-[#C7BEEA]/60">
                Commits your signed GPS checkpoint chain onchain, once per pool — claimable if you hit each goal.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {run.poolLinks.map(link => {
                const done = submittedIds.has(link.poolId);
                const busy = submittingId === link.poolId;
                const tooShort = link.checkpoints.length < MIN_CHECKPOINT_COUNT;
                return (
                  <div
                    key={link.poolId}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-black/30 border border-white/5"
                  >
                    <span className="text-[11px] font-bold text-white lowercase">{link.poolTitle}</span>
                    {done ? (
                      <span className="text-[10px] font-bold text-[#CCFF00]">submitted ✓</span>
                    ) : tooShort ? (
                      <span
                        className="text-[10px] font-bold text-[#FF2E93]"
                        title="Track for at least 10-15s longer next time — checkpoints form every 10s."
                      >
                        too short ({link.checkpoints.length}/{MIN_CHECKPOINT_COUNT})
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSubmitOne(link)}
                        disabled={busy || submittingAll}
                        className="text-[10px] font-bold text-[#CCFF00] hover:underline disabled:opacity-50"
                      >
                        {busy ? "confirm in wallet..." : "submit ↗"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <StrideButton variant="neon" size="md" fullWidth disabled={submittingAll} onClick={handleSubmitAll}>
              {submittingAll ? "confirm in wallet..." : `submit to all ${run.poolLinks.length} ↗`}
            </StrideButton>
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
