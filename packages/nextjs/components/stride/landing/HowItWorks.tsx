import React from "react";
import { Reveal } from "./Reveal";
import { StackedSteps } from "./StackedSteps";

const STEPS = [
  {
    n: "01",
    title: "Stake with your group",
    body: "Pick a distance goal and a stake amount. Friends join the pool with matching stakes before the window opens.",
  },
  {
    n: "02",
    title: "Run, your phone proves it",
    body: "GPS and motion sensor data sign themselves in the background as you move — no manual entry, no typed-in distance.",
  },
  {
    n: "03",
    title: "Hit the goal, split the pot",
    body: "Everyone who hits the goal splits what the others forfeit. Anyone can challenge a suspicious run — cheaters lose their whole stake.",
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="relative">
      <div className="px-5 pt-24 sm:pt-32 pb-8">
        <Reveal>
          <span className="block text-center text-xs font-bold text-[#FF2E93] lowercase tracking-wide mb-3">
            the loop
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-[#1C1440] tracking-tight text-center">
            How it works
          </h2>
          <p className="text-center text-sm text-[#1C1440]/50 font-bold lowercase mt-3">keep scrolling ↓</p>
        </Reveal>
      </div>

      <StackedSteps steps={STEPS} />
    </section>
  );
};
