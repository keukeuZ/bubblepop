# Change #7: Frontend - Entry System

## Prompt
```
Implement the entry system for buying lottery tickets:
- Check user's USDC balance before entry
- Handle USDC approval flow (approve contract to spend)
- Execute enter() transaction on contract
- Show loading states during transactions
- Display success/error feedback (toast notifications)
- Disable button during pending transactions
- Refresh pool data after successful entry
```

## Prerequisites
- Change #6 complete (jackpot display with hooks)
- Contract deployed with address in .env

## Files Created
- frontend/src/hooks/useEntry.js - Entry transaction hook
- frontend/src/components/Toast.jsx - Toast notification component

## Files Modified
- frontend/src/components/JackpotCard.jsx - Add entry logic
- frontend/src/App.jsx - Add toast container
- frontend/src/App.css - Toast styles

## Commands
```bash
cd frontend
npm run dev
```

## Verification
1. Connect wallet with USDC balance
2. Click "Enter" button
3. Approve USDC spending (first time)
4. Confirm entry transaction
5. See success toast and updated entry count

---

## Status: COMPLETE ✓

Build verified successfully. All entry flow features implemented:
- Balance checking before entry
- USDC approval flow (max approval for convenience)
- Entry transaction with proper loading states
- Toast notifications for all transaction states
- Button states: Connect → Wrong Network → Insufficient → Approve → Enter
- Auto-refresh pool data after successful entry
