# Change #5: Frontend - Wallet Connection

## Prompt
```
Complete the wallet connection setup for the BubblePop frontend:
- Ensure RainbowKit ConnectButton works properly
- Add WalletConnect project ID configuration
- Display connected wallet address
- Show network status (Base Sepolia for testing)
- Add network switching if on wrong chain
- Handle connection states (connecting, connected, disconnected)
- Style wallet button to match 8-bit theme
```

## Prerequisites
- Change #1 complete (React + Vite + RainbowKit setup)
- WalletConnect Project ID (get from cloud.walletconnect.com)

## Files Modified
- frontend/src/config/wagmi.js - Add project ID
- frontend/src/App.jsx - Improve wallet integration
- frontend/src/App.css - Style wallet button

## Files Created
- frontend/src/components/WalletStatus.jsx - Wallet status component
- frontend/.env.example - Environment variables template

## Commands
```bash
cd frontend
npm run dev
# Connect wallet at http://localhost:5173
```

## Verification
1. Start dev server: `npm run dev`
2. Click "Connect Wallet" button
3. Connect with MetaMask or WalletConnect
4. Verify wallet address displays
5. Verify network shows Base Sepolia

## Features Implemented
- RainbowKit ConnectButton with custom display options
- Environment variable support for WalletConnect Project ID
- Wallet connection state tracking (useAccount, useChainId)
- Network validation (Base Sepolia or Base Mainnet)
- Wrong network warning display
- JackpotCard component with state-aware buttons:
  - Not connected: "Connect Wallet" button
  - Wrong network: "Wrong Network" disabled button
  - Connected + correct network: "Enter (X USDC)" button
- Wallet info display (address, network name)
- Contract address configuration via environment variables
