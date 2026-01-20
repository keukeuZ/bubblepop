# Changelog

All notable changes to BubblePop will be documented in this file.

## [Unreleased]

### Added
- Initial project setup with React + Vite
- NES.css 8-bit theme integration (Press Start 2P font)
- Base blockchain configuration (wagmi + RainbowKit)
- Project documentation (plan1.md)
- Basic homepage layout with jackpot display placeholders
- Wallet connection button (RainbowKit)
- Dark 8-bit color scheme
- **BubblePop.sol** - Core lottery contract with:
  - Two jackpot pools (1 USDC / 10 USDC entry)
  - Entry tracking per player per round
  - 0.9% house fee on payouts
  - 1-hour grace period after jackpot payout
  - Chainlink VRF v2.5 integration for provably fair randomness
  - Escalating odds system (0.001% → 0.01% cap over 14 days, no guarantee)
  - `requestRandomWinner()` and VRF callback
- **MockUSDC.sol** - Test token for development
- **MockVRFCoordinator.sol** - VRF mock for testing
- Contract test suite (24 tests passing)
- Frontend wallet connection with:
  - RainbowKit integration
  - Network validation (Base Sepolia/Mainnet)
  - State-aware jackpot cards
  - Environment variable configuration
- Frontend jackpot display with:
  - Live contract data reading (wagmi hooks)
  - Pool stats (entries, win chance, status)
  - Last winner display
  - Auto-refresh every 10 seconds
- Frontend entry system with:
  - USDC balance checking
  - Approval flow (approve contract to spend USDC)
  - Entry transaction execution
  - Toast notification system (success/error/info/warning)
  - Loading states during transactions
  - Auto-refresh pool data after entry
- Frontend winner history with:
  - Real-time WinnerSelected event listening
  - Winner address, amount, and VRF request ID display
  - Block explorer verification links (Base Sepolia / Mainnet)
  - Pool badges (Small Pot / Big Pot)
  - "Provably fair" indicator with Chainlink VRF note
- Frontend grace period UI with:
  - Live countdown timer during grace period
  - Winner address and amount display
  - "Provably fair via Chainlink VRF" verification note
  - Conditional rendering (hides normal jackpot during grace period)
- Smart Contract donation system:
  - `donate(poolId, amount)` function - add USDC to jackpot
  - Current round donation tracking (resets on payout)
  - All-time donation tracking with timestamps (for yearly hall of fame)
  - `getTopDonorsCurrentRound()` - sorted by amount
  - `getTopDonorsYearly()` - last 365 days, sorted by amount
  - DonationReceived event for frontend listening
  - 8 new tests (32 total passing)

### Project Structure
```
bubblepop/
├── frontend/           # React + Vite app
│   └── src/
│       ├── components/ # React components
│       ├── config/     # wagmi/chain config
│       ├── hooks/      # Custom React hooks
│       ├── contracts/  # Contract ABIs
│       └── assets/     # Static assets
├── contracts/          # Solidity contracts
│   ├── src/           # Contract source
│   ├── test/          # Contract tests
│   └── script/        # Deployment scripts
├── plan1.md           # Project plan
├── CHANGELOG.md       # This file
└── claude             # Project rules
```

---

## Version History

*No releases yet*
