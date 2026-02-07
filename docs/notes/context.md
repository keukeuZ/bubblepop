# Project Context

## What is BubblePop?
A provably fair lottery dApp on Base blockchain with a retro 8-bit pixel art theme. Users pay USDC to enter pools, Chainlink VRF selects winners randomly, and Chainlink Automation triggers draws periodically.

## Current State (2026-02-07)
- **Network:** Base Sepolia testnet
- **Contract:** 0x03c698e2162847E81A84614F7F4d6A10853Df3Db
- **Mock USDC:** 0xBB565fDeb1C4d6e9A3478dC5c128F9FC33133B8d
- **Status:** Full audit completed, 6-phase improvement plan created
- **Health Score:** 6.5/10
- **Mainnet Ready:** No - critical security issues identified

## Key Contract Constants
- SMALL_POOL_ENTRY: 1 USDC (1e6)
- BIG_POOL_ENTRY: 10 USDC (10e6)
- HOUSE_FEE_BPS: 250 (2.5%)
- ROLLOVER_BPS: 750 (7.5%)
- BASE_WIN_CHANCE: 100 (0.01%)
- MAX_WIN_CHANCE: 700 (0.07%)
- ESCALATION_PERIOD: 14 days
- FORCE_DRAW_INTERVAL: 90 days
- GRACE_PERIOD: 15 minutes

## Tech Stack
- Solidity ^0.8.19 + Hardhat
- React 19 + Vite 7
- wagmi v2 + viem + RainbowKit
- Chainlink VRF v2.5 + Automation
- NES.css (retro theme)
- Web Audio API (chiptune music)

## Next Steps
1. Fix critical security issues (Phase 1)
2. Implement AI bot disclaimer popup (Phase 2)
3. Fix frontend bugs (Phase 3)
4. Clean up dead code (Phase 4)
5. UX enhancements (Phase 5)
6. Production readiness (Phase 6)

See `audit-report.md` for full details.
