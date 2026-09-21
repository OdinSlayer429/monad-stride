import React, { useEffect, useState } from "react";
import { StrideButton } from "../StrideButton";

interface LandingNavProps {
  onLaunchApp: () => void;
}

const SECTIONS = [
  { id: "how-it-works", label: "how it works" },
  { id: "why-it-works", label: "why it works" },
  { id: "pools", label: "pools" },
];

export const LandingNav: React.FC<LandingNavProps> = ({ onLaunchApp }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-[#150E2C]/85 backdrop-blur-md border-b border-white/5" : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-4">
        <a href="#top" className="flex items-center gap-1.5 text-xl font-black text-white lowercase tracking-tighter">
          stride
          <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
        </a>

        <ul className="hidden sm:flex items-center gap-6">
          {SECTIONS.map(s => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-xs font-bold text-[#C7BEEA]/70 hover:text-white lowercase transition-colors"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <StrideButton variant="outline" size="sm" onClick={onLaunchApp}>
          launch app ↗
        </StrideButton>
      </div>
    </nav>
  );
};
