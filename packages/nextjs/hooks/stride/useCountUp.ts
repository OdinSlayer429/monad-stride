import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 up to `target` the first time its element scrolls
 * into view, eased out (not linear) — same IntersectionObserver-driven,
 * fire-once approach as useScrollReveal, just producing a number instead of a
 * visibility flag.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(target: number, durationMs = 1200) {
  const ref = useRef<T | null>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const startTime = performance.now();

        const tick = (now: number) => {
          const t = Math.min((now - startTime) / durationMs, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(target * eased);
          if (t < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}
