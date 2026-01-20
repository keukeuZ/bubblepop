import { useState, useEffect } from 'react';
import { useWatchContractEvent, useChainId } from 'wagmi';
import { BUBBLEPOP_ABI } from '../contracts/BubblePopABI';
import { contracts, CHAIN_IDS } from '../config/wagmi';
import { formatUSDC, SMALL_POOL } from '../hooks/useContract';

export function WinnerHistory() {
  const [winners, setWinners] = useState([]);
  const chainId = useChainId();
  const hasContract = !!contracts.bubblePop;

  // Get block explorer URL based on network
  const getExplorerUrl = (txHash) => {
    if (chainId === CHAIN_IDS.BASE_SEPOLIA) {
      return `https://sepolia.basescan.org/tx/${txHash}`;
    }
    return `https://basescan.org/tx/${txHash}`;
  };

  // Watch for WinnerSelected events
  useWatchContractEvent({
    address: contracts.bubblePop,
    abi: BUBBLEPOP_ABI,
    eventName: 'WinnerSelected',
    enabled: hasContract,
    onLogs(logs) {
      const newWinners = logs.map((log) => ({
        poolId: Number(log.args.poolId),
        winner: log.args.winner,
        amount: log.args.amount,
        houseFee: log.args.houseFee,
        requestId: log.args.requestId?.toString() || 'N/A',
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
        timestamp: Date.now(), // Approximate, ideally fetch block timestamp
      }));

      setWinners((prev) => {
        // Combine and dedupe by txHash
        const combined = [...newWinners, ...prev];
        const unique = combined.filter(
          (w, i, arr) => arr.findIndex((x) => x.txHash === w.txHash) === i
        );
        // Keep last 20 winners
        return unique.slice(0, 20);
      });
    },
  });

  const getPoolName = (poolId) => {
    return poolId === SMALL_POOL ? 'Small Pot' : 'Big Pot';
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!hasContract) {
    return (
      <section className="nes-container with-title winner-history">
        <p className="title">Recent Winners</p>
        <p className="no-winners">Contract not deployed yet</p>
      </section>
    );
  }

  return (
    <section className="nes-container with-title winner-history">
      <p className="title">Recent Winners</p>

      {winners.length === 0 ? (
        <div className="no-winners">
          <p>No winners yet!</p>
          <p className="nes-text is-disabled">Be the first to pop the bubble</p>
        </div>
      ) : (
        <div className="winner-list">
          {winners.map((winner, index) => (
            <div key={winner.txHash || index} className="winner-item nes-container is-rounded">
              <div className="winner-header">
                <span className={`pool-badge ${winner.poolId === SMALL_POOL ? 'small' : 'big'}`}>
                  {getPoolName(winner.poolId)}
                </span>
                <span className="winner-amount nes-text is-success">
                  {formatUSDC(winner.amount)} USDC
                </span>
              </div>

              <div className="winner-details">
                <p className="winner-address">
                  <span className="label">Winner:</span>
                  <span className="value">{formatAddress(winner.winner)}</span>
                </p>
                <p className="winner-vrf">
                  <span className="label">VRF ID:</span>
                  <span className="value">{winner.requestId.slice(0, 10)}...</span>
                </p>
              </div>

              <div className="winner-footer">
                <a
                  href={getExplorerUrl(winner.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nes-btn is-primary verify-link"
                >
                  Verify
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="provably-fair-note">
        <i className="nes-icon is-small star"></i>
        <span>All winners selected using Chainlink VRF - provably fair!</span>
      </div>
    </section>
  );
}
