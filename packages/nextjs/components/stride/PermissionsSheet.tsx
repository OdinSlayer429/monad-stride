import React, { useState } from "react";
import { StrideButton } from "./StrideButton";

interface PermissionsSheetProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const PermissionsSheet: React.FC<PermissionsSheetProps> = ({ isOpen, onConfirm }) => {
  const [requesting, setRequesting] = useState(false);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setRequesting(true);

    // Request browser Geolocation if supported
    if (typeof window !== "undefined" && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { timeout: 3000 },
        );
      } catch {
        // silent fallback
      }
    }

    // Request iOS DeviceMotion permission if available
    if (
      typeof window !== "undefined" &&
      typeof (DeviceMotionEvent as any) !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      try {
        await (DeviceMotionEvent as any).requestPermission();
      } catch {
        // user declined or not iOS 13+
      }
    }

    setTimeout(() => {
      setRequesting(false);
      onConfirm();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#13110D] border-t-2 sm:border-2 border-[#362A5E] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        {/* Handle for mobile feel */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#CCFF00] text-black font-black flex items-center justify-center text-xl shadow-[0_2px_0_#000]">
            ⚡
          </div>
          <div>
            <h3 className="text-xl font-black text-white lowercase tracking-tight">enable stride</h3>
            <p className="text-xs text-[#C7BEEA]/70">quick one-tap permissions</p>
          </div>
        </div>

        <p className="text-xs text-[#C7BEEA]/80 leading-relaxed my-3 font-medium">
          Stride needs your phone sensors to verify your real activity and protect the staking pot.
        </p>

        {/* Permission items list */}
        <div className="flex flex-col gap-3 my-4">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xl">📍</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white lowercase">location & gps</div>
              <div className="text-[11px] text-[#C7BEEA]/70">Draws your real route and distance live.</div>
            </div>
            <span className="text-[#CCFF00] text-xs font-bold">✓</span>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xl">👟</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white lowercase">motion & cadence</div>
              <div className="text-[11px] text-[#C7BEEA]/70">
                Verifies footstep rhythm so cars & scooters can&apos;t spoof runs.
              </div>
            </div>
            <span className="text-[#CCFF00] text-xs font-bold">✓</span>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xl">🔑</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white lowercase">gasless activity engine</div>
              <div className="text-[11px] text-[#C7BEEA]/70">
                Generates a secure device session key. Zero gas popups mid-run.
              </div>
            </div>
            <span className="text-[#CCFF00] text-xs font-bold">✓</span>
          </div>
        </div>

        <StrideButton variant="neon" size="lg" fullWidth disabled={requesting} onClick={handleEnable}>
          {requesting ? "configuring sensors..." : "enable & continue 🏃"}
        </StrideButton>
      </div>
    </div>
  );
};
