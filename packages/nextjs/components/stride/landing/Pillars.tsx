import React from "react";
import { Reveal } from "./Reveal";

const PILLARS = [
  {
    emoji: "👥",
    title: "Stake with friends",
    body: "Create a pool, share a code, done. No token to buy, no app store — just your existing group and a shared goal.",
    accent: "#CCFF00",
  },
  {
    emoji: "🛰️",
    title: "Cheat-proof by design",
    body: "Every checkpoint is signed the instant it's captured and chained to the last one. Break the chain, teleport, or fake a step count, and it's provable on-chain.",
    accent: "#FF2E93",
  },
  {
    emoji: "🔓",
    title: "You control the money",
    body: "No admin key, no pause button, no team wallet. Funds move only when you call withdraw — the contract itself can't touch them any other way.",
    accent: "#CCFF00",
  },
];

export const Pillars: React.FC = () => {
  return (
    <section id="why-it-works" className="relative px-5 py-24 sm:py-32">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight text-center mb-4">
            Trust comes from the chain,
            <br />
            not the honor system
          </h2>
          <p className="text-center text-[#C7BEEA]/70 max-w-lg mx-auto mb-20">
            The staking mechanic isn&apos;t new. What no one else building this has actually shipped is proof that
            survives someone trying to cheat it.
          </p>
        </Reveal>

        <div className="flex flex-col">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delayMs={i * 120}>
              <div
                className={`relative flex items-start gap-5 sm:gap-8 py-10 ${i > 0 ? "border-t border-white/5" : ""}`}
              >
                {i > 0 && (
                  <span
                    className="vc-divider-grow absolute -top-px left-0 h-px bg-[#CCFF00]/50"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                )}
                <span
                  className="vc-pillar-icon text-3xl sm:text-4xl shrink-0"
                  style={{ filter: `drop-shadow(0 0 12px ${p.accent}55)`, animationDelay: `${i * 0.3}s` }}
                >
                  {p.emoji}
                </span>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-white leading-tight mb-2">
                    {p.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#C7BEEA]/70 leading-relaxed max-w-md">{p.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
