# Change #1: Project Setup

## Prompt
```
Initialize the BubblePop project with:
- React + Vite frontend in /frontend folder
- NES.css for 8-bit styling with Press Start 2P font
- RainbowKit + wagmi for wallet connection (Base network)
- Dark color scheme (pink accent: #e94560, blue: #0f3460)
- Basic homepage layout with:
  - Header with logo and connect wallet button
  - Two jackpot display boxes (Small Pot / Big Pot)
  - "How It Works" section
  - Footer
- Folder structure for components, config, hooks, contracts, assets
- Create CHANGELOG.md
```

## Files Created
- frontend/src/main.jsx - App entry with providers
- frontend/src/App.jsx - Main layout component
- frontend/src/App.css - Layout styles
- frontend/src/index.css - 8-bit theme styles
- frontend/src/config/wagmi.js - Base network configuration
- CHANGELOG.md - Project changelog

## Commands to Recreate
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install nes.css @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query
npm run build
```

## Verification
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```
