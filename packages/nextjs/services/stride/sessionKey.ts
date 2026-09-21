import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const STORAGE_KEY = "stride_session_key";

/**
 * A per-device signing key, generated once and reused for every run. This is what
 * signs each GPS checkpoint instantly on-device, with zero wallet popups mid-run —
 * matches the "gasless activity engine" promise already made in PermissionsSheet.tsx.
 * Pure local crypto (viem's LocalAccount) — no RPC, no network call, no wallet needed
 * to sign. Not yet registered on-chain via `registerDeviceKey()`; that's a deliberate
 * separate next step, not part of getting real signing working.
 */
export function getSessionAccount() {
  if (typeof window === "undefined") {
    throw new Error("Session key is only available in the browser");
  }
  let privateKey = localStorage.getItem(STORAGE_KEY) as `0x${string}` | null;
  if (!privateKey) {
    privateKey = generatePrivateKey();
    localStorage.setItem(STORAGE_KEY, privateKey);
  }
  return privateKeyToAccount(privateKey);
}

export function getSessionKeyAddress(): `0x${string}` {
  return getSessionAccount().address as `0x${string}`;
}
