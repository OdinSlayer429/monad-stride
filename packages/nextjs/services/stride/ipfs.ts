import { Checkpoint } from "~~/types/stride";

/**
 * Drops the first and last 10% of a run's checkpoints (by portion of the route, not a
 * fixed radius) before anything gets pinned publicly — mitigates the realistic worst
 * privacy risk (inferring someone's home address from where a run starts/ends) without
 * touching the honest middle-of-run data most disputes actually rely on. Decided
 * Sept 21 2026, see stride/CLAUDE.md's "Privacy decision" section. Deliberately only
 * affects the PUBLIC IPFS copy — the real onchain commitHash/checkpointCount/
 * distanceMeters (used by submitActivity and every dispute path) are always computed
 * from the full, untrimmed chain in PostRunModal, never from this trimmed view.
 */
function trimForPublicPin(checkpoints: Checkpoint[]): Checkpoint[] {
  const trimCount = Math.ceil(checkpoints.length * 0.1);
  if (checkpoints.length - trimCount * 2 < 1) return checkpoints; // too short to trim meaningfully
  return checkpoints.slice(trimCount, checkpoints.length - trimCount);
}

/**
 * Pins a run's signed checkpoint chain to IPFS via the server-side /api/pin-checkpoints
 * route (see that route for why this isn't called against Pinata directly from the
 * browser). The first/last 10% of checkpoints are trimmed before pinning (see
 * trimForPublicPin above) — this is what actually makes the route "public," so that's
 * where the privacy mitigation applies. Returns the CID on success, or null if pinning
 * isn't configured/failed — callers should treat null as "submit without a CID for
 * now," not a hard failure: a dispute checks the onchain commitHash/signatures, never
 * ipfsCID.
 */
export async function pinCheckpoints(
  poolId: string,
  runner: string,
  checkpoints: Checkpoint[],
): Promise<string | null> {
  try {
    const res = await fetch("/api/pin-checkpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolId, runner, checkpoints: trimForPublicPin(checkpoints) }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("Stride: IPFS pin skipped —", body.error ?? res.statusText);
      return null;
    }

    const data = (await res.json()) as { cid: string };
    return data.cid;
  } catch (err) {
    console.warn("Stride: IPFS pin failed, submitting without a CID", err);
    return null;
  }
}
