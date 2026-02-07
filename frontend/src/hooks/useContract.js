import { useReadContract, useReadContracts } from 'wagmi';
import { BUBBLEPOP_ABI, ERC20_ABI } from '../contracts/BubblePopABI';
import { contracts } from '../config/wagmi';

// Pool IDs
export const SMALL_POOL = 0;
export const BIG_POOL = 1;

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

/**
 * Format USDC amount from wei to human readable
 */
export function formatUSDC(amount) {
  if (!amount) return '0';
  const value = Number(amount) / Math.pow(10, USDC_DECIMALS);
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format win chance from raw value to percentage string
 * Raw value is out of 1,000,000
 */
export function formatWinChance(rawChance) {
  if (!rawChance) return '0%';
  const percentage = (Number(rawChance) / 1000000) * 100;
  if (percentage < 0.01) {
    return percentage.toFixed(4) + '%';
  }
  return percentage.toFixed(3) + '%';
}

/**
 * Hook to read pool data
 */
export function usePool(poolId) {
  const contractAddress = contracts.bubblePop;

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: BUBBLEPOP_ABI,
    functionName: 'getPool',
    args: [poolId],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  });

  return {
    pool: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read current win chance
 */
export function useWinChance(poolId) {
  const contractAddress = contracts.bubblePop;

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: BUBBLEPOP_ABI,
    functionName: 'getCurrentWinChance',
    args: [poolId],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  return {
    winChance: data,
    winChanceFormatted: formatWinChance(data),
    isLoading,
    error,
  };
}

/**
 * Hook to read player's entry count
 */
export function usePlayerEntries(poolId, playerAddress) {
  const contractAddress = contracts.bubblePop;

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: BUBBLEPOP_ABI,
    functionName: 'getPlayerEntries',
    args: [poolId, playerAddress],
    query: {
      enabled: !!contractAddress && !!playerAddress,
      refetchInterval: 10000,
    },
  });

  return {
    entries: data ? Number(data) : 0,
    isLoading,
    error,
  };
}

/**
 * Hook to read all pool data at once
 */
export function usePoolData(poolId) {
  const contractAddress = contracts.bubblePop;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: BUBBLEPOP_ABI,
        functionName: 'getPool',
        args: [poolId],
      },
      {
        address: contractAddress,
        abi: BUBBLEPOP_ABI,
        functionName: 'getCurrentWinChance',
        args: [poolId],
      },
      {
        address: contractAddress,
        abi: BUBBLEPOP_ABI,
        functionName: 'getEntryCount',
        args: [poolId],
      },
      {
        address: contractAddress,
        abi: BUBBLEPOP_ABI,
        functionName: 'getGracePeriodEnd',
        args: [poolId],
      },
      {
        address: contractAddress,
        abi: BUBBLEPOP_ABI,
        functionName: 'getTimeUntilForcedDraw',
        args: [poolId],
      },
      {
        address: contractAddress,
        abi: BUBBLEPOP_ABI,
        functionName: 'getCurrentRoundId',
        args: [poolId],
      },
    ],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 10000,
    },
  });

  const pool = data?.[0]?.result;
  const winChance = data?.[1]?.result;
  const entryCount = data?.[2]?.result;
  const gracePeriodEnd = data?.[3]?.result;
  const timeUntilForcedDraw = data?.[4]?.result;
  const roundId = data?.[5]?.result;

  // Check if pool is open for entries
  // Pool is open if:
  // 1. Not in grace period, OR
  // 2. In grace period but the grace period time has elapsed (contract will auto-end it on entry)
  const gracePeriodEndTime = gracePeriodEnd ? Number(gracePeriodEnd) : 0;
  const now = Math.floor(Date.now() / 1000);
  const gracePeriodElapsed = gracePeriodEndTime > 0 && now >= gracePeriodEndTime;
  const isOpen = pool ? (!pool.inGracePeriod || gracePeriodElapsed) : true;

  // Forced draw info (90-day rule)
  const secondsUntilForcedDraw = timeUntilForcedDraw ? Number(timeUntilForcedDraw) : 0;
  const isRoundExpired = secondsUntilForcedDraw === 0 && !pool?.inGracePeriod;

  return {
    pool,
    winChance,
    winChanceFormatted: formatWinChance(winChance),
    entryCount: entryCount ? Number(entryCount) : 0,
    jackpot: pool?.jackpot,
    jackpotFormatted: formatUSDC(pool?.jackpot),
    isOpen,
    inGracePeriod: pool?.inGracePeriod || false,
    gracePeriodEnd: gracePeriodEndTime,
    gracePeriodElapsed,
    // New fields for 90-day rule and round tracking
    roundId: roundId ? Number(roundId) : 0,
    timeUntilForcedDraw: secondsUntilForcedDraw,
    isRoundExpired,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check USDC balance and allowance
 */
export function useUSDCBalance(userAddress) {
  const usdcAddress = contracts.usdc;
  const bubblePopAddress = contracts.bubblePop;

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      },
      {
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, bubblePopAddress],
      },
    ],
    query: {
      enabled: !!usdcAddress && !!userAddress && !!bubblePopAddress,
      refetchInterval: 10000,
    },
  });

  const balance = data?.[0]?.result;
  const allowance = data?.[1]?.result;

  return {
    balance,
    balanceFormatted: formatUSDC(balance),
    allowance,
    allowanceFormatted: formatUSDC(allowance),
    isLoading,
    error,
  };
}
