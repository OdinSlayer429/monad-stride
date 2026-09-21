import React, { useEffect, useRef } from "react";

/**
 * A solid yellow triangle cursor — GTA Vice City menu-selector style — replacing
 * the previous GPS-crosshair reticle everywhere (landing + in-app, see
 * ScaffoldEthAppWithProviders.tsx for the mount point). On hover over anything
 * tagged data-cursor="hover", it pops and shows a small contextual label (from
 * data-cursor-text, default "view"). Desktop only — disabled on touch devices
 * via a pointer:fine check.
 */
export const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.body.classList.add("custom-cursor-active");

    // Hover scale/rotate is folded into this same inline transform (rather than
    // toggled via a CSS class) because the position translate is also set
    // inline here every frame — inline styles always beat class rules, so a
    // separate `.vc-cursor-hover { transform: ... }` class would silently
    // never apply.
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const hoverTarget = el?.closest<HTMLElement>('[data-cursor="hover"]');
      const isHover = !!hoverTarget;

      if (cursorRef.current) {
        const pop = isHover ? " scale(1.5) rotate(-10deg)" : "";
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-4px, -14px)${pop}`;
      }
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        labelRef.current.classList.toggle("vc-label-visible", isHover);
        labelRef.current.textContent = hoverTarget?.dataset.cursorText || "view";
      }
    };

    window.addEventListener("mousemove", onMove);

    return () => {
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="vc-cursor">
        <svg viewBox="0 0 28 28" fill="none" className="vc-cursor-tri">
          <polygon points="2,14 25,3 25,25" fill="#FFE600" stroke="#150E2C" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div ref={labelRef} className="vc-label" />
    </>
  );
};
