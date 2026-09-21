import { Checkpoint } from "~~/types/stride";

// Mirrors Stride.sol's constants exactly — see contracts/Stride.sol for the reasoning
// behind each threshold. Using BigInt throughout: the squared-distance comparison the
// contract does (to avoid needing sqrt/trig onchain) produces values well past
// Number.MAX_SAFE_INTEGER, so this has to match Solidity's exact integer math, not
// floating point.
const METERS_PER_DEGREE = 111_320n;
const MAX_LAT = 90_000_000n;
const MAX_LNG = 180_000_000n;
const MAX_SPEED_MPS = 12n;
const MIN_SPEED_FOR_MOTION_MPS = 6n;

export type ViolationType = "HashChainBroken" | "InvalidCoordinates" | "SpeedImpossible" | "MotionMismatch";

// Stride.sol's ViolationType enum order — what dispute() expects as the uint8 arg.
export const VIOLATION_TYPE_INDEX: Record<ViolationType, number> = {
  HashChainBroken: 0,
  InvalidCoordinates: 1,
  SpeedImpossible: 2,
  MotionMismatch: 3,
};

function outOfBounds(c: Checkpoint): boolean {
  const lat = BigInt(c.lat);
  const lng = BigInt(c.lng);
  return lat > MAX_LAT || lat < -MAX_LAT || lng > MAX_LNG || lng < -MAX_LNG;
}

function impliedSpeedExceeds(a: Checkpoint, b: Checkpoint, dt: bigint, speedThresholdMps: bigint): boolean {
  const dLat = BigInt(b.lat) - BigInt(a.lat);
  const dLng = BigInt(b.lng) - BigInt(a.lng);
  const rawDistSq = dLat * dLat + dLng * dLng;
  const lhs = rawDistSq * METERS_PER_DEGREE * METERS_PER_DEGREE;
  const maxDist = speedThresholdMps * dt;
  const rhs = maxDist * maxDist * 1_000_000_000_000n; // 1e12, matches the contract's own scaling
  return lhs > rhs;
}

function checkViolation(a: Checkpoint, b: Checkpoint, digestA: string, violationType: ViolationType): boolean {
  if (violationType === "HashChainBroken") {
    return b.prevHash.toLowerCase() !== digestA.toLowerCase();
  }
  if (violationType === "InvalidCoordinates") {
    return outOfBounds(a) || outOfBounds(b);
  }
  const dt = BigInt(b.timestamp) - BigInt(a.timestamp);
  if (violationType === "SpeedImpossible") {
    return impliedSpeedExceeds(a, b, dt, MAX_SPEED_MPS);
  }
  // MotionMismatch — zero cadence at both ends, but GPS implies real movement.
  const noMotion = a.cadenceSpm === 0 && b.cadenceSpm === 0;
  return noMotion && impliedSpeedExceeds(a, b, dt, MIN_SPEED_FOR_MOTION_MPS);
}

function describeViolation(type: ViolationType, dtSeconds: number): string {
  switch (type) {
    case "HashChainBroken":
      return "This checkpoint's prevHash doesn't match the real digest of the one before it — the chain was edited after signing.";
    case "InvalidCoordinates":
      return "One of these checkpoints has a lat/lng outside valid Earth bounds.";
    case "SpeedImpossible":
      return `Implied speed between these two checkpoints (${dtSeconds}s apart) exceeds 12 m/s — faster than any human can run.`;
    case "MotionMismatch":
      return "GPS shows real movement here, but the phone's own motion sensor recorded zero footstep rhythm at both ends — the classic signature of a GPS-only spoofing tool.";
  }
}

export interface ViolatingPair {
  a: Checkpoint;
  b: Checkpoint;
  violationType: ViolationType;
  details: string;
}

/**
 * Scans adjacent, index-contiguous checkpoint pairs for the first real violation,
 * running the exact same checks Stride.sol's dispute() would run onchain — so a
 * violation found here is guaranteed to actually pass onchain, not just look
 * suspicious. Only works on pairs where both checkpoints carry a real signature and
 * digest (i.e. were actually captured by GPSEngine, not hand-edited test data).
 */
export function findViolatingPair(checkpoints: Checkpoint[]): ViolatingPair | null {
  const order: ViolationType[] = ["HashChainBroken", "InvalidCoordinates", "SpeedImpossible", "MotionMismatch"];
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    if (!a.digest || !a.signature || !b.signature) continue;
    if (b.index !== a.index + 1) continue; // dispute() requires b.index === a.index + 1
    for (const violationType of order) {
      if (checkViolation(a, b, a.digest, violationType)) {
        const dtSeconds = Number(BigInt(b.timestamp) - BigInt(a.timestamp));
        return { a, b, violationType, details: describeViolation(violationType, dtSeconds) };
      }
    }
  }
  return null;
}
