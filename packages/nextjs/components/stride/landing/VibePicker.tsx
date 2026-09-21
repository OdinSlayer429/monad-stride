import React, { useState } from "react";
import { StrideButton } from "../StrideButton";
import { Reveal } from "./Reveal";

type Vibe = "solo" | "friends" | "watchdog";

const VIBES: { id: Vibe; emoji: string; label: string; pitch: string; cta: string }[] = [
  {
    id: "solo",
    emoji: "🏃",
    label: "Just track a run",
    pitch: "No stakes, no friends required. Free GPS tracking, whenever you want it.",
    cta: "start a solo run",
  },
  {
    id: "friends",
    emoji: "👥",
    label: "Stake with friends",
    pitch: "Create a pool, share the code, put some MON where your mouth is.",
    cta: "create a pool",
  },
  {
    id: "watchdog",
    emoji: "🕵️",
    label: "Catch a cheater",
    pitch: "Spot a run that doesn't add up? Flag it and split their forfeited stake.",
    cta: "browse open pools",
  },
];

export const VibePicker: React.FC<{ onLaunchApp: () => void }> = ({ onLaunchApp }) => {
  const [selected, setSelected] = useState<Vibe>("friends");
  const active = VIBES.find(v => v.id === selected)!;

  return (
    <section id="pools" className="relative px-5 py-24 sm:py-32">
      <div className="max-w-2xl mx-auto text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">What&apos;s your move?</h2>
          <p className="text-[#C7BEEA]/70 mb-10">pick one, we&apos;ll take you straight there.</p>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 mb-8">
            {VIBES.map((v, i) => (
              <React.Fragment key={v.id}>
                {i > 0 && <span className="hidden sm:block text-[#C7BEEA]/30 mx-4 text-xl">/</span>}
                <button
                  onClick={() => setSelected(v.id)}
                  className={`relative flex items-center gap-2 py-2 transition-all ${
                    selected === v.id ? "text-[#CCFF00] scale-105" : "text-[#C7BEEA]/50 hover:text-[#C7BEEA]/80"
                  }`}
                >
                  <span
                    key={selected === v.id ? "active" : "idle"}
                    className={`text-xl ${selected === v.id ? "vc-vibe-bounce" : ""}`}
                  >
                    {v.emoji}
                  </span>
                  <span className="font-display text-sm sm:text-base font-black">{v.label}</span>
                  <span
                    className="absolute left-0 -bottom-0.5 h-0.5 bg-[#CCFF00] rounded-full origin-left transition-transform duration-300 ease-out"
                    style={{ width: "100%", transform: selected === v.id ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </button>
              </React.Fragment>
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={150}>
          <p key={active.id} className="vc-fade-swap text-sm text-[#C7BEEA]/80 mb-6 min-h-[2.5rem]">
            {active.pitch}
          </p>
          <StrideButton
            key={`${active.id}-cta`}
            variant="neon"
            size="lg"
            onClick={onLaunchApp}
            className="vc-fade-swap"
          >
            {active.cta} ↗
          </StrideButton>
        </Reveal>
      </div>
    </section>
  );
};
