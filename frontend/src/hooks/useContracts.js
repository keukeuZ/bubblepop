import { useChainId } from 'wagmi';
import { getContracts } from '../config/wagmi';

/**
 * Hook that returns chain-aware contract addresses.
 * Automatically switches between mainnet and testnet addresses
 * based on the connected chain.
 */
export function useContracts() {
  const chainId = useChainId();
  return getContracts(chainId);
}
