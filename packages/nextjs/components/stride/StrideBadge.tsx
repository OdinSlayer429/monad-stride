import React from "react";

interface StarburstBadgeProps {
  text: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  color?: "neon" | "pink" | "indigo" | "lilac" | "dark";
  className?: string;
}

export const StarburstBadge: React.FC<StarburstBadgeProps> = ({
  text,
  subtext,
  size = "md",
  color = "neon",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-16 h-16 text-[10px]",
    md: "w-20 h-20 text-xs",
    lg: "w-24 h-24 text-sm",
  };

  const colorThemes = {
    neon: {
      fill: "#CCFF00",
      text: "#150E2C",
      stroke: "#150E2C",
    },
    pink: {
      fill: "#FF2E93",
      text: "#FFFFFF",
      stroke: "#150E2C",
    },
    indigo: {
      fill: "#FF2E93",
      text: "#FFFFFF",
      stroke: "#150E2C",
    },
    lilac: {
      fill: "#C7BEEA",
      text: "#150E2C",
      stroke: "#150E2C",
    },
    dark: {
      fill: "#1A1338",
      text: "#CCFF00",
      stroke: "#CCFF00",
    },
  };

  const currentTheme = colorThemes[color];

  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none ${sizeClasses[size]} ${className}`}>
      {/* 12-point Starburst polygon */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full animate-spin-slow drop-shadow-md"
        fill={currentTheme.fill}
        stroke={currentTheme.stroke}
        strokeWidth="2.5"
      >
        <polygon points="50,0 62,20 85,15 80,38 98,50 80,62 85,85 62,80 50,100 38,80 15,85 20,62 2,50 20,38 15,15 38,20" />
      </svg>
      {/* Centered label */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center font-black leading-tight px-2 uppercase tracking-tighter"
        style={{ color: currentTheme.text }}
      >
        <span className="font-extrabold">{text}</span>
        {subtext && <span className="text-[9px] opacity-80 font-mono tracking-normal">{subtext}</span>}
      </div>
    </div>
  );
};

interface StatusPillProps {
  status: "open" | "active" | "awaiting_results" | "resolved" | "goal_hit" | "disputed" | "live";
  label?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, label, className = "" }) => {
  const configs = {
    live: {
      bg: "bg-[#CCFF00]/15 border-[#CCFF00]/40 text-[#CCFF00]",
      dot: "bg-[#CCFF00] beacon-pulse",
      defaultText: "live tracking",
    },
    active: {
      bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
      dot: "bg-emerald-400 animate-pulse",
      defaultText: "active pool",
    },
    open: {
      bg: "bg-sky-500/15 border-sky-500/40 text-sky-300",
      dot: "bg-sky-400",
      defaultText: "open to join",
    },
    awaiting_results: {
      bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
      dot: "bg-amber-400",
      defaultText: "awaiting results",
    },
    resolved: {
      bg: "bg-purple-500/15 border-purple-500/40 text-purple-300",
      dot: "bg-purple-400",
      defaultText: "resolved",
    },
    goal_hit: {
      bg: "bg-[#CCFF00]/20 border-[#CCFF00]/60 text-[#CCFF00]",
      dot: "bg-[#CCFF00]",
      defaultText: "goal hit ✅",
    },
    disputed: {
      bg: "bg-rose-500/20 border-rose-500/60 text-rose-300",
      dot: "bg-rose-400 animate-ping",
      defaultText: "disputed ⚠️",
    },
  };

  const cfg = configs[status] || configs.active;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-tight lowercase select-none ${cfg.bg} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span>{label || cfg.defaultText}</span>
    </div>
  );
};
