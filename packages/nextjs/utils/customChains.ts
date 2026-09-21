import { defineChain } from "viem";

// viem/chains doesn't ship a Monad Testnet definition (verified — checked the published
// package, no `monadTestnet` export as of this writing), so it's defined manually here.
// RE-VERIFIED 2026-09-11: the testnet was reset from genesis on Dec 16 2025 and the
// previous rpc.testnet.monad.xyz / explorer.testnet.monad.xyz domains no longer resolve
// at all — confirmed dead via direct RPC call, not assumed. Updated to the current
// endpoints per https://docs.monad.xyz/developer-essentials/testnet and
// https://docs.monad.xyz/official-links. Chain ID unchanged. Don't hand-edit again
// without re-checking those docs — this has already moved once this season.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadvision.com" },
  },
  testnet: true,
});
