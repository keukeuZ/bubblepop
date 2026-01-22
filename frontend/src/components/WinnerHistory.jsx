import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useBlockNumber, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { contracts, CHAIN_IDS } from '../config/wagmi';
import { SMALL_POOL } from '../hooks/useContract';
import { AddressDisplay } from './AddressDisplay';

// Format USDC amount (6 decimals)
const formatUSDC = (amount) => {
  if (!amount) return '0';
  const formatted = formatUnits(amount, 6);
  return parseFloat(formatted).toFixed(2);
};

export function WinnerHistory() {
  const [winners, setWinners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedBlock, setLastFetchedBlock] = useState(null);

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: currentBlock } = useBlockNumber({ watch: true });

  const hasContract = !!contracts.bubblePop;

  // Get block explorer URL based on network
  const getExplorerUrl = (txHash) => {
    if (chainId === CHAIN_IDS.BASE_SEPOLIA) {
      return `https://sepolia.basescan.org/tx/${txHash}`;
    }
    return `https://basescan.org/tx/${txHash}`;
  };

  const getPoolName = (poolId) => {
    return poolId === SMALL_POOL ? 'Small Pot' : 'Big Pot';
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert from Unix timestamp
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fetch historical winners
  const fetchWinners = useCallback(async (fromBlock = null) => {
    if (!publicClient || !hasContract) return;

    try {
      // If no fromBlock specified, search last ~100k blocks (roughly 2-3 days on Base)
      const latestBlock = await publicClient.getBlockNumber();
      const searchFromBlock = fromBlock || (latestBlock > 100000n ? latestBlock - 100000n : 0n);

      const logs = await publicClient.getLogs({
        address: contracts.bubblePop,
        event: {
          type: 'event',
          name: 'WinnerSelected',
          inputs: [
            { indexed: true, name: 'poolId', type: 'uint256' },
            { indexed: true, name: 'winner', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'houseFee', type: 'uint256' },
            { indexed: false, name: 'requestId', type: 'uint256' },
          ],
        },
        fromBlock: searchFromBlock,
        toBlock: 'latest',
      });

      if (logs.length > 0) {
        // Get block timestamps for each unique block
        const uniqueBlocks = [...new Set(logs.map(log => log.blockNumber))];
        const blockTimestamps = {};

        await Promise.all(
          uniqueBlocks.map(async (blockNum) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: blockNum });
              blockTimestamps[blockNum.toString()] = Number(block.timestamp);
            } catch (err) {
              blockTimestamps[blockNum.toString()] = Math.floor(Date.now() / 1000);
            }
          })
        );

        const newWinners = logs.map((log) => ({
          poolId: Number(log.args.poolId),
          winner: log.args.winner,
          amount: log.args.amount,
          houseFee: log.args.houseFee,
          requestId: log.args.requestId?.toString() || 'N/A',
          txHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp: blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000),
        }));

        setWinners((prev) => {
          // Combine new and existing winners
          const combined = [...newWinners, ...prev];

          // Dedupe by txHash
          const unique = combined.filter(
            (w, i, arr) => arr.findIndex((x) => x.txHash === w.txHash) === i
          );

          // Sort by timestamp descending (most recent first)
          unique.sort((a, b) => b.timestamp - a.timestamp);

          // Keep last 10 winners
          return unique.slice(0, 10);
        });
      }

      setLastFetchedBlock(Number(latestBlock));
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching winners:', err);
      setIsLoading(false);
    }
  }, [publicClient, hasContract]);

  // Initial fetch
  useEffect(() => {
    if (hasContract && publicClient) {
      fetchWinners();
    }
  }, [hasContract, publicClient, fetchWinners]);

  // Poll for new winners when block changes
  useEffect(() => {
    if (currentBlock && lastFetchedBlock && currentBlock > lastFetchedBlock) {
      // Fetch only new blocks
      fetchWinners(BigInt(lastFetchedBlock + 1));
    }
  }, [currentBlock, lastFetchedBlock, fetchWinners]);

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

      {isLoading ? (
        <div className="no-winners">
          <p>Loading winners...</p>
        </div>
      ) : winners.length === 0 ? (
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
                  <span className="value">
                    <AddressDisplay address={winner.winner} />
                  </span>
                </p>
                <p className="winner-date">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(winner.timestamp)}</span>
                </p>
              </div>

              <div className="winner-footer">
                <a
                  href={getExplorerUrl(winner.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nes-btn is-primary verify-link"
                >
                  Verify on Explorer
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
