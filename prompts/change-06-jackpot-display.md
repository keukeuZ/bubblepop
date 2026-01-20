# Change #6: Frontend - Jackpot Display

## Prompt
```
Implement live jackpot display that reads from the BubblePop contract:
- Create contract ABI file from compiled artifacts
- Create custom hooks to read pool data (usePool, usePoolEntries)
- Display current jackpot amount for both pools
- Show total entries per pool
- Display current win chance percentage
- Show pool status (open/grace period)
- Auto-refresh data periodically
- Format USDC amounts correctly (6 decimals)
```

## Prerequisites
- Change #5 complete (wallet connection)
- Contract ABI available from Hardhat compilation

## Files Created
- frontend/src/contracts/BubblePopABI.js - Contract ABI
- frontend/src/hooks/useContract.js - Contract read hooks
- frontend/src/components/JackpotCard.jsx - Extracted component

## Files Modified
- frontend/src/App.jsx - Use new hooks and components

## Commands
```bash
cd frontend
npm run dev
```

## Verification
1. Connect wallet to Base Sepolia
2. Verify jackpot amounts display (will be 0 initially)
3. Verify entry counts display
4. Verify win chance percentage displays
5. Verify pool status shows correctly

## Features Implemented
- Contract ABI file with essential functions and events
- Custom hooks for reading contract data:
  - `usePool()` - Single pool data
  - `usePoolData()` - Aggregated pool data with formatting
  - `useWinChance()` - Current win chance
  - `usePlayerEntries()` - Player's entry count
  - `useUSDCBalance()` - USDC balance and allowance
- JackpotCard component with:
  - Live jackpot amount display
  - Pool statistics (entries, win chance, status)
  - Player's entry count
  - Last winner display
  - State-aware action buttons
- Auto-refresh every 10 seconds
- USDC formatting (6 decimals)
- Win chance formatting (0.001% precision)
