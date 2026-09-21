import React from "react";

interface FloatingDockProps {
  onLaunchApp: () => void;
}

/** Fixed floating capsule dock, pinned to the bottom of the viewport the whole scroll. */
export const FloatingDock: React.FC<FloatingDockProps> = ({ onLaunchApp }) => {
  return (
    <div className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div
        data-cursor="hover"
        className="vc-dock-bob pointer-events-auto flex items-center gap-3 sm:gap-5 pl-5 sm:pl-6 pr-2 py-2 rounded-full bg-[#1C1440]/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
      >
        <a
          href="#how-it-works"
          className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#C7BEEA]/80 hover:text-white lowercase transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] beacon-pulse" />
          how it works
        </a>

        <span className="hidden sm:block w-px h-4 bg-white/15" />

        <button
          onClick={onLaunchApp}
          className="glass-btn rounded-full px-5 sm:px-6 py-2.5 bg-[#CCFF00] text-[#150E2C] text-sm font-black lowercase"
        >
          start striding
        </button>

        <span className="hidden sm:block w-px h-4 bg-white/15" />

        <a
          href="#pools"
          className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#C7BEEA]/80 hover:text-white lowercase transition-colors pr-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF2E93] beacon-pulse" />
          pools
        </a>
      </div>
    </div>
  );
};
