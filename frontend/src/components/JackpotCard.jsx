import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import {
  usePoolData,
  usePlayerEntries,
  useUSDCBalance,
  formatUSDC,
  SMALL_POOL,
} from '../hooks/useContract';
import { useEntryFlow } from '../hooks/useEntry';
import { useDonationFlow, useUserDonation } from '../hooks/useDonation';
import { useTransactionToast } from '../hooks/useTransactionToast';
import { useToast } from './Toast';
import { GracePeriodCountdown } from './GracePeriodCountdown';
import { PoolTimer } from './PoolTimer';
import { useContracts } from '../hooks/useContracts';

// Random fun phrases shown before/during entry
const entryPhrases = [
  "Feeling lucky, punk?",
  "Fortune favors the bold!",
  "Will today be your day?",
  "Ready to pop some bubbles?",
  "Let's see what fate decides...",
  "The jackpot awaits!",
  "Cross your fingers!",
  "Here goes nothing!",
  "Lady Luck, be kind!",
  "To the moon or bust!",
];

function getRandomPhrase() {
  return entryPhrases[Math.floor(Math.random() * entryPhrases.length)];
}

export function JackpotCard({ poolId, title, isCorrectNetwork }) {
  const { isConnected, address } = useAccount();
  const toast = useToast();
  const contracts = useContracts();
  const hasContract = !!contracts.bubblePop;

  // Donation state
  const [donationAmount, setDonationAmount] = useState('');
  const [showDonation, setShowDonation] = useState(false);

  // Random phrase for entry button
  const [entryPhrase, setEntryPhrase] = useState(getRandomPhrase());

  // Read pool data from contract
  const {
    pool,
    jackpotFormatted,
    winChanceFormatted,
    entryCount,
    isOpen,
    inGracePeriod,
    gracePeriodEnd,
    gracePeriodElapsed,
    roundId,
    timeUntilForcedDraw,
    isLoading: poolLoading,
    refetch: refetchPool,
  } = usePoolData(poolId);

  // Format time until forced draw
  const formatForcedDrawTime = (seconds) => {
    if (seconds <= 0) return 'Eligible now';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Read player's entries
  const { entries: playerEntries } = usePlayerEntries(poolId, address);

  // Read USDC balance and allowance
  const {
    balance: usdcBalance,
    balanceFormatted: usdcBalanceFormatted,
    allowance,
    refetch: refetchBalance,
  } = useUSDCBalance(address);

  // Entry flow hooks
  const { approval, entry, entryPrice, isLoading, resetAll } = useEntryFlow(poolId);

  // Donation flow hooks
  const {
    approval: donationApproval,
    donation,
    isLoading: isDonationLoading,
    resetAll: resetDonation,
    parseAmount,
  } = useDonationFlow();

  // User's current donation for this round
  const { donationAmount: userDonation, refetch: refetchDonation } = useUserDonation(poolId, address);

  const entryPriceDisplay = poolId === SMALL_POOL ? '1' : '10';

  // Check if user has enough balance
  const hasEnoughBalance = usdcBalance && usdcBalance >= entryPrice;

  // Check if approval is needed
  const needsApproval = allowance !== undefined && allowance < entryPrice;

  // Parse and validate donation amount (before toast hooks so closures capture correctly)
  const parsedDonationAmount = parseAmount(donationAmount);
  const hasEnoughForDonation = usdcBalance && parsedDonationAmount > 0n && usdcBalance >= parsedDonationAmount;
  const needsDonationApproval = allowance !== undefined && parsedDonationAmount > 0n && allowance < parsedDonationAmount;

  // Transaction feedback toasts
  useTransactionToast(approval, toast, {
    successMessage: 'USDC approved! Entering pool...',
    errorPrefix: 'Approval failed',
    onSuccess: () => {
      refetchBalance();
      // Auto-trigger entry after approval
      entry.enter(poolId);
    },
  });

  const luckMessages = [
    "Entry confirmed! Fingers crossed!",
    "You're in! May the odds be in your favor!",
    "Bubble submitted! Good luck!",
    "Entry locked in! Let's see what happens!",
    "You're playing! Dreams can come true!",
  ];
  useTransactionToast(entry, toast, {
    successMessage: luckMessages[Math.floor(Math.random() * luckMessages.length)],
    errorPrefix: 'Entry failed',
    onSuccess: () => { refetchPool(); refetchBalance(); setEntryPhrase(getRandomPhrase()); },
  });

  useTransactionToast(donationApproval, toast, {
    successMessage: 'USDC approved! Donating...',
    errorPrefix: 'Approval failed',
    onSuccess: () => {
      refetchBalance();
      // Auto-trigger donation after approval
      if (parsedDonationAmount > 0n) {
        donation.donate(poolId, parsedDonationAmount);
      }
    },
  });

  useTransactionToast(donation, toast, {
    successMessage: 'Donation confirmed! Thank you for your contribution!',
    errorPrefix: 'Donation failed',
    onSuccess: () => { setDonationAmount(''); setShowDonation(false); refetchPool(); refetchDonation(); },
  });

  const handleEnter = async () => {
    if (!hasContract) {
      toast.error('Contract not deployed yet');
      return;
    }

    if (!hasEnoughBalance) {
      toast.error(`Insufficient USDC balance. You have ${usdcBalanceFormatted} USDC`);
      return;
    }

    if (needsApproval) {
      // First approve
      toast.info('Please approve USDC spending...');
      approval.approveMax();
    } else {
      // Direct entry - show fun phrase
      toast.info(entryPhrase);
      entry.enter(poolId);
    }
  };

  const handleDonate = async () => {
    if (!hasContract) {
      toast.error('Contract not deployed yet');
      return;
    }

    if (parsedDonationAmount <= 0n) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    if (!hasEnoughForDonation) {
      toast.error(`Insufficient USDC balance. You have ${usdcBalanceFormatted} USDC`);
      return;
    }

    if (needsDonationApproval) {
      toast.info('Please approve USDC spending for donation...');
      donationApproval.approveMax();
    } else {
      toast.info('Confirming donation...');
      donation.donate(poolId, parsedDonationAmount);
    }
  };

  // Determine button state
  const getButton = () => {
    if (!isConnected) {
      return (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button className="nes-btn is-primary" onClick={openConnectModal}>
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      );
    }

    if (!isCorrectNetwork) {
      return (
        <button className="nes-btn is-warning" disabled>
          Wrong Network
        </button>
      );
    }

    if (!hasContract) {
      return (
        <button className="nes-btn" disabled>
          Not Deployed
        </button>
      );
    }

    if (!isOpen) {
      return (
        <button className="nes-btn is-warning" disabled>
          Grace Period
        </button>
      );
    }

    if (isLoading) {
      const loadingText = approval.isPending ? 'Approve in wallet...' :
                          approval.isConfirming ? 'Approving...' :
                          entry.isPending ? 'Confirm in wallet...' :
                          entry.isConfirming ? 'Entering...' : 'Loading...';
      return (
        <button className="nes-btn" disabled>
          {loadingText}
        </button>
      );
    }

    if (!hasEnoughBalance) {
      return (
        <button className="nes-btn is-error" disabled>
          Insufficient USDC
        </button>
      );
    }

    if (needsApproval) {
      return (
        <button className="nes-btn is-warning" onClick={handleEnter}>
          Approve USDC
        </button>
      );
    }

    return (
      <button className="nes-btn is-success" onClick={handleEnter}>
        Enter ({entryPriceDisplay} USDC)
      </button>
    );
  };

  return (
    <div className="nes-container with-title jackpot-card">
      <p className="title">{title}</p>

      {/* Grace Period Display - only show countdown if grace period is active AND not elapsed */}
      {inGracePeriod && gracePeriodEnd > 0 && !gracePeriodElapsed ? (
        <GracePeriodCountdown
          endTime={gracePeriodEnd}
          lastWinner={pool?.lastWinner}
          lastWinAmount={pool?.lastWinAmount}
          formatUSDC={formatUSDC}
        />
      ) : (
        <>
          {/* Jackpot Amount */}
          <div className="jackpot-display">
            <p className="jackpot-label">Jackpot</p>
            <p className="jackpot-amount nes-text is-success">
              {poolLoading ? '...' : hasContract ? jackpotFormatted : '0.00'} USDC
            </p>
          </div>

          {/* Running Timer */}
          {hasContract && pool?.roundStartTime && (
            <PoolTimer startTime={pool.roundStartTime} />
          )}

          {/* Stats Grid */}
          <div className="pool-stats">
            <div className="stat">
              <span className="stat-label">Entry</span>
              <span className="stat-value">{entryPriceDisplay} USDC</span>
            </div>
            <div className="stat">
              <span className="stat-label">Entries</span>
              <span className="stat-value">{hasContract ? entryCount : 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Win Chance</span>
              <span className="stat-value nes-text is-primary">
                {hasContract ? winChanceFormatted : '0.001%'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Round</span>
              <span className="stat-value">#{hasContract ? roundId + 1 : 1}</span>
            </div>
          </div>

          {/* Guaranteed Winner Countdown - 90 day rule */}
          {hasContract && timeUntilForcedDraw > 0 && (
            <div className="forced-draw-info">
              <span className="forced-draw-label">Guaranteed winner in:</span>
              <span className="forced-draw-time nes-text is-warning">
                {formatForcedDrawTime(timeUntilForcedDraw)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Player's balance and entries */}
      {isConnected && (
        <div className="player-info">
          {hasContract && playerEntries > 0 && (
            <p className="player-entries">
              Your entries: <span className="nes-text is-primary">{playerEntries}</span>
            </p>
          )}
          <p className="player-balance">
            Balance: <span className="nes-text is-warning">{usdcBalanceFormatted} USDC</span>
          </p>
        </div>
      )}

      {/* Action Button */}
      {getButton()}

      {/* Donation Section */}
      {isConnected && hasContract && isOpen && (
        <div className="donation-section">
          {!showDonation ? (
            <button
              className="nes-btn is-primary donation-toggle"
              onClick={() => setShowDonation(true)}
            >
              Donate to {title}
            </button>
          ) : (
            <div className="donation-form">
              <div className="donation-input-row">
                <input
                  type="number"
                  className="nes-input donation-input"
                  placeholder="Amount"
                  min="0.01"
                  step="0.01"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  disabled={isDonationLoading}
                />
                <span className="donation-currency">USDC</span>
              </div>
              <div className="donation-buttons">
                {isDonationLoading ? (
                  <button className="nes-btn" disabled>
                    {donationApproval.isPending ? 'Approve in wallet...' :
                     donationApproval.isConfirming ? 'Approving...' :
                     donation.isPending ? 'Confirm in wallet...' :
                     donation.isConfirming ? 'Donating...' : 'Loading...'}
                  </button>
                ) : needsDonationApproval ? (
                  <button
                    className="nes-btn is-warning"
                    onClick={handleDonate}
                    disabled={!parsedDonationAmount || parsedDonationAmount <= 0n}
                  >
                    Approve USDC
                  </button>
                ) : (
                  <button
                    className="nes-btn is-success"
                    onClick={handleDonate}
                    disabled={!parsedDonationAmount || parsedDonationAmount <= 0n || !hasEnoughForDonation}
                  >
                    Donate
                  </button>
                )}
                <button
                  className="nes-btn"
                  onClick={() => {
                    setShowDonation(false);
                    setDonationAmount('');
                  }}
                  disabled={isDonationLoading}
                >
                  Cancel
                </button>
              </div>
              {userDonation > 0n && (
                <p className="your-donation">
                  Your donation this round: <span className="nes-text is-success">{formatUSDC(userDonation)} USDC</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Last Winner - only show when NOT in grace period (grace period shows this info) */}
      {!inGracePeriod && pool?.lastWinner && pool.lastWinner !== '0x0000000000000000000000000000000000000000' && (
        <div className="last-winner">
          <p className="last-winner-label">Last Winner</p>
          <p className="last-winner-address">
            {pool.lastWinner.slice(0, 6)}...{pool.lastWinner.slice(-4)}
          </p>
          <p className="last-winner-amount">
            Won {formatUSDC(pool.lastWinAmount)} USDC
          </p>
        </div>
      )}
    </div>
  );
}
