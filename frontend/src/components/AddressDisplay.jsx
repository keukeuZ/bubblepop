import { useENSName } from '../hooks/useENS';

/**
 * Component to display an address with ENS resolution
 * Shows ENS name if available, otherwise truncated address
 */
export function AddressDisplay({ address, className = '' }) {
  const { displayName, hasENS, isLoading } = useENSName(address);

  if (isLoading) {
    return <span className={`address-display ${className}`}>...</span>;
  }

  return (
    <span className={`address-display ${hasENS ? 'has-ens' : ''} ${className}`} title={address}>
      {displayName}
    </span>
  );
}
