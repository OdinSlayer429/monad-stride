import React, { useState } from "react";
import { StarburstBadge } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { formatEther } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Pool } from "~~/types/stride";
import { notification } from "~~/utils/scaffold-eth";

interface ResultsModalProps {
  pool: Pool | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimed: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ pool, isOpen, onClose, onClaimed }) => {
  const [claiming, setClaiming] = useState<boolean>(false);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Stride" });

  if (!isOpen || !pool) return null;

  const winners = pool.participants.filter(p => p.status === "hit_goal");
  const losers = pool.participants.filter(p => p.status === "didnt_submit" || p.status === "slashed");
  const claimableWei = pool.claimableWei ?? 0n;
  const claimableDisplay = `${formatEther(claimableWei)} MON`;

  // Real pull-payment withdraw — finalize() (see PoolDetailModal) already computed
  // this address's claimable balance; this just pulls it to the connected wallet.
  const handleClaimWinnings = async () => {
    setClaiming(true);
    try {
      const hash = await writeContractAsync({
        functionName: "withdraw",
        args: [BigInt(pool.id)],
      });
      if (!hash) return;
      notification.success(`Withdrawn ${claimableDisplay} to your wallet!`);
      onClaimed();
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm bg-[#110F0B] border-2 border-[#CCFF00]/50 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(204,255,0,0.2)] my-6 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#CCFF00]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className="text-xl font-black text-white lowercase tracking-tight">pool resolved!</h2>
              <span className="text-[11px] text-[#C7BEEA]/60 font-medium">{pool.title}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Big Payout Showcase */}
        <div className="relative p-5 rounded-3xl bg-gradient-to-br from-[#1B1712] to-[#0A0806] border border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#C7BEEA]/70 tracking-wider">your winnings</span>
            <span className="text-4xl font-black text-[#CCFF00] font-mono tracking-tight leading-none mt-1">
              {claimableDisplay}
            </span>
            <span className="text-[11px] text-[#C7BEEA]/80 font-bold mt-1 lowercase">
              {claimableWei > 0n ? "available to withdraw to wallet" : "nothing claimable on this pool"}
            </span>
          </div>

          <StarburstBadge text="WIN" color="neon" size="md" />
        </div>

        {/* Winners and Forfeited Breakdown */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-black text-white lowercase tracking-tight">how the pot was split</span>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between font-bold text-[#CCFF00]">
              <span>🏅 Goal Finishers ({winners.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {winners.map((w, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-[#CCFF00]/15 text-[#CCFF00] text-[10px] font-bold"
                >
                  {w.name}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-rose-300">
              <span>💤 Forfeited Stakes ({losers.length}):</span>
            </div>
          </div>
        </div>

        {/* CLAIM BUTTON */}
        <div className="mt-2 flex flex-col gap-2">
          <StrideButton
            variant="neon"
            size="lg"
            fullWidth
            disabled={claiming || claimableWei === 0n}
            onClick={handleClaimWinnings}
          >
            {claiming ? "withdrawing from monad..." : `claim ${claimableDisplay} 💰`}
          </StrideButton>

          <p className="text-center text-[10px] text-[#C7BEEA]/60">
            Smart contract pull-payment: gasless withdrawal directly to your wallet.
          </p>
        </div>
      </div>
    </div>
  );
};
