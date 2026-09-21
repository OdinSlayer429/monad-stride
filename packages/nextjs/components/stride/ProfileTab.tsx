import React, { useEffect, useState } from "react";
import { StarburstBadge } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { FloatingChips } from "./landing/FloatingChips";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getSessionKeyAddress } from "~~/services/stride/sessionKey";
import { TrophyBadge, UserProfile, UserRun } from "~~/types/stride";
import { notification } from "~~/utils/scaffold-eth";

interface ProfileTabProps {
  profile: UserProfile;
  badges: TrophyBadge[];
  runs: UserRun[];
  onClaimAll: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, badges, runs, onClaimAll }) => {
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [sessionKeyAddress, setSessionKeyAddress] = useState<string | null>(null);

  const { address: connectedAddress, isConnected } = useAccount();

  // The session key is generated client-side (see services/stride/sessionKey.ts) —
  // read it after mount only, so this never runs during server-side rendering.
  useEffect(() => {
    setSessionKeyAddress(getSessionKeyAddress());
  }, []);

  const { data: registeredKeyOnChain, refetch: refetchDeviceKey } = useScaffoldReadContract({
    contractName: "Stride",
    functionName: "deviceKey",
    args: [connectedAddress],
  });

  const { writeContractAsync: registerDeviceKey, isPending: isRegistering } = useScaffoldWriteContract({
    contractName: "Stride",
  });

  const isRegisteredOnChain =
    !!registeredKeyOnChain &&
    !!sessionKeyAddress &&
    registeredKeyOnChain.toLowerCase() === sessionKeyAddress.toLowerCase();

  const handleRegisterDeviceKey = async () => {
    if (!sessionKeyAddress) return;
    try {
      await registerDeviceKey({
        functionName: "registerDeviceKey",
        args: [sessionKeyAddress as `0x${string}`],
      });
      notification.success("Device key registered onchain — your signed checkpoints can now be verified.");
      refetchDeviceKey();
    } catch {
      // useScaffoldWriteContract already surfaces a parsed error notification on failure.
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(profile.address);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  const handleClaim = () => {
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      onClaimAll();
    }, 700);
  };

  const formatShortAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-5 pb-24 px-4 pt-2 max-w-md mx-auto">
      {/* 1. RUNNER IDENTITY CARD */}
      <div className="relative glass-card p-5 flex flex-col gap-4">
        <FloatingChips
          chips={[
            { emoji: "📍", top: "-10px", left: "78%", rotate: -8 },
            { emoji: "⚡", top: "82%", left: "-10px", rotate: 10 },
          ]}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#CCFF00] border-2 border-black flex items-center justify-center text-3xl shadow-[0_3px_0_#000]">
              🏃‍♂️
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-black text-white lowercase leading-tight">{profile.displayName}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono text-[#C7BEEA]/70">{formatShortAddress(profile.address)}</span>
                <button onClick={handleCopy} className="text-[10px] text-[#CCFF00] hover:underline font-bold">
                  {copiedAddr ? "copied! ✓" : "copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="scale-75 origin-right">
            <StarburstBadge text="RUNNER" color="pink" size="sm" />
          </div>
        </div>

        {/* Claimable Balance Bar */}
        <div className="p-3.5 rounded-2xl bg-[#0F0D0A] border border-[#CCFF00]/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#C7BEEA]/60 tracking-wider">
              claimable pot winnings
            </span>
            <span className="text-xl font-black text-[#CCFF00] font-mono leading-none mt-0.5">
              {profile.claimableMON}
            </span>
          </div>

          <StrideButton
            variant="neon"
            size="sm"
            disabled={claiming || profile.claimableMON === "0.00 MON"}
            onClick={handleClaim}
          >
            {claiming ? "claiming..." : "claim 💰"}
          </StrideButton>
        </div>
      </div>

      {/* 2. STATS BANNER */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card p-3.5 flex flex-col items-center text-center">
          <span className="text-lg">👟</span>
          <span className="text-base font-black text-white mt-1">
            {(profile.totalDistanceMeters / 1000).toFixed(1)} km
          </span>
          <span className="text-[10px] text-[#C7BEEA]/60 font-bold lowercase">total dist</span>
        </div>

        <div className="glass-card p-3.5 flex flex-col items-center text-center">
          <span className="text-lg">🏆</span>
          <span className="text-base font-black text-[#CCFF00] mt-1">{profile.poolsWon}</span>
          <span className="text-[10px] text-[#C7BEEA]/60 font-bold lowercase">pools won</span>
        </div>

        <div className="glass-card p-3.5 flex flex-col items-center text-center">
          <span className="text-lg">🔥</span>
          <span className="text-base font-black text-[#FF2E93] mt-1">{profile.streakDays} days</span>
          <span className="text-[10px] text-[#C7BEEA]/60 font-bold lowercase">streak</span>
        </div>
      </div>

      {/* 3. TROPHY & BADGE CASE */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white lowercase tracking-tight">trophies & badges</h3>
          <span className="text-[11px] text-[#C7BEEA]/60 font-mono">
            {badges.filter(b => b.unlocked).length}/{badges.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {badges.map(b => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                b.unlocked
                  ? "bg-[#241B4D] border-[#CCFF00]/40 shadow-[0_4px_16px_rgba(204,255,0,0.1)]"
                  : "bg-white/5 border-white/5 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{b.icon}</span>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                    b.unlocked ? "bg-[#CCFF00] text-black" : "bg-white/10 text-white/50"
                  }`}
                >
                  {b.tag}
                </span>
              </div>
              <div className="text-xs font-black text-white lowercase leading-tight mt-1">{b.title}</div>
              <p className="text-[10px] text-[#C7BEEA]/70 leading-snug">{b.description}</p>
              {b.unlocked && <span className="text-[9px] text-[#CCFF00] font-bold mt-0.5">✓ {b.unlockedAt}</span>}
              {!b.unlocked && b.progress && (
                <span className="text-[9px] text-white/40 font-mono mt-0.5">{b.progress}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. SECURITY & DEVICE SESSION KEY PANEL */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <div>
              <div className="text-xs font-black text-white lowercase">security & gasless keys</div>
              <div className="text-[10px] text-[#C7BEEA]/70">
                {isConnected ? "device session key" : "connect a wallet to register"}
              </div>
            </div>
          </div>
          {isConnected ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isRegisteredOnChain
                  ? "bg-[#CCFF00]/20 text-[#CCFF00] border-[#CCFF00]/40"
                  : "bg-white/10 text-[#C7BEEA]/70 border-white/20"
              }`}
            >
              {isRegisteredOnChain ? "registered onchain ✓" : "not registered"}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#C7BEEA]/70 text-[10px] font-bold border border-white/20">
              wallet not connected
            </span>
          )}
        </div>

        <p className="text-[11px] text-[#C7BEEA]/80 leading-relaxed font-medium">
          A disposable cryptographic session key signs your GPS & motion checkpoints in the background. No wallet
          signatures or gas fees while you run. Raw private keys never leave your device — only the public address below
          gets registered onchain, once, so disputes can verify your signatures.
        </p>

        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[10px] text-[#C7BEEA]/70 flex items-center justify-between">
          <span>Key: {sessionKeyAddress ? formatShortAddress(sessionKeyAddress) : "generating..."}</span>
          <span className="text-[#CCFF00] font-bold">EIP-712</span>
        </div>

        {isConnected && !isRegisteredOnChain && (
          <StrideButton
            variant="neon"
            size="sm"
            fullWidth
            disabled={isRegistering || !sessionKeyAddress}
            onClick={handleRegisterDeviceKey}
          >
            {isRegistering ? "confirm in wallet..." : "register device key onchain 🔑"}
          </StrideButton>
        )}
      </div>

      {/* 5. APP SETTINGS & SENSORS */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="text-xs font-black text-white lowercase">device permissions</div>

        <div className="flex items-center justify-between text-xs font-bold text-white/90">
          <span className="lowercase">gps high-accuracy</span>
          <span className="text-[#CCFF00]">granted ✓</span>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-white/90 pt-1.5 border-t border-white/5">
          <span className="lowercase">motion / step accelerometer</span>
          <span className="text-[#CCFF00]">granted ✓</span>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-white/90 pt-1.5 border-t border-white/5">
          <span className="lowercase">monad testnet (10143)</span>
          <span className="text-[#CCFF00]">connected ✓</span>
        </div>
      </div>
    </div>
  );
};
