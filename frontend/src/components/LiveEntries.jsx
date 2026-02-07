import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { useContracts } from '../hooks/useContracts';
import { BUBBLEPOP_ABI } from '../contracts/BubblePopABI';
import { AddressDisplay } from './AddressDisplay';
import { formatUSDC } from '../hooks/useContract';

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

// Random phrases for donations
const donationPhrases = [
  "donated to the pot!",
  "boosted the jackpot!",
  "is a legend!",
  "sponsored the pool!",
  "pumped the prize!",
  "added to the pot!",
];

// Phrases for no winner draws
const noWinnerPhrases = [
  "No winner this time!",
  "The bubble didn't pop!",
  "Jackpot grows bigger!",
  "Try again next draw!",
  "Better luck next time!",
  "The hunt continues!",
];

// Phrases for new rounds
const newRoundPhrases = [
  "New round started!",
  "Fresh round begins!",
  "Round reset!",
  "New game, new chances!",
];

function getRandomEntryPhrase() {
  return entryPhrases[Math.floor(Math.random() * entryPhrases.length)];
}

function getRandomDonationPhrase() {
  return donationPhrases[Math.floor(Math.random() * donationPhrases.length)];
}

function getRandomNoWinnerPhrase() {
  return noWinnerPhrases[Math.floor(Math.random() * noWinnerPhrases.length)];
}

function getRandomNewRoundPhrase() {
  return newRoundPhrases[Math.floor(Math.random() * newRoundPhrases.length)];
}

export function LiveEntries() {
  const [entries, setEntries] = useState([]);
  const [lastFetchedBlock, setLastFetchedBlock] = useState(null);
  const contracts = useContracts();
  const hasContract = !!contracts.bubblePop;

  const publicClient = usePublicClient();

  // Watch for new blocks
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    query: {
      refetchInterval: 3000,
    },
  });

  // Fetch events function (entries + donations)
  const fetchEvents = useCallback(async (fromBlock, toBlock) => {
    if (!publicClient || !hasContract) return [];

    try {
      const findEvent = (name) => BUBBLEPOP_ABI.find(item => item.name === name && item.type === 'event');

      const entryLogs = await publicClient.getLogs({
        address: contracts.bubblePop,
        event: findEvent('EntrySubmitted'),
        fromBlock,
        toBlock,
      });

      const donationLogs = await publicClient.getLogs({
        address: contracts.bubblePop,
        event: findEvent('DonationReceived'),
        fromBlock,
        toBlock,
      });

      const noWinnerLogs = await publicClient.getLogs({
        address: contracts.bubblePop,
        event: findEvent('NoWinnerThisRoll'),
        fromBlock,
        toBlock,
      });

      const newRoundLogs = await publicClient.getLogs({
        address: contracts.bubblePop,
        event: findEvent('NewRoundStarted'),
        fromBlock,
        toBlock,
      });

      // Process entry events
      const entries = entryLogs.map((log) => {
        const poolId = Number(log.args.poolId);
        const amount = poolId === 0 ? 1000000n : 10000000n;

        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'entry',
          player: log.args.player,
          poolId,
          amount,
          blockNumber: log.blockNumber,
          timestamp: Date.now(),
          phrase: getRandomEntryPhrase(),
        };
      });

      // Process donation events
      const donations = donationLogs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'donation',
        player: log.args.donor,
        poolId: Number(log.args.poolId),
        amount: log.args.amount,
        blockNumber: log.blockNumber,
        timestamp: Date.now(),
        phrase: getRandomDonationPhrase(),
      }));

      // Process NoWinnerThisRoll events
      const noWinners = noWinnerLogs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'noWinner',
        poolId: Number(log.args.poolId),
        odds: log.args.currentOdds,
        blockNumber: log.blockNumber,
        timestamp: Date.now(),
        phrase: getRandomNoWinnerPhrase(),
      }));

      // Process NewRoundStarted events
      const newRounds = newRoundLogs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'newRound',
        poolId: Number(log.args.poolId),
        roundId: Number(log.args.roundId),
        blockNumber: log.blockNumber,
        timestamp: Date.now(),
        phrase: getRandomNewRoundPhrase(),
      }));

      // Combine and sort by block number
      const allEvents = [...entries, ...donations, ...noWinners, ...newRounds].sort(
        (a, b) => Number(a.blockNumber) - Number(b.blockNumber)
      );

      return allEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }, [publicClient, hasContract]);

  // Initial fetch - get last 500 blocks of events
  useEffect(() => {
    if (!publicClient || !hasContract || !blockNumber) return;

    const fetchInitialEvents = async () => {
      const currentBlock = blockNumber;
      const fromBlock = currentBlock > 500n ? currentBlock - 500n : 0n;

      const events = await fetchEvents(fromBlock, currentBlock);

      if (events.length > 0) {
        // Take last 10, most recent first
        setEntries(events.slice(-10).reverse());
      }

      setLastFetchedBlock(currentBlock);
    };

    if (!lastFetchedBlock) {
      fetchInitialEvents();
    }
  }, [publicClient, hasContract, blockNumber, lastFetchedBlock, fetchEvents]);

  // Poll for new events when block changes
  useEffect(() => {
    if (!publicClient || !hasContract || !blockNumber || !lastFetchedBlock) return;
    if (blockNumber <= lastFetchedBlock) return;

    const fetchNewEvents = async () => {
      const fromBlock = lastFetchedBlock + 1n;

      const newEvents = await fetchEvents(fromBlock, blockNumber);

      if (newEvents.length > 0) {
        setEntries((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const uniqueNew = newEvents.filter((e) => !existingIds.has(e.id));
          return [...uniqueNew.reverse(), ...prev].slice(0, 10);
        });
      }

      setLastFetchedBlock(blockNumber);
    };

    fetchNewEvents();
  }, [publicClient, hasContract, blockNumber, lastFetchedBlock, fetchEvents]);

  // Remove old entries after 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEntries((prev) => prev.filter((e) => now - e.timestamp < 120000));
    }, 10000);

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
              <div key={entry.id} className={`entry-item ${entry.type === 'donation' ? 'is-donation' : ''} ${entry.type === 'noWinner' ? 'is-no-winner' : ''} ${entry.type === 'newRound' ? 'is-new-round' : ''}`}>
                <span className="entry-pool">
                  {entry.type === 'donation' && '💎'}
                  {entry.type === 'entry' && (entry.poolId === 0 ? '🎈' : '🎪')}
                  {entry.type === 'noWinner' && '🎲'}
                  {entry.type === 'newRound' && '🔄'}
                </span>
                {entry.type === 'entry' || entry.type === 'donation' ? (
                  <>
                    <span className="entry-player">
                      <AddressDisplay address={entry.player} />
                    </span>
                    <span className="entry-phrase">{entry.phrase}</span>
                    <span className={`entry-amount ${entry.type === 'donation' ? 'nes-text is-primary' : 'nes-text is-success'}`}>
                      +{formatUSDC(entry.amount)} USDC
                    </span>
                  </>
                ) : entry.type === 'noWinner' ? (
                  <>
                    <span className="entry-phrase">{entry.phrase}</span>
                    <span className="entry-odds nes-text is-warning">
                      {entry.poolId === 0 ? 'Small' : 'Big'} Pool @ {(Number(entry.odds) / 10000).toFixed(3)}%
                    </span>
                  </>
                ) : entry.type === 'newRound' ? (
                  <>
                    <span className="entry-phrase">{entry.phrase}</span>
                    <span className="entry-round nes-text is-primary">
                      {entry.poolId === 0 ? 'Small' : 'Big'} Pool - Round #{entry.roundId}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
