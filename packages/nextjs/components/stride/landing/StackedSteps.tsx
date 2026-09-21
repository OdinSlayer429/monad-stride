import React, { useEffect, useRef } from "react";

interface Step {
  n: string;
  title: string;
  body: string;
}

interface StackedStepsProps {
  steps: Step[];
}

/**
 * Bare, scroll-driven kinetic typography — no card, no box, no border. The
 * section is tall (steps.length * 100vh) with sticky content pinned at the
 * top; scroll progress through that range drives each step's number/title/
 * body up from below into full size and full readability at center, then on
 * up and out as the next one arrives. Direct style mutation in a
 * requestAnimationFrame loop (not React state), so scrolling stays smooth.
 */
export const StackedSteps: React.FC<StackedStepsProps> = ({ steps }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    const update = () => {
      const section = sectionRef.current;
      if (section) {
        const rect = section.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const scrolled = clamp(-rect.top, 0, Math.max(total, 1));
        const progress = (scrolled / Math.max(total, 1)) * (steps.length - 1);

        steps.forEach((_, i) => {
          const el = itemRefs.current[i];
          if (!el) return;
          const d = i - progress; // 0 = fully arrived/centered; + = still below/upcoming; - = already passed/above
          const dist = clamp(Math.abs(d), 0, 1); // 0 at center, 1 at either edge of its own transition window
          const scale = 1 - dist * 0.55;
          const translateY = d * 260;
          const opacity = 1 - dist;
          el.style.transform = `translate3d(-50%, calc(-50% + ${translateY}px), 0) scale(${scale})`;
          el.style.opacity = String(opacity);
          el.style.zIndex = String(100 - Math.round(dist * 10));
          el.style.pointerEvents = dist < 0.05 ? "auto" : "none";
        });
      }
      rafId.current = requestAnimationFrame(update);
    };

    rafId.current = requestAnimationFrame(update);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [steps]);

  return (
    <div ref={sectionRef} style={{ height: `${steps.length * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {steps.map((step, i) => (
          <div
            key={step.n}
            ref={el => {
              itemRefs.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 w-[90vw] max-w-2xl text-center"
            style={{ transform: "translate3d(-50%, -50%, 0)" }}
          >
            <span className="block text-xs sm:text-sm font-bold text-[#CCFF00] lowercase tracking-wide mb-3">
              step {step.n}
            </span>
            <h3 className="font-display font-black text-[#1C1440] leading-[0.95] tracking-tight mb-5 text-[clamp(2rem,7vw,4.5rem)]">
              {step.title}
            </h3>
            <p className="text-base sm:text-lg text-[#1C1440]/60 leading-relaxed max-w-md mx-auto">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
