# Change #2: Smart Contract - Lottery Core

## Prompt
```
Create the core BubblePop lottery smart contract with:
- Hardhat project setup in /contracts folder
- Two jackpot pools: Small (1 USDC) and Big (10 USDC)
- Entry tracking per player per round
- 0.9% house fee (90 basis points) taken on payouts
- 1-hour grace period after jackpot payout
- Winner selection function (placeholder for VRF)
- Anti-abuse: reject winners from same block as entry
- Events: EntrySubmitted, WinnerSelected, GracePeriodStarted, GracePeriodEnded
- View functions: getPool, getEntryCount, getPlayerEntries, isPoolOpen
- Admin function: setHouseFeeRecipient
- MockUSDC contract for testing
- Test suite covering deployment, entry, and pool status
```

## Files Created
- contracts/src/BubblePop.sol - Main lottery contract
- contracts/src/mocks/MockUSDC.sol - Mock USDC for testing
- contracts/test/BubblePop.test.js - Test suite (11 tests)
- contracts/hardhat.config.js - Hardhat configuration

## Commands to Recreate
```bash
cd contracts
npm init -y
npm install --save-dev hardhat@^2.22.0 @nomicfoundation/hardhat-toolbox@^5.0.0 @openzeppelin/contracts
npx hardhat compile
npx hardhat test
```

## Verification
```bash
cd contracts
npx hardhat test
# Should show: 11 passing
```

## Contract Interface
```solidity
// Entry
function enter(uint256 poolId) external;

// Winner (owner only, will be VRF in Change #3)
function processWinner(uint256 poolId, uint256 randomWord) external;

// Grace period
function endGracePeriod(uint256 poolId) external;

// View
function getPool(uint256 poolId) external view returns (Pool memory);
function getEntryCount(uint256 poolId) external view returns (uint256);
function getPlayerEntries(uint256 poolId, address player) external view returns (uint256);
function isPoolOpen(uint256 poolId) external view returns (bool);
function getGracePeriodEnd(uint256 poolId) external view returns (uint256);
```
