import React, { useEffect, useRef } from "react";

interface Page {
  bg: string;
  text: string;
  accent: string;
  tag: string;
  title: string;
  body: string;
}

const PAGES: Page[] = [
  {
    bg: "#150E2C",
    text: "#ECE7F7",
    accent: "#CCFF00",
    tag: "the good stuff",
    title: "Why runners actually stick with this",
    body: "Four quick things, then you'll know exactly what you're signing up for.",
  },
  {
    bg: "#E3DCF7",
    text: "#1C1440",
    accent: "#FF2E93",
    tag: "the crew",
    title: "Stake with people who'll actually show up",
    body: "Share a code, everyone throws in the same amount, the group chat does the rest of the motivating.",
  },
  {
    bg: "#CCFF00",
    text: "#150E2C",
    accent: "#150E2C",
    tag: "the proof",
    title: "Your phone does the talking",
    body: "GPS and motion sign every step automatically in the background. No manual logging, no typing in a number and hoping nobody looks too closely.",
  },
  {
    bg: "#150E2C",
    text: "#ECE7F7",
    accent: "#FF2E93",
    tag: "the payout",
    title: "Hit the goal, take the pot",
    body: "Split what's left with everyone else who showed up. Settles onchain straight to your wallet — no app-store cut, no waiting on anyone.",
  },
];

/**
 * A book that flips bottom-to-top as you scroll: each page is a full-bleed
 * opaque panel that rises from off-screen and permanently covers the one
 * before it, driven by scroll position (same pinned-section + rAF-driven-
 * progress technique as StackedSteps.tsx, applied to whole-page panels
 * instead of kinetic type). First and last page share the site's dark navy
 * so it hands off cleanly to whatever comes next without an extra divider.
 */
export const BookFlip: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    const update = () => {
      const section = sectionRef.current;
      if (section) {
        const rect = section.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const scrolled = clamp(-rect.top, 0, Math.max(total, 1));
        const local = (scrolled / Math.max(total, 1)) * (PAGES.length - 1);

        PAGES.forEach((_, i) => {
          const el = pageRefs.current[i];
          if (!el) return;
          if (i === 0) {
            el.style.transform = "translate3d(0, 0, 0)";
            return;
          }
          const t = clamp(local - (i - 1), 0, 1);
          el.style.transform = `translate3d(0, ${(1 - t) * 100}%, 0)`;
        });
      }
      rafId.current = requestAnimationFrame(update);
    };

    rafId.current = requestAnimationFrame(update);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div ref={sectionRef} style={{ height: `${PAGES.length * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {PAGES.map((page, i) => (
          <div
            key={page.title}
            ref={el => {
              pageRefs.current[i] = el;
            }}
            className="absolute inset-0 flex items-center justify-center px-6"
            style={{ background: page.bg, zIndex: i, willChange: "transform" }}
          >
            {/* top page-edge shadow — sells the "physical page" feel as the next one slides up over it */}
            <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
            {/* a small drifting accent shape so the flat panel isn't dead still while pinned */}
            <div
              className="vc-page-drift absolute w-24 h-24 rounded-full pointer-events-none"
              style={{
                background: page.accent,
                opacity: 0.12,
                top: "18%",
                right: "12%",
                animationDelay: `${i * 0.4}s`,
              }}
            />

            <div className="relative max-w-lg text-center">
              <span
                className="block text-xs sm:text-sm font-bold lowercase tracking-wide mb-4"
                style={{ color: page.accent }}
              >
                {page.tag}
              </span>
              <h3
                className="font-display font-black leading-[0.95] tracking-tight mb-5 text-[clamp(1.8rem,6vw,3.5rem)]"
                style={{ color: page.text }}
              >
                {page.title}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed opacity-70" style={{ color: page.text }}>
                {page.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
