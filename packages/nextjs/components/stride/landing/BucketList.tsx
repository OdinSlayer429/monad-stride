import React, { useState } from "react";
import { FloatingChips } from "./FloatingChips";
import { Reveal } from "./Reveal";

const ITEMS = ["No subscriptions", "No Strava paywall", "No GPS faking", "No excuses"];
const CONFETTI_COLORS = ["#CCFF00", "#FF2E93", "#C7BEEA", "#CCFF00", "#FF2E93", "#C7BEEA"];

/** A small waving mascot — a flat, original shape, not a copy of any reference
 * site's character. One arm loops through a gentle wave via CSS keyframes. */
const Mascot: React.FC = () => (
  <svg viewBox="0 0 120 120" className="vc-mascot-bob w-20 h-20 sm:w-24 sm:h-24 shrink-0" aria-hidden>
    <rect x="28" y="28" width="64" height="64" rx="20" fill="#CCFF00" stroke="#150E2C" strokeWidth="3" />
    <circle cx="48" cy="54" r="4.5" fill="#150E2C" />
    <circle cx="72" cy="54" r="4.5" fill="#150E2C" />
    <path d="M46 70 Q60 80 74 70" stroke="#150E2C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <g className="vc-mascot-arm" style={{ transformOrigin: "88px 58px" }}>
      <line x1="88" y1="58" x2="108" y2="42" stroke="#150E2C" strokeWidth="5" strokeLinecap="round" />
    </g>
    <line x1="34" y1="60" x2="18" y2="72" stroke="#150E2C" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

/** A one-shot burst of small dots flying outward — plays whenever `burstKey` changes. */
const ConfettiBurst: React.FC<{ burstKey: number }> = ({ burstKey }) => (
  <span key={burstKey} className="vc-confetti-wrap" aria-hidden>
    {CONFETTI_COLORS.map((color, d) => (
      <span
        key={d}
        className="vc-confetti-dot"
        style={{ "--angle": `${d * 60}deg`, background: color } as React.CSSProperties}
      />
    ))}
  </span>
);

/**
 * Decorative interactive checklist — a "bucket list" of things Stride isn't,
 * click to strike each one off. No persistence, no real semantics, purely
 * tactile — per confirmed scope, this is a motif, not a data-bound widget.
 */
export const BucketList: React.FC = () => {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [burstAt, setBurstAt] = useState<Record<number, number>>({});

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      const willCheck = !next.has(i);
      if (willCheck) {
        next.add(i);
        setBurstAt(b => ({ ...b, [i]: (b[i] || 0) + 1 }));
      } else {
        next.delete(i);
      }
      return next;
    });
  };

  return (
    <section className="relative px-5 py-24 sm:py-32 overflow-hidden">
      <FloatingChips
        chips={[
          { emoji: "✓", top: "8%", left: "6%", rotate: -12 },
          { emoji: "✓", top: "85%", left: "90%", rotate: 10 },
        ]}
      />
      <div className="relative max-w-md mx-auto">
        <Reveal>
          <div className="flex items-center gap-5 mb-10">
            <Mascot />
            <div>
              <span className="block text-xs font-bold text-[#CCFF00] lowercase tracking-wide mb-1">the vibe</span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                Why stride
              </h2>
            </div>
          </div>
        </Reveal>

        <ul className="flex flex-col gap-1">
          {ITEMS.map((item, i) => {
            const isChecked = checked.has(i);
            return (
              <Reveal key={item} delayMs={i * 80}>
                <li>
                  <button
                    data-cursor="hover"
                    data-cursor-text="tick"
                    onClick={() => toggle(i)}
                    className="w-full flex items-center gap-4 py-4 border-t border-white/10 text-left group"
                  >
                    <span className="relative shrink-0">
                      <span
                        className={`vc-check block ${isChecked ? "vc-check-on" : "vc-check-idle"}`}
                        style={{ borderColor: isChecked ? "#CCFF00" : "rgba(199,190,234,0.4)" }}
                      >
                        {isChecked && "✓"}
                      </span>
                      {!!burstAt[i] && <ConfettiBurst burstKey={burstAt[i]} />}
                    </span>
                    <span
                      className={`font-display text-lg sm:text-xl font-black tracking-tight transition-all ${
                        isChecked ? "text-[#C7BEEA]/40 line-through" : "text-white group-hover:text-[#CCFF00]"
                      }`}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
