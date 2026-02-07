import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { BUBBLEPOP_ABI } from '../contracts/BubblePopABI';
import { contracts } from '../config/wagmi';
import { USDC_DECIMALS } from './useContract';
import { useApproveUSDC } from './useEntry';

/**
 * Hook to handle donation transaction
 */
export function useDonateToPool() {
  const {
    data: hash,
    writeContract,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });

  const donate = async (poolId, amount) => {
    const bubblePopAddress = contracts.bubblePop;

    if (!bubblePopAddress) {
      throw new Error('Contract address not configured');
    }

    writeContract({
      address: bubblePopAddress,
      abi: BUBBLEPOP_ABI,
      functionName: 'donate',
      args: [poolId, amount],
    });
  };

  return {
    donate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

/**
 * Hook to get user's donation amount for current round
 */
export function useUserDonation(poolId, userAddress) {
  const contractAddress = contracts.bubblePop;

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: BUBBLEPOP_ABI,
    functionName: 'getDonorAmount',
    args: [poolId, userAddress],
    query: {
      enabled: !!contractAddress && !!userAddress,
      refetchInterval: 10000,
    },
  });

  return {
    donationAmount: data || 0n,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Combined hook for the full donation flow
 */
export function useDonationFlow() {
  const approval = useApproveUSDC();
  const donation = useDonateToPool();

  const isLoading = approval.isPending || approval.isConfirming ||
                    donation.isPending || donation.isConfirming;

  const resetAll = () => {
    approval.reset();
    donation.reset();
  };

  // Parse USDC amount from string to bigint
  const parseAmount = (amountString) => {
    try {
      return parseUnits(amountString, USDC_DECIMALS);
    } catch {
      return 0n;
    }
  };

  return {
    approval,
    donation,
    isLoading,
    resetAll,
    parseAmount,
  };
}
