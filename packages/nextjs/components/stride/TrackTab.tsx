import React, { useEffect, useRef, useState } from "react";
import { StarburstBadge, StatusPill } from "./StrideBadge";
import { StrideButton } from "./StrideButton";
import { GPSEngine, LiveRunState, formatDistance, formatDuration, formatPace } from "~~/services/stride/gpsEngine";
import { Pool, UserRun } from "~~/types/stride";

interface TrackTabProps {
  pools: Pool[];
  preselectedPoolId?: string;
  runnerAddress: string;
  onFinishRun: (run: UserRun) => void;
}

export const TrackTab: React.FC<TrackTabProps> = ({ pools, preselectedPoolId, runnerAddress, onFinishRun }) => {
  // Pre-run configuration state
  const [selectedGoalDistance, setSelectedGoalDistance] = useState<number>(5000); // 5km default
  const [selectedPoolId, setSelectedPoolId] = useState<string>(preselectedPoolId || "");
  const [enableGhostPace, setEnableGhostPace] = useState<boolean>(true);
  const [useSimulation, setUseSimulation] = useState<boolean>(true);

  // Live tracking state
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [runState, setRunState] = useState<LiveRunState | null>(null);
  const [showGoalCelebration, setShowGoalCelebration] = useState<boolean>(false);
  const [isHoldingStop, setIsHoldingStop] = useState<boolean>(false);
  const [stopProgress, setStopProgress] = useState<number>(0);

  const engineRef = useRef<GPSEngine | null>(null);
  const stopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize with preselectedPoolId prop if provided
  useEffect(() => {
    if (preselectedPoolId) {
      setSelectedPoolId(preselectedPoolId);
      const matchedPool = pools.find(p => p.id === preselectedPoolId);
      if (matchedPool) {
        setSelectedGoalDistance(matchedPool.goalDistanceMeters);
      }
    }
  }, [preselectedPoolId, pools]);

  const handleStartRun = () => {
    const engine = new GPSEngine(
      state => {
        setRunState(state);
      },
      () => {
        // Goal reached mid-run!
        setShowGoalCelebration(true);
        setTimeout(() => setShowGoalCelebration(false), 4500);
      },
      {
        runnerAddress: runnerAddress as `0x${string}`,
        // Baked into every checkpoint's signed payload, so it has to be decided before
        // tracking starts, not after — a real dispute checks a checkpoint's own poolId
        // field, so checkpoints signed for the wrong pool (or no pool) can never be
        // validly submitted to a different one after the fact.
        poolId: selectedPoolId ? Number(selectedPoolId) : undefined,
      },
    );

    engineRef.current = engine;
    setIsTracking(true);
    engine.start(selectedGoalDistance > 0 ? selectedGoalDistance : undefined, useSimulation);
  };

  const handleStopRun = () => {
    if (!engineRef.current) return;
    const finalState = engineRef.current.stop();
    setIsTracking(false);

    const matchedPool = pools.find(p => p.id === selectedPoolId);

    const finishedRun: UserRun = {
      id: `run-${Date.now()}`,
      title: matchedPool ? `${matchedPool.title} Run` : "Outdoor Activity Track",
      timestamp: Date.now(),
      distanceMeters: Math.round(finalState.distanceMeters),
      durationSeconds: finalState.elapsedSeconds,
      avgPace: formatPace(finalState.currentPaceSecPerKm),
      avgCadence: finalState.currentCadenceSpm,
      elevationMeters: 28,
      calories: Math.round((finalState.distanceMeters / 1000) * 65),
      routeCoordinates: finalState.coordinates,
      checkpoints: finalState.checkpoints,
      poolId: matchedPool?.id,
      poolTitle: matchedPool?.title,
      submittedToPool: false,
    };

    onFinishRun(finishedRun);
  };

  // Hold-to-stop gesture to prevent accidental touch during run
  const handleMouseDownStop = () => {
    setIsHoldingStop(true);
    let current = 0;
    stopIntervalRef.current = setInterval(() => {
      current += 10;
      setStopProgress(current);
      if (current >= 100) {
        clearInterval(stopIntervalRef.current!);
        setIsHoldingStop(false);
        setStopProgress(0);
        handleStopRun();
      }
    }, 100); // 1 second total hold
  };

  const handleMouseUpStop = () => {
    if (stopIntervalRef.current) {
      clearInterval(stopIntervalRef.current);
    }
    setIsHoldingStop(false);
    setStopProgress(0);
  };

  // Pre-run Goal Options
  const goalOptions = [
    { label: "just track", meters: 0 },
    { label: "3 km", meters: 3000 },
    { label: "5 km", meters: 5000 },
    { label: "10 km", meters: 10000 },
  ];

  // SVG route path generator
  const renderSVGRoute = (coords: [number, number][]) => {
    if (!coords || coords.length < 2) {
      return <line x1="50" y1="150" x2="250" y2="150" stroke="#CCFF00" strokeWidth="4" strokeDasharray="6 6" />;
    }

    // Normalize coordinates to viewBox (300 x 300)
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    const points = coords.map(([lat, lng]) => {
      const x = 30 + ((lng - minLng) / lngSpan) * 240;
      const y = 270 - ((lat - minLat) / latSpan) * 240;
      return `${x},${y}`;
    });

    const lastPoint = points[points.length - 1].split(",");

    return (
      <>
        {/* Ghost Competitor Line (Slightly offset purple line) */}
        {enableGhostPace && (
          <path
            d={`M ${points[0]} ${points
              .slice(1)
              .map(p => `L ${p}`)
              .join(" ")}`}
            fill="none"
            stroke="#FF2E93"
            strokeWidth="3"
            strokeDasharray="4 4"
            opacity="0.4"
            transform="translate(-6, 6)"
          />
        )}

        {/* Real Live GPS Route Path (Electric Neon Lime with glow) */}
        <path
          d={`M ${points[0]} ${points
            .slice(1)
            .map(p => `L ${p}`)
            .join(" ")}`}
          fill="none"
          stroke="#CCFF00"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="drop-shadow(0 0 8px rgba(204,255,0,0.8))"
        />

        {/* Pulsing runner cursor */}
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="7" fill="#CCFF00" stroke="#000" strokeWidth="2" />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="14" fill="#CCFF00" opacity="0.3" className="animate-ping" />
      </>
    );
  };

  // -------------------------
  // 1. PRE-RUN SETUP VIEW
  // -------------------------
  if (!isTracking) {
    return (
      <div className="flex flex-col gap-5 pb-24 px-4 pt-2 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white lowercase tracking-tight">track activity</h1>
          <span className="text-xs text-[#C7BEEA]/60 font-mono">gps + cadence ready</span>
        </div>

        {/* Goal Selector Bento Card */}
        <div className="glass-card p-5 flex flex-col gap-4">
          <div>
            <span className="text-xs font-black text-white lowercase tracking-tight">1. choose goal distance</span>
            <p className="text-[11px] text-[#C7BEEA]/70 mt-0.5">
              Set a target or simply track freeform without a goal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map(opt => (
              <button
                key={opt.meters}
                onClick={() => {
                  setSelectedGoalDistance(opt.meters);
                  setSelectedPoolId(""); // custom goal clears pool selection
                }}
                className={`py-3 px-4 rounded-2xl font-black text-sm tracking-tight transition-all text-center lowercase ${
                  selectedGoalDistance === opt.meters && !selectedPoolId
                    ? "bg-[#CCFF00] text-black border-2 border-black shadow-[0_3px_0_#000]"
                    : "bg-white/5 text-white/80 border border-white/10 hover:border-white/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Optional Staked Pool Link */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-xs font-black text-white lowercase tracking-tight">2. or link to an active pool</span>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => setSelectedPoolId("")}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-left lowercase transition-all ${
                  !selectedPoolId ? "bg-white/15 text-white" : "bg-white/5 text-[#C7BEEA]/60 hover:text-white"
                }`}
              >
                none (solo run)
              </button>
              {pools
                .filter(p => p.status === "active" || p.status === "open")
                .map(pool => (
                  <button
                    key={pool.id}
                    onClick={() => {
                      setSelectedPoolId(pool.id);
                      setSelectedGoalDistance(pool.goalDistanceMeters);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between lowercase transition-all ${
                      selectedPoolId === pool.id
                        ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/50"
                        : "bg-white/5 text-[#C7BEEA]/80 hover:text-white"
                    }`}
                  >
                    <span>
                      {pool.title} ({(pool.goalDistanceMeters / 1000).toFixed(1)} km)
                    </span>
                    <span className="font-mono text-[10px] text-[#CCFF00]">{pool.stakeAmount}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Feature Toggles Card */}
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">👻</span>
              <div>
                <div className="text-xs font-black text-white lowercase">ghost pace competitor</div>
                <div className="text-[10px] text-[#C7BEEA]/60">Race against Alex&apos;s 5:10/km pace on map</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableGhostPace}
              onChange={e => setEnableGhostPace(e.target.checked)}
              className="checkbox checkbox-sm checkbox-accent"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-base">🎮</span>
              <div>
                <div className="text-xs font-black text-white lowercase">outdoor gps simulation</div>
                <div className="text-[10px] text-[#C7BEEA]/60">
                  Realistic park loop simulator (turn off for real outdoor run)
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useSimulation}
              onChange={e => setUseSimulation(e.target.checked)}
              className="checkbox checkbox-sm checkbox-accent"
            />
          </div>
        </div>

        {/* Giant Start Button */}
        <StrideButton
          variant="neon"
          size="xl"
          fullWidth
          onClick={handleStartRun}
          className="text-xl shadow-[0_6px_0_#000]"
        >
          ⚡ start tracking ↗
        </StrideButton>
      </div>
    );
  }

  // -------------------------
  // 2. LIVE RUNNING HUD VIEW
  // -------------------------
  const distance = runState?.distanceMeters || 0;
  const elapsed = runState?.elapsedSeconds || 0;
  const pace = runState ? formatPace(runState.currentPaceSecPerKm) : "5:00 /km";
  const cadence = runState?.currentCadenceSpm || 168;
  const ghostDelta = runState?.ghostDeltaMeters || 0;

  const targetGoal = selectedGoalDistance > 0 ? selectedGoalDistance : 0;
  const progressPercent = targetGoal > 0 ? Math.min(100, Math.round((distance / targetGoal) * 100)) : 0;

  return (
    <div className="relative min-h-[82vh] flex flex-col justify-between pb-24 px-4 pt-1 max-w-md mx-auto">
      {/* Mid-run celebratory confetti banner */}
      {showGoalCelebration && (
        <div className="absolute inset-x-4 top-16 z-30 p-4 rounded-3xl bg-[#CCFF00] border-2 border-black text-black text-center shadow-[0_10px_30px_rgba(204,255,0,0.5)] animate-bounce">
          <div className="text-2xl font-black lowercase leading-none">🎉 goal reached!</div>
          <div className="text-xs font-bold mt-1">
            You hit {(targetGoal / 1000).toFixed(1)} km! Keep running or finish to lock in!
          </div>
        </div>
      )}

      {/* Top Bar: Recording Dot + Ghost Pace Status */}
      <div className="flex items-center justify-between py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-black lowercase tracking-tight">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>rec • {formatDuration(elapsed)}</span>
        </div>

        {enableGhostPace && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              ghostDelta >= 0
                ? "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/40"
                : "bg-amber-500/15 text-amber-300 border-amber-500/40"
            }`}
          >
            {ghostDelta >= 0 ? `+${ghostDelta}m ahead 🏃` : `${ghostDelta}m behind ⚡`}
          </div>
        )}
      </div>

      {/* FULL-SCREEN INTERACTIVE ROUTE MAP (Vector SVG) */}
      <div className="relative w-full h-64 my-2 rounded-3xl bg-[#0E0C09] border-2 border-[#28221A] overflow-hidden shadow-inner flex items-center justify-center">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 bg-[radial-gradient(#251F17_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <svg viewBox="0 0 300 300" className="w-full h-full">
          {renderSVGRoute(runState?.coordinates || [])}
        </svg>

        {/* Ghost runner legend label */}
        {enableGhostPace && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] text-white/80">
            <span className="w-2 h-0.5 bg-[#FF2E93]" />
            <span>ghost (alex 5:10/km)</span>
          </div>
        )}

        {/* Live Cadence Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 border border-[#CCFF00]/40 text-[#CCFF00] text-[11px] font-mono font-black">
          <span>👟 {cadence} spm</span>
        </div>
      </div>

      {/* OUTDOOR-READABLE HUGE STATS HUD */}
      <div className="flex flex-col gap-3">
        {/* Distance (Primary Huge Stat) */}
        <div className="glass-card p-4 flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-[#C7BEEA]/70 font-bold uppercase tracking-wider block">distance</span>
            <div className="text-5xl font-black text-white tracking-tighter leading-none mt-1">
              {(distance / 1000).toFixed(2)}
              <span className="text-xl font-bold text-[#CCFF00] ml-1">km</span>
            </div>
          </div>

          {targetGoal > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#C7BEEA]/60 font-mono">goal: {(targetGoal / 1000).toFixed(1)} km</span>
              <div className="text-sm font-black text-[#CCFF00] mt-1">{progressPercent}%</div>
            </div>
          )}
        </div>

        {/* Progress Bar (If goal set) */}
        {targetGoal > 0 && (
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#CCFF00] transition-all duration-300 shadow-[0_0_12px_#CCFF00]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Pace & Duration HUD Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="glass-card p-3.5">
            <span className="text-[10px] text-[#C7BEEA]/70 font-bold uppercase tracking-wider block">current pace</span>
            <span className="text-2xl font-black text-white font-mono tracking-tight block mt-0.5">{pace}</span>
          </div>

          <div className="glass-card p-3.5">
            <span className="text-[10px] text-[#C7BEEA]/70 font-bold uppercase tracking-wider block">elapsed time</span>
            <span className="text-2xl font-black text-white font-mono tracking-tight block mt-0.5">
              {formatDuration(elapsed)}
            </span>
          </div>
        </div>

        {/* STOP / FINISH RUN CONTROL (Hold 1s to stop to prevent accidental pocket tap) */}
        <div className="mt-2">
          <button
            onMouseDown={handleMouseDownStop}
            onMouseUp={handleMouseUpStop}
            onTouchStart={handleMouseDownStop}
            onTouchEnd={handleMouseUpStop}
            className="relative w-full h-14 rounded-2xl bg-[#FF3B30] text-white border-2 border-black font-black text-base lowercase tracking-tight shadow-[0_4px_0_#000] active:translate-y-1 overflow-hidden select-none"
          >
            {/* Fill progress layer */}
            <div
              className="absolute inset-0 bg-black/40 transition-all duration-75"
              style={{ width: `${stopProgress}%` }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>⏹ hold to stop run</span>
              {stopProgress > 0 && <span className="font-mono text-xs">({stopProgress}%)</span>}
            </span>
          </button>
          <div className="text-center text-[10px] text-[#C7BEEA]/50 mt-1">Press and hold for 1 second to finish</div>
        </div>
      </div>
    </div>
  );
};
