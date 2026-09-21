import React from "react";
import { useScrollReveal } from "~~/hooks/stride/useScrollReveal";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

/** Wraps a section so it fades/slides up the first time it scrolls into view. */
export const Reveal: React.FC<RevealProps> = ({ children, className = "", delayMs = 0 }) => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: isVisible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
};
