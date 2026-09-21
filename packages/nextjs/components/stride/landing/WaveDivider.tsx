import React from "react";

/** Organic wavy edge between two sections, flips based on `flip` for alternating
 * rhythm. The wave is drawn twice back-to-back on a double-width svg and slowly
 * translated so it reads as continuously flowing water rather than a static shape. */
export const WaveDivider: React.FC<{ fill: string; flip?: boolean }> = ({ fill, flip = false }) => (
  <div className={`relative w-full h-16 sm:h-24 overflow-hidden ${flip ? "-scale-y-100" : ""}`}>
    <svg
      viewBox="0 0 2880 120"
      preserveAspectRatio="none"
      className="vc-wave-flow absolute inset-0 h-full"
      style={{ width: "200%" }}
    >
      <path
        d="M0,64 C240,120 480,0 720,32 C960,64 1200,112 1440,48 L1440,120 L0,120 Z M1440,64 C1680,120 1920,0 2160,32 C2400,64 2640,112 2880,48 L2880,120 L1440,120 Z"
        fill={fill}
      />
    </svg>
  </div>
);
