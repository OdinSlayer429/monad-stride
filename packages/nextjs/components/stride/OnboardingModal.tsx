import React, { useState } from "react";
import { StarburstBadge } from "./StrideBadge";
import { StrideButton } from "./StrideButton";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      badgeText: "STAKE",
      badgeColor: "neon" as const,
      title: "Stake with friends",
      desc: "Put down a friendly bet in MON with your group chat. Everyone stakes on a shared distance goal (e.g. 5 km).",
      icon: "💰",
      stat: "pot pools up to 10 MON",
    },
    {
      badgeText: "TRACK",
      badgeColor: "pink" as const,
      title: "Run, walk or hike",
      desc: "Lace up and hit the road. Stride captures real GPS + motion sensors in the background with zero gas fees.",
      icon: "🏃‍♂️",
      stat: "gasless eip-712 proofs",
    },
    {
      badgeText: "WIN",
      badgeColor: "indigo" as const,
      title: "Winners split the pot",
      desc: "Whoever hits the goal splits what the others forfeit. If you finish, you walk away with profit and bragging rights.",
      icon: "🏆",
      stat: "fast instant monad payouts",
    },
  ];

  const slide = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[#110F0B] border-2 border-[#362A5E] rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#CCFF00]/15 blur-2xl pointer-events-none" />

        {/* Top skip affordance */}
        <div className="w-full flex justify-between items-center mb-6">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "w-6 bg-[#CCFF00]" : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>
          <button onClick={onComplete} className="text-xs font-bold text-[#C7BEEA]/60 hover:text-white lowercase">
            skip
          </button>
        </div>

        {/* Big Graphic & Starburst Badge */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="text-7xl select-none">{slide.icon}</div>
          <div className="absolute -top-3 -right-6">
            <StarburstBadge text={slide.badgeText} color={slide.badgeColor} size="sm" />
          </div>
        </div>

        {/* Slide Content */}
        <h2 className="text-2xl font-black tracking-tight text-white mt-4 mb-2 lowercase">{slide.title}</h2>
        <p className="text-sm text-[#C7BEEA]/80 leading-relaxed mb-6 font-medium">{slide.desc}</p>

        {/* Tag Pill */}
        <div className="mb-8 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-[#CCFF00]">
          ⚡ {slide.stat}
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <StrideButton variant="neon" size="lg" fullWidth onClick={handleNext}>
            {currentSlide < slides.length - 1 ? "next step ↗" : "let's stride 🔥"}
          </StrideButton>
        </div>
      </div>
    </div>
  );
};
