# Change #14: Frontend - Sponsor Board

## Prompt
```
Add sponsor board UI to the frontend:
- Display top 10/20 donors for current round (per pool)
- Display top 3 donors yearly (365-day window)
- Show donor addresses and amounts
- Auto-refresh data periodically
- 8-bit NES styling consistent with app theme
```

## Prerequisites
- Change #12 complete (contract has sponsor board view functions)
- Change #13 complete (donation flow working)

## Files to Create
- frontend/src/components/SponsorBoard.jsx - Sponsor board component

## Files to Modify
- frontend/src/App.jsx - Add SponsorBoard component
- frontend/src/App.css - Sponsor board styles

## Implementation Notes
1. Use getTopDonorsCurrentRound(poolId, maxResults) for per-round data
2. Use getTopDonorsYearly(maxResults) for yearly data
3. Show truncated addresses with amounts
4. NES.css table styling
5. Refresh every 30 seconds

## Commands
```bash
cd frontend
npm run dev
```

## Verification
1. See current round top donors per pool
2. See yearly top 3 donors
3. Amounts display correctly
4. Auto-refresh works

---

## Status: COMPLETE ✓

Implementation includes:
- useSponsorBoard.js hook with useTopDonorsCurrentRound and useTopDonorsYearly
- SponsorBoard.jsx component with:
  - Current round top 10 donors per pool (Small Pot / Big Pot)
  - Yearly top 3 donors (365-day rolling window)
  - Truncated addresses with USDC amounts
  - 30-second auto-refresh
- NES.css styling consistent with app theme
- Added to main App.jsx
- Build verified successfully
