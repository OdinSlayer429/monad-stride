import { getSessionAccount } from "./sessionKey";
import { Address, Hex, getAddress, hashTypedData, zeroHash } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { Checkpoint } from "~~/types/stride";

export interface LiveRunState {
  isActive: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number;
  currentCadenceSpm: number;
  currentCoord: [number, number];
  coordinates: [number, number][];
  checkpoints: Checkpoint[];
  targetGoalMeters?: number;
  hasReachedGoal: boolean;
  ghostDeltaMeters: number; // positive = ahead of ghost, negative = behind
  usingRealGps: boolean;
  usingRealMotion: boolean;
}

// Monad testnet — matches the chain every other Stride file already hardcodes
// (customChains.ts, scaffold.config.ts) rather than pulling in wagmi config here.
const CHAIN_ID = 10143;
const STRIDE_ADDRESS = getAddress(deployedContracts[10143].Stride.address);

// Same flat, non-latitude-corrected meters-per-degree approximation Stride.sol itself
// uses (METERS_PER_DEGREE) — deliberately matched so the distance we report here is the
// same "real distance" a dispute would check it against, not a more-accurate-but-
// inconsistent haversine figure.
const METERS_PER_DEGREE = 111_320;

const CHECKPOINT_DOMAIN = {
  name: "Stride",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: STRIDE_ADDRESS,
} as const;

const CHECKPOINT_TYPES = {
  Checkpoint: [
    { name: "poolId", type: "uint256" },
    { name: "runner", type: "address" },
    { name: "index", type: "uint32" },
    { name: "timestamp", type: "uint64" },
    { name: "lat", type: "int32" },
    { name: "lng", type: "int32" },
    { name: "cadenceSpm", type: "uint16" },
    { name: "prevHash", type: "bytes32" },
  ],
} as const;

// A park-loop path used only as the position SOURCE when real GPS isn't available
// (desktop testing, or the explicit "simulation" toggle) — everything downstream of a
// position (distance, checkpoints, hashing, signing) is identical either way, so a
// simulated run still produces a genuinely real, verifiable signed checkpoint chain.
function simulatedPosition(elapsedSeconds: number, startLat: number, startLng: number): [number, number] {
  const angle = (elapsedSeconds * 0.05) % (Math.PI * 2);
  const radius = 0.003;
  const lat = startLat + Math.sin(angle) * radius + elapsedSeconds * 0.00002;
  const lng = startLng + Math.cos(angle) * (radius * 1.3);
  return [lat, lng];
}

export class GPSEngine {
  private timer: NodeJS.Timeout | null = null;
  private watchId: number | null = null;
  private state: LiveRunState;
  private onUpdate: (state: LiveRunState) => void;
  private onGoalReached?: () => void;
  private runnerAddress: Address;
  private poolId: number;

  private useSimulation = true;
  private startLat = 37.7749;
  private startLng = -122.4194;
  private ghostPaceSecPerKm = 310; // 5:10 /km

  // Real step-cadence detection: a simple threshold-crossing peak counter over the
  // accelerometer's magnitude, debounced so one footstep's vibration isn't double
  // counted, averaged over a rolling window for a steady steps/min reading.
  private stepTimestamps: number[] = [];
  private lastMagnitude = 0;
  private risingEdge = false;
  private realMotionEventCount = 0;
  private motionListener?: (e: DeviceMotionEvent) => void;

  private digestByIndex = new Map<number, Hex>();
  private checkpointInFlight = false;

  constructor(
    onUpdate: (state: LiveRunState) => void,
    onGoalReached: (() => void) | undefined,
    options: { runnerAddress: Address; poolId?: number },
  ) {
    this.onUpdate = onUpdate;
    this.onGoalReached = onGoalReached;
    // getAddress() normalizes to a correctly EIP-55-checksummed address — demo/mock
    // addresses elsewhere in the app aren't always checksummed, and viem's typed-data
    // signer rejects an `address` field that fails checksum validation outright.
    this.runnerAddress = getAddress(options.runnerAddress);
    this.poolId = options.poolId ?? 1;
    this.state = this.getInitialState();
  }

  private getInitialState(): LiveRunState {
    return {
      isActive: false,
      isPaused: false,
      elapsedSeconds: 0,
      distanceMeters: 0,
      currentPaceSecPerKm: 300, // 5:00 /km
      currentCadenceSpm: 0,
      currentCoord: [this.startLat, this.startLng],
      coordinates: [[this.startLat, this.startLng]],
      checkpoints: [],
      hasReachedGoal: false,
      ghostDeltaMeters: 0,
      usingRealGps: false,
      usingRealMotion: false,
    };
  }

  public start(targetGoalMeters?: number, useSimulation: boolean = true) {
    this.useSimulation = useSimulation;
    this.stepTimestamps = [];
    this.realMotionEventCount = 0;
    this.digestByIndex.clear();
    this.state = {
      ...this.getInitialState(),
      isActive: true,
      targetGoalMeters: targetGoalMeters && targetGoalMeters > 0 ? targetGoalMeters : undefined,
    };

    this.attachMotionListener();

    if (!useSimulation && typeof window !== "undefined" && navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        pos => this.handlePosition(pos.coords.latitude, pos.coords.longitude, true),
        err => console.warn("GPS watch failed, falling back to simulated motion:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    }

    // Index-0 checkpoint at the real (or simulated) starting position.
    void this.createCheckpoint(this.startLat, this.startLng);

    this.timer = setInterval(() => {
      if (this.state.isPaused || !this.state.isActive) return;
      this.tick();
    }, 1000);

    this.onUpdate({ ...this.state });
  }

  public pause() {
    this.state.isPaused = true;
    this.onUpdate({ ...this.state });
  }

  public resume() {
    this.state.isPaused = false;
    this.onUpdate({ ...this.state });
  }

  public stop(): LiveRunState {
    if (this.timer) clearInterval(this.timer);
    if (this.watchId !== null && typeof window !== "undefined") {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.detachMotionListener();
    this.state.isActive = false;
    this.onUpdate({ ...this.state });
    return { ...this.state };
  }

  private tick() {
    this.state.elapsedSeconds += 1;

    if (this.useSimulation) {
      const [lat, lng] = simulatedPosition(this.state.elapsedSeconds, this.startLat, this.startLng);
      this.handlePosition(lat, lng, false);
    }

    this.state.currentCadenceSpm = this.computeCadenceSpm();

    const ghostDistance = this.state.elapsedSeconds * (1000 / this.ghostPaceSecPerKm);
    this.state.ghostDeltaMeters = Math.round(this.state.distanceMeters - ghostDistance);

    if (
      this.state.targetGoalMeters &&
      this.state.distanceMeters >= this.state.targetGoalMeters &&
      !this.state.hasReachedGoal
    ) {
      this.state.hasReachedGoal = true;
      this.onGoalReached?.();
    }

    if (this.state.elapsedSeconds > 0 && this.state.elapsedSeconds % 10 === 0) {
      const [lat, lng] = this.state.currentCoord;
      void this.createCheckpoint(lat, lng);
    }

    this.onUpdate({ ...this.state });
  }

  /** Real GPS callback and the simulated-tick path both funnel through here, so
   * distance accounting and checkpointing behave identically regardless of source. */
  private handlePosition(lat: number, lng: number, isReal: boolean) {
    if (!this.state.isActive || this.state.isPaused) return;

    const [prevLat, prevLng] = this.state.currentCoord;
    const dLat = (lat - prevLat) * METERS_PER_DEGREE;
    const dLng = (lng - prevLng) * METERS_PER_DEGREE;
    const segmentMeters = Math.sqrt(dLat * dLat + dLng * dLng);
    // Ignore GPS noise jitter on the very first real fix (no prior point yet).
    if (this.state.coordinates.length > 1 || !isReal) {
      this.state.distanceMeters += segmentMeters;
    }

    this.state.currentCoord = [lat, lng];
    this.state.coordinates.push([lat, lng]);
    this.state.usingRealGps = this.state.usingRealGps || isReal;

    this.state.currentPaceSecPerKm =
      this.state.distanceMeters > 0
        ? Math.round((this.state.elapsedSeconds / this.state.distanceMeters) * 1000)
        : this.state.currentPaceSecPerKm;
  }

  /** Threshold-crossing peak detector over accelerometer magnitude — a real, if simple,
   * step counter. Falls back to a gentle simulated cadence ONLY when running in
   * simulation mode and no real motion events have arrived (e.g. testing on a desktop
   * browser with no accelerometer) — a real device always uses its real reading. */
  private attachMotionListener() {
    if (typeof window === "undefined" || typeof window.DeviceMotionEvent === "undefined") return;

    this.motionListener = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity ?? e.acceleration;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const delta = magnitude - this.lastMagnitude;
      const STEP_THRESHOLD = 1.2; // m/s^2 swing to count as a footstep

      if (delta > STEP_THRESHOLD && !this.risingEdge) {
        this.risingEdge = true;
        const now = Date.now();
        const lastStep = this.stepTimestamps[this.stepTimestamps.length - 1] ?? 0;
        if (now - lastStep > 250) {
          // 250ms floor = 240 spm ceiling, well above any real running cadence
          this.stepTimestamps.push(now);
          this.realMotionEventCount += 1;
          this.state.usingRealMotion = true;
        }
      } else if (delta < 0) {
        this.risingEdge = false;
      }
      this.lastMagnitude = magnitude;
    };

    window.addEventListener("devicemotion", this.motionListener);
  }

  private detachMotionListener() {
    if (this.motionListener && typeof window !== "undefined") {
      window.removeEventListener("devicemotion", this.motionListener);
    }
    this.motionListener = undefined;
  }

  private computeCadenceSpm(): number {
    const now = Date.now();
    this.stepTimestamps = this.stepTimestamps.filter(t => now - t < 8000);

    if (this.realMotionEventCount > 0) {
      if (this.stepTimestamps.length < 2) return 0;
      const windowSeconds = (now - this.stepTimestamps[0]) / 1000;
      return windowSeconds > 0 ? Math.round((this.stepTimestamps.length / windowSeconds) * 60) : 0;
    }

    // No real accelerometer data at all — only fake a number while explicitly in
    // simulation mode, so a real device with a genuinely silent accelerometer still
    // (correctly) reports 0 rather than a faked value.
    if (this.useSimulation) {
      return Math.round(168 + Math.sin(this.state.elapsedSeconds / 5) * 6);
    }
    return 0;
  }

  /** Builds, hashes (matching Stride.sol's hashCheckpoint exactly), and signs one
   * checkpoint with the device session key — genuinely verifiable, not a placeholder. */
  private async createCheckpoint(lat: number, lng: number) {
    if (this.checkpointInFlight) return;
    this.checkpointInFlight = true;
    try {
      const account = getSessionAccount();
      const index = this.state.checkpoints.length;
      const prevDigest = index > 0 ? (this.digestByIndex.get(index - 1) ?? zeroHash) : zeroHash;

      const message = {
        poolId: BigInt(this.poolId),
        runner: this.runnerAddress,
        index,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        lat: Math.round(lat * 1e6),
        lng: Math.round(lng * 1e6),
        cadenceSpm: this.state.currentCadenceSpm,
        prevHash: prevDigest,
      };

      const typedData = {
        domain: CHECKPOINT_DOMAIN,
        types: CHECKPOINT_TYPES,
        primaryType: "Checkpoint" as const,
        message,
      };

      const digest = hashTypedData(typedData);
      const signature = await account.signTypedData(typedData);

      this.digestByIndex.set(index, digest);
      const checkpoint: Checkpoint = {
        poolId: this.poolId,
        runner: this.runnerAddress,
        index,
        timestamp: Number(message.timestamp),
        lat: message.lat,
        lng: message.lng,
        cadenceSpm: message.cadenceSpm,
        prevHash: prevDigest,
        signature,
        digest,
      };
      this.state.checkpoints.push(checkpoint);
      this.onUpdate({ ...this.state });
    } catch (err) {
      // A signing/hashing failure shouldn't crash the whole run — log it and just skip
      // this one checkpoint; the next tick will try again.
      console.error("Stride: failed to sign checkpoint", err);
    } finally {
      this.checkpointInFlight = false;
    }
  }
}

export const formatPace = (secPerKm: number): string => {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm)) return "--:--";
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};
