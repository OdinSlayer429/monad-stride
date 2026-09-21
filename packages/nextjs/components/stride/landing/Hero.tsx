import React from "react";
import { RouteMockup } from "./RouteMockup";

interface HeroProps {
  onLaunchApp: () => void;
}

/**
 * Big, stacked, oversized display type as the dominant graphic element — not a
 * modest headline, and no badge/sticker clutter around it. Just the type, the
 * subtext, and the CTA.
 */
export const Hero: React.FC<HeroProps> = ({ onLaunchApp }) => {
  return (
    <section id="top" className="relative pt-40 pb-24 px-5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-[#CCFF00]/10 rounded-full blur-[140px] pointer-events-none animate-[mesh-drift_10s_ease-in-out_infinite_alternate]" />
      <div className="absolute bottom-0 right-[10%] w-[26rem] h-[26rem] bg-[#FF2E93]/10 rounded-full blur-[120px] pointer-events-none animate-[mesh-drift_13s_ease-in-out_infinite_alternate-reverse]" />

      <div className="hidden lg:block absolute top-28 right-10 xl:right-20 w-52 xl:w-60 aspect-[220/380] pointer-events-none rotate-[6deg] drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <RouteMockup />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <h1
          data-cursor="hover"
          className="vc-hero-line font-display font-black text-[#E8E4FB] uppercase leading-[0.82] tracking-tight select-none"
          style={{ fontSize: "clamp(3rem, 12vw, 8.5rem)", animationDelay: "0s" }}
        >
          stake
        </h1>
        <h1
          className="vc-hero-line font-display font-black text-[#E8E4FB] uppercase leading-[0.82] tracking-tight select-none"
          style={{ fontSize: "clamp(3rem, 12vw, 8.5rem)", animationDelay: "0.1s" }}
        >
          with
        </h1>
        <h1
          className="vc-hero-line font-display font-black text-[#CCFF00] uppercase leading-[0.82] tracking-tight select-none"
          style={{ fontSize: "clamp(3rem, 12vw, 8.5rem)", animationDelay: "0.2s" }}
        >
          friends.
        </h1>

        <p
          className="vc-hero-line mt-8 text-base sm:text-lg text-[#C7BEEA]/80 font-medium max-w-md"
          style={{ animationDelay: "0.32s" }}
        >
          Strava meets a friendly bet with your group chat — backed by proof that survives someone actually trying to
          cheat it, not just an honor system.
        </p>

        <div className="vc-hero-line mt-8" style={{ animationDelay: "0.42s" }}>
          <button
            data-cursor="hover"
            onClick={onLaunchApp}
            className="vc-pulse-ring glass-btn rounded-2xl px-8 py-4 bg-[#CCFF00] text-[#150E2C] text-base font-black lowercase"
          >
            start striding ⚡ ↗
          </button>
        </div>
      </div>
    </section>
  );
};
