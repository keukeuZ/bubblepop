import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { BUBBLEPOP_ABI, ERC20_ABI } from '../contracts/BubblePopABI';
import { useContracts } from './useContracts';
import { USDC_DECIMALS, SMALL_POOL } from './useContract';

/**
 * Hook to handle USDC approval
 */
export function useApproveUSDC() {
  const { usdc: usdcAddress, bubblePop: bubblePopAddress } = useContracts();

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

  const approve = (amount) => {
    if (!usdcAddress || !bubblePopAddress) {
      throw new Error('Contract addresses not configured');
    }

    writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [bubblePopAddress, amount],
    });
  };

  const approveMax = () => {
    // Approve max uint256 for convenience
    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    approve(maxAmount);
  };

  return {
    approve,
    approveMax,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

/**
 * Hook to handle entering a pool
 */
export function useEnterPool() {
  const { bubblePop: bubblePopAddress } = useContracts();

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

  const enter = (poolId) => {
    if (!bubblePopAddress) {
      throw new Error('Contract address not configured');
    }

    writeContract({
      address: bubblePopAddress,
      abi: BUBBLEPOP_ABI,
      functionName: 'enter',
      args: [poolId],
    });
  };

  return {
    enter,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

/**
 * Combined hook for the full entry flow (approve + enter)
 */
export function useEntryFlow(poolId) {
  const approval = useApproveUSDC();
  const entry = useEnterPool();

  const entryPrice = poolId === SMALL_POOL
    ? parseUnits('1', USDC_DECIMALS)
    : parseUnits('10', USDC_DECIMALS);

  const isLoading = approval.isPending || approval.isConfirming ||
                    entry.isPending || entry.isConfirming;

  const resetAll = () => {
    approval.reset();
    entry.reset();
  };

  return {
    approval,
    entry,
    entryPrice,
    isLoading,
    resetAll,
  };
}
