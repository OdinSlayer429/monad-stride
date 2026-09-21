import React from "react";

const CHECKPOINTS = [
  { x: 44, y: 318, delay: "0.4s" },
  { x: 64, y: 198, delay: "1.1s" },
  { x: 82, y: 92, delay: "1.8s" },
  { x: 158, y: 58, delay: "2.5s" },
];

/**
 * A phone-mockup visual showing a GPS route drawing itself in, checkpoints
 * popping on as they're "reached", and a live-tracking pill — the "photo"
 * element for the landing page. Not a real screenshot (no real runners yet
 * to photograph) but a stylized, on-brand equivalent that's honest about
 * being an illustration rather than passing off a stock photo as product UI.
 */
export const RouteMockup: React.FC = () => (
  <svg viewBox="0 0 220 380" className="w-full h-full" aria-hidden>
    <rect x="4" y="4" width="212" height="372" rx="32" fill="#0B061A" stroke="#362A5E" strokeWidth="3" />
    <rect x="18" y="34" width="184" height="312" rx="14" fill="#150E2C" />

    {/* faint grid backdrop */}
    <path
      d="M18 90H202M18 146H202M18 202H202M18 258H202M18 314H202"
      stroke="#C7BEEA"
      strokeOpacity="0.06"
      strokeWidth="1"
    />
    <path d="M64 34V346M110 34V346M156 34V346" stroke="#C7BEEA" strokeOpacity="0.06" strokeWidth="1" />

    {/* live pill */}
    <rect
      x="30"
      y="46"
      width="70"
      height="20"
      rx="10"
      fill="#CCFF00"
      fillOpacity="0.15"
      stroke="#CCFF00"
      strokeOpacity="0.4"
    />
    <circle cx="42" cy="56" r="3" fill="#CCFF00" className="beacon-pulse" />
    <text x="52" y="59.5" fontSize="9" fontWeight="800" fill="#CCFF00" fontFamily="monospace">
      LIVE
    </text>

    {/* the route, drawing itself in on a loop */}
    <path
      d="M44,318 C64,278 34,238 64,198 C94,158 54,118 82,92 C110,66 138,84 158,58"
      fill="none"
      stroke="#CCFF00"
      strokeWidth="3.5"
      strokeLinecap="round"
      className="vc-route-draw"
    />

    {CHECKPOINTS.map((c, i) => (
      <circle
        key={i}
        cx={c.x}
        cy={c.y}
        r="5"
        fill="#150E2C"
        stroke="#FF2E93"
        strokeWidth="2.5"
        className="vc-checkpoint-pop"
        style={{ animationDelay: c.delay }}
      />
    ))}

    <text x="30" y="330" fontSize="10" fontWeight="700" fill="#C7BEEA" fontFamily="monospace" opacity="0.7">
      4.1 km · 24:08
    </text>
  </svg>
);
