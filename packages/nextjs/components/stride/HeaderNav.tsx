import React from "react";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

interface HeaderNavProps {
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ isDemoMode, onToggleDemoMode }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#150E2C]/90 backdrop-blur-md border-b border-[#1E1A14] px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* App Branding */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#CCFF00] border-2 border-black flex items-center justify-center font-black text-black text-lg shadow-[0_2px_0_#000]">
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-white lowercase leading-none flex items-center gap-1">
              stride
              <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]" />
            </span>
            <span className="text-[10px] font-bold text-[#C7BEEA]/60 tracking-tight lowercase">monad testnet</span>
          </div>
        </div>

        {/* Action Controls & Wallet */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Mode Badge Toggle */}
          <button
            onClick={onToggleDemoMode}
            title={isDemoMode ? "In Quick Demo Mode (Click to use Web3 Wallet)" : "In Web3 Mode (Click for Demo Mode)"}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black tracking-tight border transition-all ${
              isDemoMode
                ? "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/50 shadow-[0_0_12px_rgba(204,255,0,0.25)]"
                : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
            }`}
          >
            {isDemoMode ? "demo ⚡" : "web3 🔗"}
          </button>

          {/* RainbowKit Connect Button */}
          <div className="scale-90 origin-right">
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
