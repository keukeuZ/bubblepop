import { useReadContract } from 'wagmi';
import { BUBBLEPOP_ABI } from '../contracts/BubblePopABI';
import { useContracts } from './useContracts';

/**
 * Hook to get top donors for current round of a specific pool
 */
export function useTopDonorsCurrentRound(poolId, maxResults = 10) {
  const { bubblePop: contractAddress } = useContracts();

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: BUBBLEPOP_ABI,
    functionName: 'getTopDonorsCurrentRound',
    args: [poolId, BigInt(maxResults)],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  // Data comes as [donors[], amounts[]]
  const donors = data ? data[0] : [];
  const amounts = data ? data[1] : [];

  // Combine into array of objects
  const topDonors = donors.map((donor, i) => ({
    address: donor,
    amount: amounts[i],
  })).filter(d => d.amount > 0n);

  return {
    topDonors,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get top donors yearly (365-day window)
 */
export function useTopDonorsYearly(maxResults = 3) {
  const { bubblePop: contractAddress } = useContracts();

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: BUBBLEPOP_ABI,
    functionName: 'getTopDonorsYearly',
    args: [BigInt(maxResults)],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  // Data comes as [donors[], amounts[]]
  const donors = data ? data[0] : [];
  const amounts = data ? data[1] : [];

  // Combine into array of objects
  const topDonors = donors.map((donor, i) => ({
    address: donor,
    amount: amounts[i],
  })).filter(d => d.amount > 0n);

  return {
    topDonors,
    isLoading,
    error,
    refetch,
  };
}
