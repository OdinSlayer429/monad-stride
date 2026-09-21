import { useEffect, useRef, useState } from "react";

/**
 * Fades/slides an element in the first time it enters the viewport while scrolling.
 * Powers the section-by-section reveal pacing on the landing page — no animation
 * library needed, just IntersectionObserver.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.01) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Fire well before the element is fully in view (large bottom rootMargin) and at
    // the lowest meaningful threshold, so fast scrolls/flicks can't skip past an
    // element without ever triggering its reveal — better to reveal a beat early than
    // to leave content permanently stuck invisible.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(node);

    // Safety net: if the element is already on/near screen at mount (e.g. a
    // same-frame scroll jump the observer's first callback might race), reveal it
    // directly instead of waiting on the observer.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
      observer.disconnect();
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
