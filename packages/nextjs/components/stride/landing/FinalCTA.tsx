import React from "react";
import { StrideButton } from "../StrideButton";
import { Reveal } from "./Reveal";

export const FinalCTA: React.FC<{ onLaunchApp: () => void }> = ({ onLaunchApp }) => {
  return (
    <section className="relative px-5 py-24 sm:py-32 overflow-hidden">
      <div className="absolute top-0 left-[15%] w-[24rem] h-[24rem] bg-[#CCFF00]/10 rounded-full blur-[110px] pointer-events-none animate-[mesh-drift_11s_ease-in-out_infinite_alternate]" />
      <div className="absolute bottom-0 right-[15%] w-[22rem] h-[22rem] bg-[#FF2E93]/10 rounded-full blur-[110px] pointer-events-none animate-[mesh-drift_9s_ease-in-out_infinite_alternate-reverse]" />
      <Reveal>
        <div className="relative max-w-3xl mx-auto flex flex-col items-center text-center gap-6">
          <h2 className="font-display text-4xl sm:text-6xl font-black text-white tracking-tight leading-[0.95]">
            Your next run
            <br />
            <span className="text-[#CCFF00]">could be worth something.</span>
          </h2>
          <p className="text-[#C7BEEA]/70 max-w-md">
            Grab your group chat, pick a distance, and put a real stake on showing up.
          </p>
          <div className="flex items-center gap-3">
            <StrideButton variant="neon" size="xl" onClick={onLaunchApp} className="vc-pulse-ring">
              start striding ⚡
            </StrideButton>
            <button
              data-cursor="hover"
              data-cursor-text="go"
              onClick={onLaunchApp}
              aria-label="start striding"
              className="vc-nudge glass-btn shrink-0 w-16 h-16 rounded-full bg-[#1C1440] border-2 border-[#150E2C] text-[#CCFF00] text-2xl flex items-center justify-center"
            >
              ↗
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
