# Stride ⚡

Stake MON with your friends on a shared fitness goal. Your phone's GPS and motion
sensors sign proof of every step in the background — no manual logging, no trusting
an honor system. Whoever hits the goal splits the stakes of whoever doesn't.

Built for the **Monad Metropolis** hackathon (Trust, Identity & AI Infrastructure track).

## Why

"Stake on a fitness goal with friends" isn't a new idea — a few other projects have
tried it. What none of them shipped is proof that survives someone actually trying to
cheat: a GPS trace alone is trivial to fake. Stride signs a checkpoint every ~10
seconds with a disposable device key (GPS + motion-sensor cadence together), chains
each one to the last, and lets **anyone** — not just other participants — dispute a
submission by presenting checkpoints that don't add up: a broken hash chain, an
impossible speed, or GPS movement with zero footstep rhythm to back it up. Confirmed
cheaters lose their entire stake; the disputer who caught them gets a bounty.

## How it works

1. **Stake with your group.** Anyone can create a pool: pick a distance goal and a
   stake amount. Friends join with the matching stake before the window closes.
2. **Run — your phone proves it.** Start tracking, and every joined pool gets its own
   independently signed checkpoint chain from the same real GPS/motion data,
   automatically — no picking which pool a run counts toward.
3. **Submit and settle.** Hit the goal, submit your signed proof onchain, and pull your
   share of the pot once the dispute window closes. No admin key, no pause button —
   funds only move when a participant calls `withdraw()` themselves.

## Architecture

- **Contract** (`packages/foundry/contracts/Stride.sol`) — pool lifecycle
  (`createPool`/`joinPool`/`submitActivity`/`finalize`/`withdraw`), EIP-712 typed
  checkpoint signatures, and a permissionless dispute system (`dispute`,
  `disputeAggregateDistance`) with four checkable violation types. 35 Foundry tests,
  Slither-clean, three independent hardening rounds.
- **Frontend** (`packages/nextjs`) — Scaffold-ETH 2 (Next.js App Router, RainbowKit,
  Wagmi, Viem). Real `navigator.geolocation` + `devicemotion` capture, EIP-712 signing
  with a disposable per-device session key (gasless — no wallet popup mid-run), and a
  server-side route that pins the signed checkpoint chain to IPFS (with a privacy trim
  on the first/last 10% of each run before anything goes public).

**Deployed on Monad testnet (chain 10143):**
[`0xb9dC7Fb5c9eC478481891C3E1D677A2C751b9833`](https://testnet.monadvision.com/address/0xb9dC7Fb5c9eC478481891C3E1D677A2C751b9833)

## Tech stack

Foundry (`via_ir`, OpenZeppelin `ReentrancyGuard`/`EIP712`/`ECDSA`) · Next.js · RainbowKit
· Wagmi · Viem · Tailwind/DaisyUI · Monad testnet

## Running locally

```bash
yarn install

# one-time: import the well-known public anvil test key
cd packages/foundry
cast wallet import --private-key 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 \
  --unsafe-password 'localhost' scaffold-eth-default

# terminal 1 — local chain
cd packages/foundry
anvil

# terminal 2 — deploy + generate ABIs
cd packages/foundry
forge script script/Deploy.s.sol --rpc-url localhost --account scaffold-eth-default \
  --password localhost --broadcast --ffi
node scripts-js/generateTsAbis.js

# terminal 3 — frontend
cd packages/nextjs
yarn dev
```

Visit `http://localhost:3000`. Run the contract test suite with `cd packages/foundry && forge test`.
