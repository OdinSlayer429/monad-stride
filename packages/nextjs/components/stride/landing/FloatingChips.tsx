import React, { useEffect, useRef } from "react";

interface Chip {
  emoji: string;
  top: string;
  left: string;
  rotate?: number;
}

const DEFAULT_CHIPS: Chip[] = [
  { emoji: "📍", top: "10%", left: "8%", rotate: -10 },
  { emoji: "⚡", top: "72%", left: "88%", rotate: 12 },
  { emoji: "🔒", top: "82%", left: "12%", rotate: -6 },
  { emoji: "💰", top: "14%", left: "86%", rotate: 8 },
];

/**
 * A handful of small draggable icon chips scattered over a section — the
 * floating-decoration pattern from crency.agency, adapted with real
 * pointer-drag (mousedown/move/up, no physics lib) instead of static icons.
 * Decorative only: absolute layer, no semantics, reusable across sections.
 */
export const FloatingChips: React.FC<{ chips?: Chip[] }> = ({ chips = DEFAULT_CHIPS }) => {
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const offsets = useRef(chips.map(() => ({ x: 0, y: 0 })));
  const dragging = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const i = dragging.current;
      if (i === null) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      offsets.current[i].x += dx;
      offsets.current[i].y += dy;
      const node = nodeRefs.current[i];
      if (node) {
        node.style.transform = `translate3d(${offsets.current[i].x}px, ${offsets.current[i].y}px, 0) rotate(${chips[i].rotate || 0}deg)`;
      }
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [chips]);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {chips.map((c, i) => (
        <div
          key={i}
          ref={el => {
            nodeRefs.current[i] = el;
          }}
          onPointerDown={e => {
            dragging.current = i;
            last.current = { x: e.clientX, y: e.clientY };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          className="vc-chip absolute pointer-events-auto"
          style={{ top: c.top, left: c.left, transform: `rotate(${c.rotate || 0}deg)` }}
        >
          {c.emoji}
        </div>
      ))}
    </div>
  );
};
