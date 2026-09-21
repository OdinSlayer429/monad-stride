import React from "react";

const ROW_A = ["stake with friends", "gps proves it", "no admin keys", "settle onchain", "no honor system"];
const ROW_B = [
  "built for your group chat",
  "pull-payments only",
  "0 owner keys",
  "your money, your call",
  "sensors don't lie",
];

/** Two rows of an infinite horizontal ticker moving opposite directions, over a
 * slow-drifting topographic line background — echoes landonorris.com's marquee
 * band without copying its text or imagery. Pure CSS keyframes, no JS. */
export const MarqueeBand: React.FC = () => {
  return (
    <div className="relative overflow-hidden py-10 sm:py-14 border-y border-white/5">
      <svg className="vc-topo-bg" viewBox="0 0 800 400" fill="none" preserveAspectRatio="none" aria-hidden>
        <path
          d="M-50,120 C150,40 250,220 450,140 S750,60 850,160"
          stroke="#C7BEEA"
          strokeOpacity="0.08"
          strokeWidth="1.5"
        />
        <path
          d="M-50,240 C200,300 300,160 500,260 S780,320 850,240"
          stroke="#CCFF00"
          strokeOpacity="0.06"
          strokeWidth="1.5"
        />
        <path
          d="M-50,60 C180,140 320,10 520,90 S760,180 850,80"
          stroke="#FF2E93"
          strokeOpacity="0.05"
          strokeWidth="1.5"
        />
      </svg>

      <div className="relative flex flex-col gap-3">
        <div className="vc-marquee-track vc-marquee-a whitespace-nowrap">
          {[...ROW_A, ...ROW_A].map((t, i) => (
            <span key={i} className="font-display font-black text-2xl sm:text-4xl uppercase text-[#E8E4FB]/90 mx-6">
              {t} <span className="vc-marquee-dot text-[#CCFF00]">•</span>
            </span>
          ))}
        </div>
        <div className="vc-marquee-track vc-marquee-b whitespace-nowrap">
          {[...ROW_B, ...ROW_B].map((t, i) => (
            <span key={i} className="font-display font-black text-2xl sm:text-4xl uppercase text-[#C7BEEA]/50 mx-6">
              {t} <span className="vc-marquee-dot text-[#FF2E93]">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
