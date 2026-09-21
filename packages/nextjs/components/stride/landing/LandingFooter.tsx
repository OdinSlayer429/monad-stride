import React from "react";

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative border-t border-white/5 px-5 py-10">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#C7BEEA]/50">
        <div className="flex items-center gap-1.5 font-black text-white lowercase">
          stride
          <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] beacon-pulse" />
        </div>
        <span>Stake with friends, prove it with your phone</span>
        <span className="font-mono">monad testnet (10143)</span>
      </div>
    </footer>
  );
};
