import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { BUBBLEPOP_ABI, ERC20_ABI } from '../contracts/BubblePopABI';
import { contracts } from '../config/wagmi';
import { USDC_DECIMALS, SMALL_POOL } from './useContract';

/**
 * Hook to handle USDC approval
 */
export function useApproveUSDC() {
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

  const approve = async (amount) => {
    const usdcAddress = contracts.usdc;
    const bubblePopAddress = contracts.bubblePop;

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

  const approveMax = async () => {
    // Approve max uint256 for convenience
    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    await approve(maxAmount);
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

  const enter = async (poolId) => {
    const bubblePopAddress = contracts.bubblePop;

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
