# Change #8: Frontend - Winner History

## Prompt
```
Implement the winner history display showing recent winners and VRF verification:
- Listen for WinnerSelected events from the contract
- Display recent winners with:
  - Winner address (truncated)
  - Amount won
  - Timestamp
  - VRF request ID for verification
- Link to Base block explorer for verification
- Show "No winners yet" when history is empty
- Auto-update when new winner is selected
```

## Prerequisites
- Change #7 complete (entry system working)
- Contract events: WinnerSelected(poolId, winner, amount, vrfRequestId)

## Files to Create
- frontend/src/components/WinnerHistory.jsx - History list component

## Files to Modify
- frontend/src/App.jsx - Add WinnerHistory section
- frontend/src/App.css - Winner history styles
- frontend/src/contracts/BubblePopABI.js - Add events if needed

## Implementation Notes
1. Use wagmi's useWatchContractEvent or useContractEvents to listen for WinnerSelected events
2. Store recent winners in state (last 10-20)
3. Format timestamp from block number or event timestamp
4. Link to basescan.org/tx/{txHash} for verification
5. Show VRF request ID for provably fair verification

## Commands
```bash
cd frontend
npm run dev
```

## Verification
1. Check history shows "No winners yet" initially
2. When a winner is selected (via VRF callback), verify it appears
3. Click verification link opens block explorer
4. Multiple winners stack in reverse chronological order

---

## Status: COMPLETE ✓

Build verified successfully. Winner history features implemented:
- WinnerHistory component with real-time event listening
- Pool badges (Small Pot / Big Pot with color coding)
- Winner address and amount display
- VRF request ID for verification
- Block explorer links (Base Sepolia / Mainnet)
- "Provably fair" note with Chainlink VRF
- Responsive CSS with scrollable list
