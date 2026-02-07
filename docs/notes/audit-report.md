# BubblePop Full Project Audit Report

**Date:** 2026-02-07
**Audited by:** Squad (Jarvis, Shuri, Fury, Friday, Loki)
**Overall Health Score:** 6.5/10

---

## Executive Summary

BubblePop is a provably fair lottery dApp on Base blockchain with a retro 8-bit theme. The core contract logic is solid with good use of Chainlink VRF v2.5 and Automation, but there are **3 critical security issues**, **significant frontend bugs**, **dead code to remove**, and **missing production infrastructure**. The project is NOT mainnet-ready in its current state.

---

## CRITICAL Issues (Must Fix Before Mainnet)

### C1. `testDraw()` bypasses VRF entirely
**File:** `contracts/src/BubblePop.sol:1012-1023`
**Risk:** Owner can rig winners by calling testDraw() with a chosen seed.
**Fix:** Remove entirely, or gate behind a `testnet-only` flag that's permanently disabled on mainnet. The `let-me-win.js` script explicitly exploits this.

### C2. `performUpkeep()` has no access control
**File:** `contracts/src/BubblePop.sol:833-853`
**Risk:** Anyone can call performUpkeep() to trigger draws, potentially draining LINK from the VRF subscription.
**Fix:** Add `msg.sender == automation forwarder || msg.sender == owner()` check, or validate the `performData` payload.

### C3. WinnerHistory hardcodes BASE_SEPOLIA chain ID
**File:** `frontend/src/components/WinnerHistory.jsx:22`
**Risk:** Winner history will show nothing on mainnet.
**Fix:** Use dynamic chain ID from wagmi's `useChainId()` hook.

### C4. WalletConnect "demo" project ID
**File:** `frontend/src/config/wagmi.js:6` and `frontend/.env`
**Risk:** Will be rate-limited or blocked in production.
**Fix:** Register a real project ID at cloud.walletconnect.com.

---

## HIGH Priority Issues

### H1. VRF callback gas limit too low (200,000)
**File:** `contracts/src/BubblePop.sol` (CALLBACK_GAS_LIMIT constant)
**Risk:** If pool has many entries, `fulfillRandomWords()` may run out of gas, locking the pool in pending state.
**Fix:** Increase to 500,000+ or make configurable.

### H2. Unbounded `poolEntries` array
**File:** `contracts/src/BubblePop.sol`
**Risk:** DoS on VRF callback if array grows too large. Winner selection iterates the full array.
**Fix:** Cap max entries per round, or restructure winner selection.

### H3. No pause mechanism
**Risk:** No way to halt the contract in an emergency.
**Fix:** Add OpenZeppelin Pausable.

### H4. Stale allowance after approval
**File:** `frontend/src/hooks/useEntry.js`
**Risk:** After approving USDC, the allowance state doesn't refresh, so the "Enter" button may not enable.
**Fix:** Refetch allowance after successful approval tx confirmation.

### H5. Approval doesn't auto-trigger entry
**File:** `frontend/src/components/JackpotCard.jsx:110`
**Risk:** User must manually click "Enter" after approval completes - confusing UX.
**Fix:** Chain the entry transaction after approval confirmation.

### H6. Missing useEffect dependency arrays (8 instances)
**File:** `frontend/src/components/JackpotCard.jsx:108-185`
**Risk:** Stale closures, infinite re-renders, or missed updates.
**Fix:** Add proper dependency arrays to all useEffect hooks.

### H7. No win/loss detection after entry
**Risk:** User enters the pool but gets no feedback on whether they won.
**Fix:** Listen for `WinnerSelected` / round change events and show result.

### H8. No chain-specific contract addresses
**File:** `frontend/src/config/wagmi.js:39-42`
**Risk:** Same contract address used regardless of connected chain.
**Fix:** Map contract addresses per chain ID.

---

## MEDIUM Priority Issues

### M1. `_cleanupOldDonations()` unbounded gas cost
**File:** `contracts/src/BubblePop.sol:525-544`
**Risk:** Gas spike if many old donations accumulate.

### M2. Bubble sort in view functions
**File:** `contracts/src/BubblePop.sol`
**Risk:** O(n^2) gas cost for sorting sponsor boards.

### M3. `lastAutomationDrawTime` not updated for forced draws
**Risk:** Automation may re-trigger draws prematurely after manual draws.

### M4. Missing `NewRoundStarted` event on grace period auto-end
**Risk:** Frontend may miss round transitions.

### M5. `emergencyResetVRF` leaves stale `vrfRequests` entry
**File:** `contracts/src/BubblePop.sol:997-1004`
**Risk:** Mapping entry for old request ID remains, could cause confusion.

### M6. Entry.blockNumber stored but never used
**Risk:** Wasted storage gas (20,000 gas per entry).

### M7. Comment on line 559 says "0.01% cap" but should say "0.07% cap"
**Risk:** Developer confusion.

### M8. Toast ID collision risk
**File:** `frontend/src/components/Toast.jsx`
**Risk:** `Date.now()` can collide if two toasts created same millisecond.

### M9. Broken async in `approveMax()`
**File:** `frontend/src/hooks/useEntry.js`
**Risk:** `writeContract` doesn't return a promise, so `.then()` chain fails.

### M10. LiveEntries uses `Date.now()` instead of block timestamps
**File:** `frontend/src/components/LiveEntries.jsx:161,174,185,196`
**Risk:** Inaccurate timestamps.

### M11. `formatWinChance` returns misleading '0.001%' fallback
**File:** `frontend/src/hooks/useContract.js:29`
**Risk:** Shows odds when there are none.

---

## LOW Priority Issues

- `isRoundExpired` may false-positive on fresh deployment
- `useENS.js` uses deprecated `enabled` option syntax (should be inside `query` object in wagmi v2)
- `formatAddressOrENS` exported but never imported
- Music auto-starts on first interaction (should wait for AI bot disclaimer)
- Mute preference not persisted to localStorage
- ASCIIBackground: no `prefers-reduced-motion` support
- ASCIIBackground: `setInterval` dependency on `[nextId]` causes teardown/recreation every 1.5s
- "Verification Period" label is misleading - should be "Cooldown Period"
- No etherscan/Basescan API key for contract verification in hardhat.config.js

---

## Dead Code to Remove

| Item | Location | Notes |
|------|----------|-------|
| Duplicate `formatUSDC` | `WinnerHistory.jsx:9-13` | Use the one from `useContract.js` |
| Duplicate approval hook | `useDonation.js` (`useApproveDonation`) | Identical to `useApproveUSDC` in `useEntry.js` |
| `parseContractError` | `ErrorBoundary.jsx:63-98` | Exported but never used |
| Unused CSS classes | `App.css` | `.skeleton`, `.loading-pulse`, `.pixel-border` |
| Inline event ABIs | `WinnerHistory.jsx`, `LiveEntries.jsx` | Should import from `BubblePopABI.js` |
| `Entry.blockNumber` | `BubblePop.sol` | Stored but never read |
| `let-me-win.js` | `contracts/scripts/` | Exploit script, must not exist on mainnet |
| `test-draw.js` | `contracts/scripts/` | Uses testDraw(), dev-only |
| `verify-setup.js` | `contracts/scripts/` | Hardcoded stale addresses |

---

## Legacy / Dev Artifacts to Remove from Git

These files are in `.gitignore` but still tracked (need `git rm --cached`):

- `MAINNET_CHECKLIST.md`
- `plan1.md` (if exists)
- `test-questions.md` (if exists)
- `.claude/` directory files

---

## Missing Production Infrastructure

1. No CI/CD pipeline
2. No frontend tests
3. No error monitoring (Sentry, etc.)
4. No analytics
5. No LICENSE file (but FAQ says "Open Source")
6. Placeholder social links (twitter.com/bubblepop, discord.gg/bubblepop)
7. Meta description says "lottery" / "win the jackpot" - contradicts AI bot framing
8. No Gnosis Safe multisig for owner operations
9. Contract not verified on Basescan
10. No subgraph or indexer for historical data

---

## Content & UX Findings

### PROJECT_NOTES.md Inaccuracies
- Line 42: "10% fee on wins" should say "2.5% house fee + 7.5% rollover to next round"
- Line 44: "odds increase 1% per entry" is wrong - odds escalate over TIME (0.01% to 0.07% over 14 days)

### AI Bot Disclaimer (New Feature - Not Yet Implemented)
**Requirement:** Full-page popup overlay on first visit. User must check a box stating "I swear that I am an AI bot" before accessing the site.
**Design:** NES.css styled dialog, stored in localStorage, blocks all interaction until accepted.
**Details:** See implementation section below.

### Fun Factor Assessment
- Retro 8-bit theme is cohesive and charming
- Chiptune music is unique and well-implemented
- ASCII bubble animation adds atmosphere
- Missing: win celebration animation, sound effects for entries, leaderboard
- Missing: entry confirmation feedback, live jackpot growth animation

---

## CLAUDE.md Global Rules Cross-Reference

### Rule 1: Project Structure
**Status: NON-COMPLIANT**
The project does NOT follow the prescribed fullstack structure from CLAUDE.md:
- No `backend/` directory (this is acceptable - it's a dApp with on-chain backend)
- `frontend/` structure partially matches but lacks: `routes/`, `services/`, `context/`, `store/`
- No `shared/` directory
- No root `package.json` with concurrently scripts
- No `docker-compose.yml`
- **Verdict:** The prescribed structure is for traditional fullstack apps. A dApp has a different architecture (contracts replace backend). Consider creating a dApp-specific structure rule.

### Rule 2: Requirements Gathering Through Interview
**Status: PARTIALLY FOLLOWED**
- The AI bot disclaimer solution was discussed but not formally spec'd
- No `docs/` spec file was created before implementation began
- **Action:** Create spec files for remaining features before implementing

### Rule 3: Parallel Work with Git Worktrees
**Status: NOT APPLICABLE** (single developer, single session)

### Rule 4: Plan Mode Strategies
**Status: SHOULD BE USED**
- The phased implementation plan should be executed via Plan Mode
- Each phase should be planned before implementation

### Rule 5: Maintain CLAUDE.md / docs/notes/
**Status: NOW BEING ADDRESSED**
- `docs/notes/` directory just created
- This audit report is the first entry
- **Action:** Create `decisions.md`, `learnings.md`, `context.md`

### Rule 6: Custom Skills
**Status: NOT APPLICABLE YET**

### Rule 7: Autonomous Bug Fixing
**Status: APPLICABLE**
- Many of the identified bugs can be fixed autonomously

### Rule 8: Advanced Prompting
**Status: APPLICABLE**
- Should use "prove it works" approach after fixes

### Rule 9: Terminal & Environment
**Status: NOT APPLICABLE** (user's environment)

### Rule 10: Use Subagents
**Status: FOLLOWED**
- Full squad deployed for this audit

### Rule 11: Data & Analytics
**Status: NOT APPLICABLE** (no database)

### Rule 12: Learning with Claude
**Status: APPLICABLE**
- Could generate architecture diagrams of the contract

### Rule 13: Autonomous Work Rules
**Status: SHOULD FOLLOW**
- Update `docs/notes/` after major changes (doing now)
- Start/restart services autonomously
- Never explain how to do something - just do it

---

## Recommended Implementation Phases

### Phase 1: Critical Security (IMMEDIATE)
1. Remove or disable `testDraw()` + related scripts
2. Add access control to `performUpkeep()`
3. Add Pausable
4. Increase VRF callback gas limit
5. Cap pool entries per round

### Phase 2: AI Bot Disclaimer + Legal Framing
1. Implement full-page disclaimer popup
2. Update meta description
3. Update FAQ for bot framing
4. Fix "Open Source" claim (add LICENSE or remove badge)

### Phase 3: Frontend Bug Fixes
1. Fix WinnerHistory chain ID hardcoding
2. Fix WalletConnect project ID
3. Fix useEffect dependency arrays
4. Fix approval → entry flow
5. Add chain-specific contract addresses
6. Fix allowance refresh

### Phase 4: Code Cleanup
1. Remove all dead code (see table above)
2. Consolidate duplicate hooks
3. Import event ABIs from canonical source
4. Remove unused CSS
5. Fix PROJECT_NOTES.md inaccuracies
6. `git rm --cached` tracked-but-ignored files

### Phase 5: UX Enhancements
1. Win/loss detection and celebration
2. Music deferred until after disclaimer
3. Mute preference persistence
4. "Cooldown Period" label fix
5. Reduced motion support

### Phase 6: Production Readiness
1. Real WalletConnect project ID
2. Contract verification on Basescan
3. CI/CD pipeline
4. Error monitoring
5. Frontend tests
6. Gnosis Safe multisig setup
