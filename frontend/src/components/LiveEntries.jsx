import { useState, useEffect } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { contracts } from '../config/wagmi';
import { AddressDisplay } from './AddressDisplay';
import { formatUSDC } from '../hooks/useContract';

// ABI for the Entry event
const entryEventAbi = [{
  type: 'event',
  name: 'Entry',
  inputs: [
    { indexed: true, name: 'player', type: 'address' },
    { indexed: true, name: 'poolId', type: 'uint256' },
    { indexed: false, name: 'amount', type: 'uint256' },
  ],
}];

// Random fun phrases for entries
const entryPhrases = [
  "just entered!",
  "is feeling lucky!",
  "joined the game!",
  "wants the jackpot!",
  "is in it to win it!",
  "took a shot!",
  "rolled the dice!",
  "popped a bubble!",
];

function getRandomPhrase() {
  return entryPhrases[Math.floor(Math.random() * entryPhrases.length)];
}

export function LiveEntries() {
  const [entries, setEntries] = useState([]);
  const hasContract = !!contracts.bubblePop;

  // Watch for Entry events
  useWatchContractEvent({
    address: contracts.bubblePop,
    abi: entryEventAbi,
    eventName: 'Entry',
    enabled: hasContract,
    onLogs: (logs) => {
      const newEntries = logs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        player: log.args.player,
        poolId: Number(log.args.poolId),
        amount: log.args.amount,
        timestamp: Date.now(),
        phrase: getRandomPhrase(),
      }));

      setEntries((prev) => {
        // Add new entries and keep only last 10
        const updated = [...newEntries, ...prev].slice(0, 10);
        return updated;
      });
    },
  });

  // Remove old entries after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEntries((prev) => prev.filter((e) => now - e.timestamp < 30000));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!hasContract) return null;

  return (
    <section className="live-entries">
      <div className="nes-container with-title">
        <p className="title">Live Activity</p>

        {entries.length === 0 ? (
          <div className="no-entries">
            <p className="waiting-text">Waiting for entries...</p>
            <p className="hint-text">Be the first to enter!</p>
          </div>
        ) : (
          <div className="entries-list">
            {entries.map((entry) => (
              <div key={entry.id} className="entry-item">
                <span className="entry-pool">
                  {entry.poolId === 0 ? '🎈' : '🎪'}
                </span>
                <span className="entry-player">
                  <AddressDisplay address={entry.player} />
                </span>
                <span className="entry-phrase">{entry.phrase}</span>
                <span className="entry-amount nes-text is-success">
                  +{formatUSDC(entry.amount)} USDC
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
