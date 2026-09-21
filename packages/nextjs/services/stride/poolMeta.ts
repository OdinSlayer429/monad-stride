// Cosmetic, off-chain pool metadata (currently just the display title). The
// Stride contract itself has no string/title field on Pool — only numbers and
// deadlines — so a human-readable title is saved locally by whoever creates a
// pool. Anyone opening that pool from a different browser (no matching local
// entry) sees a numeric fallback (`pool #<id>`) instead — a known limitation,
// not a bug: fixing it for real means relaying the title somewhere shared
// (an event field, an off-chain index), which is out of scope for the hackathon.
const STORAGE_KEY = "stride_pool_meta_v1";

type PoolMeta = Record<string, { title: string }>;

function readAll(): PoolMeta {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getPoolTitle(poolId: string): string | undefined {
  return readAll()[poolId]?.title;
}

export function setPoolTitle(poolId: string, title: string): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[poolId] = { title };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
