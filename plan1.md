# BubblePop - Lottery Style Homepage

## Project Overview
A simple, fun lottery-style homepage with 8-bit theme. Two simultaneous jackpots on Base blockchain.

---

## Technical Stack (Proposed)
- **Blockchain**: Base (Ethereum L2)
- **Token**: USDC (ERC-20)
- **Randomness**: Chainlink VRF (Verifiable Random Function) - provably fair
- **Frontend**: React + Vite (fast, simple) with NES.css (8-bit styling library)
- **Wallet Connection**: RainbowKit + wagmi (best Base support)
- **Smart Contracts**: Solidity with OpenZeppelin

---

## Game Mechanics

### Two Jackpots (Run Simultaneously)
| Jackpot | Entry Price | Currency |
|---------|-------------|----------|
| Small   | 1 USDC      | ERC-20   |
| Large   | 10 USDC     | ERC-20   |

### Rules
1. Pay entry fee → join the pool
2. Win entire pot OR win nothing
3. Winner randomly selected (Chainlink VRF)
4. Instant payout to winner's address
5. 1-hour grace period after payout for verification
6. Verification/proof displayed on page for trust

### Jackpot Guarantee System
- Jackpot must go out at least once per week
- Win probability gradually increases as week progresses
- Resets after payout

### Anti-Abuse Measures
- No same-block wins (prevent MEV/manipulation)
- Chainlink VRF for tamper-proof randomness
- Transparent verification on-page

---

## Phases
1. **Test Build** - Full functionality on Base Sepolia testnet
2. **Production** - Live deployment after thorough testing
3. **Marketing** - X ads and other platforms

---

## Changes (Proposed)

### Phase 1: Foundation
1. **Project setup** - Initialize React + Vite project with NES.css 8-bit theme [DONE]
2. **Smart Contract: Lottery Core** - Solidity contract for jackpot logic, entries, payouts [DONE]
3. **Smart Contract: VRF Integration** - Chainlink VRF for provably fair random selection [DONE]
4. **Smart Contract: USDC Integration** - ERC-20 deposit/withdrawal handling [DONE - included in #2]
5. **Frontend: Wallet Connection** - RainbowKit setup for Base network [DONE]

### Phase 2: Core Features
6. **Frontend: Jackpot Display** - Show both jackpots, current amounts, entries [DONE]
7. **Frontend: Entry System** - UI for buying tickets (1 USDC / 10 USDC) [DONE]
8. **Frontend: Winner History** - Display recent winners and verification proofs [DONE]
9. **Frontend: Grace Period UI** - Countdown timer, winner display during grace period [DONE]
10. **Smart Contract: Escalating Odds** - Already in contract (0.001% → 0.01% over 14 days) [DONE]
11. **Smart Contract: House Fee** - Already in contract (0.9% on payouts) [DONE]

### Phase 2B: Donation Feature
12. **Smart Contract: Donations** - Accept donations, track amounts per address [DONE]
13. **Frontend: Donation Button** - UI for making donations
14. **Frontend: Sponsor Board** - Current round top 10/20 + yearly top 3 hall of fame

### Phase 3: Polish & Security
15. **Anti-abuse implementation** - Block-level protection
16. **Testing on Base Sepolia** - Full testnet deployment and testing
17. **Security review** - Code audit checklist
18. **Production deployment** - Mainnet launch

### Phase 4: Marketing
19. **X ads campaign** - Promotional content and ads
20. **Additional marketing channels** - TBD

---

## Confirmed Details
- **House fee**: 0.9% of jackpot (taken at payout)
- **Max jackpot cap**: None (unlimited growth)

## Donation Feature (Sponsor Board)
- Donation button on homepage
- **Current Round Board**: Top 10/20 donors - resets when jackpot pays out
- **Yearly Hall of Fame**: Top 3 donors on 365-day rolling basis
- Acts as visibility/advertising for donors (people or companies)

## Open Questions for Discussion
- Exact escalating odds formula (discuss later as mentioned)
- Same-block protection specifics (discuss later as mentioned)
- Multiple winners scenario details ("more about this later")

---

## Production Checklist (Before Going Live)

### Accounts to Create
- [ ] **Alchemy or QuickNode** - RPC provider for Base mainnet
- [ ] **Vercel or Netlify** - Frontend hosting
- [ ] **Domain registrar** - Website URL

### Tokens/Funds Needed
- [ ] **ETH on Base** - For gas and contract deployment
- [ ] **LINK tokens on Base** - Fund Chainlink VRF subscription
- [ ] **USDC** - Initial liquidity (if seeding jackpot)

### Chainlink VRF Setup
- [ ] Create VRF subscription at vrf.chain.link
- [ ] Fund subscription with LINK
- [ ] Add deployed contract as consumer

*This checklist will be addressed in Phase 3 (Changes 16-18)*

---

## Status
**Change #12 COMPLETE - Ready for Change #13 (Donation Button)**
