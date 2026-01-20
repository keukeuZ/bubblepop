# Change #3: Smart Contract - VRF Integration

## Prompt
```
Integrate Chainlink VRF v2.5 into BubblePop contract for provably fair randomness:
- Add VRF consumer functionality to BubblePop.sol
- Request random number when triggering winner selection
- Fulfill callback to process winner with verified randomness
- Support Base Sepolia (testnet) and Base mainnet VRF coordinators
- Add escalating odds system (weekly guarantee)
- Track VRF request IDs per pool
- Events for randomness requested/fulfilled
- Update tests to mock VRF coordinator
```

## Dependencies
- @chainlink/contracts (VRF v2.5)

## Files Modified
- contracts/src/BubblePop.sol - Add VRF consumer
- contracts/test/BubblePop.test.js - Update tests

## Files Created
- contracts/src/mocks/MockVRFCoordinator.sol - Mock for testing

## VRF Addresses (Base)
- Base Sepolia Coordinator: 0xD7f86b4b8Cae7D942340FF628F82735b7a20893a
- Base Mainnet Coordinator: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634

## Commands
```bash
cd contracts
npm install @chainlink/contracts
npx hardhat compile
npx hardhat test
```

## Verification
```bash
cd contracts
npx hardhat test
# All 22 tests should pass
```

## Contract Changes Summary
- Inherits from VRFConsumerBaseV2Plus instead of Ownable
- Added VRF configuration (subscriptionId, keyHash, callbackGasLimit)
- Added `requestRandomWinner(poolId)` function
- Added `fulfillRandomWords` callback (internal)
- Added escalating odds system:
  - Starts at 1% base chance
  - Increases linearly to 100% over 7 days
  - `getCurrentWinChance(poolId)` view function
- Added VRF request tracking with `vrfRequests` mapping
- Added `vrfRequestPending` flag per pool
- New events: `RandomnessRequested`, `NoWinnerThisRoll`, `VRFConfigUpdated`
- New errors: `VRFRequestPending`, `UnknownVRFRequest`

## Escalating Odds Formula (Updated)
```
currentOdds = BASE_WIN_CHANCE + ((MAX_WIN_CHANCE - BASE_WIN_CHANCE) * elapsed) / ESCALATION_PERIOD
```
- Denominator: 1,000,000
- Day 0: 0.001% (10/1,000,000)
- Day 7: ~0.0055% (55/1,000,000)
- Day 14+: 0.01% cap (100/1,000,000)

**Note:** No guarantee - just gradual increase. Odds cap at 0.01% (1 in 10,000).
