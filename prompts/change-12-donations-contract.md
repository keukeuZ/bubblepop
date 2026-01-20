# Change #12: Smart Contract - Donations

## Prompt
```
Add donation functionality to the BubblePop contract:
- Accept USDC donations of any amount
- Track donation amounts per address per round
- Track all-time donation amounts per address (for yearly board)
- Store donation timestamps for 365-day rotation
- Emit events for donations
- Provide view functions for sponsor board data
- Donations go to house fee recipient (or jackpot - TBD)
```

## Prerequisites
- BubblePop.sol contract exists with lottery logic
- USDC integration already in place

## Files Modified
- contracts/src/BubblePop.sol - Add donation functions and tracking

## Implementation Notes
1. Add Donation struct to track: donor, amount, timestamp
2. Mapping for current round donations per pool
3. Array/mapping for all-time donations (yearly rotation)
4. donate(poolId, amount) function
5. View functions: getTopDonorsCurrentRound(), getTopDonorsAllTime()
6. DonationReceived event

## Design Decisions
- Donations add to jackpot (more incentive to donate)
- Current round donations reset when jackpot pays out
- Yearly donations use 365-day sliding window
- Store top N donations to avoid gas issues with large arrays

## Commands
```bash
cd contracts
npx hardhat test
```

## Verification
1. Can donate any USDC amount
2. Donation adds to jackpot
3. Current round donations tracked correctly
4. All-time donations tracked with timestamps
5. View functions return correct top donors

---

## Status: COMPLETE ✓

All 32 tests passing (24 existing + 8 new donation tests):
- donate() adds to jackpot and tracks donations
- Current round donations reset on payout
- getTopDonorsCurrentRound() returns sorted donors
- getTopDonorsYearly() returns 365-day window donors
- All edge cases handled (zero amount, invalid pool)
