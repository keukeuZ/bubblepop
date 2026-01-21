import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';

/**
 * Hook to get ENS name for an address
 * Falls back to truncated address if no ENS name found
 */
export function useENSName(address) {
  const { data: ensName, isLoading } = useEnsName({
    address,
    chainId: mainnet.id, // ENS is on mainnet
    enabled: !!address,
  });

  const displayName = ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');

  return {
    ensName,
    displayName,
    isLoading,
    hasENS: !!ensName,
  };
}

/**
 * Format address with optional ENS
 * @param {string} address - Ethereum address
 * @param {string|null} ensName - ENS name if available
 * @returns {string} Formatted display name
 */
export function formatAddressOrENS(address, ensName) {
  if (ensName) return ensName;
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
