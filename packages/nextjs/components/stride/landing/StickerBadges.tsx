import React from "react";

interface StickerProps {
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  rotate?: number;
  className?: string;
}

/** Scalloped "seal of approval" sticker — a circle with a wavy, notched edge. */
export const SealSticker: React.FC<StickerProps> = ({
  children,
  color = "#FFFFFF",
  textColor = "#150E2C",
  rotate = -8,
  className = "",
}) => (
  <div
    className={`relative inline-flex items-center justify-center w-24 h-24 shrink-0 select-none ${className}`}
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-lg" fill={color}>
      <path d="M50 2 C58 2 58 10 65 12 C72 14 76 7 82 12 C88 17 84 24 89 29 C94 34 100 32 100 40 C100 48 93 49 93 57 C93 65 100 68 96 75 C92 82 85 78 80 84 C75 90 78 97 70 98 C62 99 60 92 52 93 C44 94 42 100 35 98 C28 96 29 89 22 86 C15 83 9 88 5 82 C1 76 7 71 4 64 C1 57 -5 55 0 48 C5 41 12 43 15 36 C18 29 13 23 20 18 C27 13 31 19 38 15 C45 11 43 3 50 2 Z" />
    </svg>
    <span
      className="relative z-10 text-center font-black leading-none px-3 uppercase tracking-tighter text-xs"
      style={{ color: textColor }}
    >
      {children}
    </span>
  </div>
);

/** Folded-flag / ribbon sticker — a rectangle with one notched corner. */
export const RibbonSticker: React.FC<StickerProps> = ({
  children,
  color = "#FF2E93",
  textColor = "#FFFFFF",
  rotate = 6,
  className = "",
}) => (
  <div
    className={`inline-flex items-center justify-center px-5 py-3 shrink-0 select-none shadow-lg ${className}`}
    style={{
      backgroundColor: color,
      color: textColor,
      transform: `rotate(${rotate}deg)`,
      clipPath: "polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%)",
    }}
  >
    <span className="text-center font-black leading-tight text-xs whitespace-nowrap">{children}</span>
  </div>
);

/** Organic blob "splat" sticker. */
export const SplatSticker: React.FC<StickerProps> = ({
  children,
  color = "#FFFFFF",
  textColor = "#150E2C",
  rotate = -4,
  className = "",
}) => (
  <div
    className={`relative inline-flex items-center justify-center w-24 h-24 shrink-0 select-none ${className}`}
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-lg" fill={color}>
      <path d="M52 4 C68 2 72 18 84 22 C98 27 100 42 92 52 C100 60 96 78 82 80 C76 94 58 98 48 88 C34 96 16 88 16 72 C2 68 0 50 12 40 C8 26 22 12 36 16 C40 6 48 4 52 4 Z" />
    </svg>
    <span
      className="relative z-10 text-center font-black leading-none px-3 uppercase tracking-tighter text-xs"
      style={{ color: textColor }}
    >
      {children}
    </span>
  </div>
);
