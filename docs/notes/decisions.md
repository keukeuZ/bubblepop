# Architecture & Design Decisions

## Contract Architecture
- **Non-upgradeable contract**: Chosen for trust/transparency but means bugs require redeployment
- **Chainlink VRF v2.5**: Provably fair randomness, industry standard
- **Chainlink Automation**: Decentralized draw triggers via checkUpkeep/performUpkeep
- **Two-pool system**: Small Pool ($1) and Big Pool ($10) for different risk appetites
- **Escalating odds**: Time-based (not entry-based) escalation from 0.01% to 0.07% over 14 days
- **90-day forced draw**: Guarantees eventual winner, prevents infinite jackpot growth
- **Round ID system**: Elegant reset mechanism - incrementing roundId resets all per-round tracking without costly loops
- **Fee split**: 90% winner, 2.5% house, 7.5% rollover to next round

## Frontend Architecture
- **React 19 + Vite 7**: Modern, fast build tooling
- **wagmi v2 + viem**: Type-safe Ethereum interactions
- **RainbowKit**: Wallet connection UI
- **NES.css**: Retro pixel theme - core to brand identity
- **Web Audio API chiptune**: Procedural music generation, no audio file dependencies

## Legal Framing
- **AI Bot Disclaimer**: Users confirm they are "AI bots" - creative framing to position the dApp as a testing/entertainment tool for AI agents rather than gambling
- **"Provably Fair" emphasis**: Chainlink VRF provides verifiable randomness

## Deployment
- **Base blockchain**: Low fees, Coinbase ecosystem
- **Currently on Base Sepolia testnet**: Not yet mainnet
