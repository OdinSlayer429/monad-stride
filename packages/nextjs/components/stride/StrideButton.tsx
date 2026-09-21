import React from "react";

interface StrideButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "neon" | "pink" | "indigo" | "outline" | "danger" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  showArrow?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const StrideButton: React.FC<StrideButtonProps> = ({
  variant = "neon",
  size = "md",
  showArrow = false,
  fullWidth = false,
  className = "",
  disabled = false,
  children,
  ...props
}) => {
  const variantStyles = {
    neon: "bg-[#CCFF00] text-[#150E2C] border-2 border-[#150E2C] hover:bg-[#A6D600] active:translate-y-1 shadow-[0_4px_0_#000] active:shadow-[0_1px_0_#000]",
    pink: "bg-[#FF2E93] text-white border-2 border-[#150E2C] hover:bg-[#E01E7E] active:translate-y-1 shadow-[0_4px_0_#000] active:shadow-[0_1px_0_#000]",
    indigo:
      "bg-[#FF2E93] text-white border-2 border-[#150E2C] hover:bg-[#E01E7E] active:translate-y-1 shadow-[0_4px_0_#000] active:shadow-[0_1px_0_#000]",
    outline:
      "bg-transparent text-white border-2 border-white/20 hover:border-[#CCFF00] hover:text-[#CCFF00] active:translate-y-1 shadow-[0_4px_0_rgba(0,0,0,0.5)] active:shadow-[0_1px_0_rgba(0,0,0,0.5)]",
    danger:
      "bg-[#FF3B30] text-white border-2 border-[#150E2C] hover:bg-[#e02d23] active:translate-y-1 shadow-[0_4px_0_#000] active:shadow-[0_1px_0_#000]",
    dark: "bg-[#241B4D] text-[#C7BEEA] border-2 border-[#362A5E] hover:border-[#CCFF00] hover:text-white active:translate-y-1 shadow-[0_4px_0_#000] active:shadow-[0_1px_0_#000]",
  };

  const sizeStyles = {
    sm: "h-9 px-3 text-xs rounded-xl",
    md: "h-11 px-5 text-sm rounded-2xl",
    lg: "h-14 px-6 text-base rounded-2xl font-black",
    xl: "h-16 px-8 text-lg rounded-3xl font-black",
  };

  return (
    <button
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 font-bold tracking-tight lowercase transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      <span>{children}</span>
      {showArrow && (
        <span className="text-base font-black transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          ↗
        </span>
      )}
    </button>
  );
};
