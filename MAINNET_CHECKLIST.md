# BubblePop Mainnet Launch Checklist

## Contract Changes

- [ ] **Remove `testDraw()` function** - This bypasses VRF and must be removed for production
- [ ] **Consider professional security audit** - Optional but recommended for a lottery handling real money
  - Suggested firms: OpenZeppelin, Trail of Bits, Consensys Diligence, Sherlock, Code4rena

## Deployment

- [ ] **Deploy to Base Mainnet**
  - Update `contracts/scripts/deploy.js` with mainnet VRF coordinator
  - Base Mainnet VRF Coordinator: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`
  - Use real USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

- [ ] **Verify contract on Basescan**
  - Get Basescan API key
  - Add to hardhat.config.js

## Chainlink VRF Setup (Mainnet)

- [ ] **Create VRF subscription** at https://vrf.chain.link/base
- [ ] **Fund subscription with LINK**
  - Estimated: 5-10 LINK to start (each request ~0.1-0.5 LINK)
  - LINK on Base: `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196`
- [ ] **Add deployed contract as consumer**
- [ ] **Verify key hash** for Base Mainnet

## Chainlink Automation Setup (Mainnet)

- [ ] **Register upkeep** at https://automation.chain.link/base
- [ ] **Fund upkeep with LINK**
  - Estimated: 10-20 LINK to start
  - Draws every 4 hours = ~6 draws/day
- [ ] **Set appropriate gas limit** (500,000 recommended)

## Frontend Updates

- [ ] **Update contract addresses** in `frontend/.env`
- [ ] **Update chain configuration** to use Base Mainnet
- [ ] **Test all functionality** on mainnet

## Hosting Recommendations

### Frontend Hosting
| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Vercel** (Recommended) | Easy deploy, great DX, auto SSL, CDN | Limited free tier | Free tier / $20/mo |
| **Netlify** | Similar to Vercel, good for static | Slightly slower builds | Free tier / $19/mo |
| **Cloudflare Pages** | Fastest CDN, unlimited bandwidth | Less intuitive | Free |
| **AWS Amplify** | Full AWS integration | More complex setup | Pay per use |
| **IPFS + ENS** | Fully decentralized | Slower, technical setup | ~$5/yr for ENS |

### Domain & DNS
| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Cloudflare** (Recommended) | Free DNS, DDoS protection, fast | None | Free |
| **Namecheap** | Cheap domains | Basic DNS | $10-15/yr domain |
| **ENS** | Web3 native (.eth) | Not all browsers support | ~$5/yr |

### RPC Providers (for frontend)
| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Alchemy** (Recommended) | Reliable, good free tier | Rate limits on free | Free tier / $49/mo |
| **Infura** | Established, reliable | Owned by Consensys | Free tier / $50/mo |
| **QuickNode** | Fast, good support | Pricier | $9/mo+ |
| **Ankr** | Cheap, decentralized | Less reliable | Free tier / $5/mo |
| **Public RPCs** | Free | Rate limited, less reliable | Free |

### Monitoring & Analytics
| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Tenderly** (Recommended) | Contract monitoring, alerts, debugging | Learning curve | Free tier / $50/mo |
| **OpenZeppelin Defender** | Automated responses, monitoring | Expensive | $100/mo+ |
| **Dune Analytics** | Great dashboards | Query-based | Free tier |
| **Google Analytics** | Standard web analytics | Not web3 specific | Free |

### Error Tracking
| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Sentry** (Recommended) | Great error tracking, source maps | Can be noisy | Free tier / $26/mo |
| **LogRocket** | Session replay | Heavy | $99/mo+ |
| **Bugsnag** | Good JS support | Pricier | $59/mo+ |

## Legal Considerations

- [ ] **Terms of Service** - Define rules, disclaimers, jurisdiction
- [ ] **Privacy Policy** - Required for most hosting
- [ ] **Gambling regulations** - Check legality in target jurisdictions
  - Consider geo-blocking restricted countries
  - Some jurisdictions require licenses
- [ ] **Age verification** - May be required (18+/21+)

## Security Checklist

- [ ] **Admin keys secured** - Use hardware wallet for owner account
- [ ] **Consider multisig** - For admin functions (Gnosis Safe)
- [ ] **Test emergency functions** - Ensure `emergencyResetVRF` works
- [ ] **Monitor for exploits** - Set up Tenderly alerts

## Launch Strategy

- [ ] **Soft launch** - Start with low limits, monitor closely
- [ ] **Seed initial jackpot** - Consider donating to make it attractive
- [ ] **Marketing** - Social media, crypto communities
- [ ] **Documentation** - How to play guide

---

## Current Testnet Deployment

| Item | Address |
|------|---------|
| BubblePop | `0x03c698e2162847E81A84614F7F4d6A10853Df3Db` |
| MockUSDC | `0xBB565fDeb1C4d6e9A3478dC5c128F9FC33133B8d` |
| Network | Base Sepolia (Chain ID: 84532) |
| VRF Subscription | Active, 20 LINK funded |
| Automation | Active, 4-hour intervals |

---

*Last updated: 2026-01-25*
