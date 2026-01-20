# Change #13: Frontend - Donation Button

## Prompt
```
Add donation UI to the frontend:
- Donation button on each jackpot card
- Input field for custom USDC amount (uncapped)
- USDC approval flow (same as entry)
- Transaction confirmation and toast notifications
- Update jackpot display after successful donation
- Show user's current donation amount for the round
```

## Prerequisites
- Change #12 complete (contract has donate function)
- Entry system working (reuse approval flow)

## Files to Create
- frontend/src/hooks/useDonation.js - Donation transaction hook

## Files to Modify
- frontend/src/components/JackpotCard.jsx - Add donation UI
- frontend/src/contracts/BubblePopABI.js - Add donate function ABI
- frontend/src/App.css - Donation button styles

## Implementation Notes
1. Reuse USDC approval pattern from useEntry.js
2. Input field with USDC amount (min 0.01, no max)
3. Button states: Approve USDC → Donate
4. Toast notifications for success/error
5. Refetch pool data after donation

## Commands
```bash
cd frontend
npm run dev
```

## Verification
1. Enter donation amount
2. Approve USDC if needed
3. Confirm donation transaction
4. See jackpot increase
5. Toast shows success

---

## Status: COMPLETE ✓

Implementation includes:
- "Donate to Jackpot" toggle button on each jackpot card
- Custom USDC amount input (uncapped - any amount > 0)
- Full USDC approval flow (reused from entry system)
- Toast notifications for approval/donation success/error
- Jackpot display updates after successful donation
- Shows user's current donation amount for the round
- CSS styles for donation input and buttons
- Build verified successfully
