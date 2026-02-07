import { useState, useEffect } from 'react';

export function GracePeriodCountdown({ endTime, lastWinner, lastWinAmount, formatUSDC }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    return remaining > 0 ? remaining : 0;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (timeLeft <= 0) {
    return (
      <div className="grace-period-box grace-period-ended">
        <p className="grace-title">Grace Period Ended</p>
        <p className="grace-subtitle">Pool will reopen shortly</p>
      </div>
    );
  }

  return (
    <div className="grace-period-box">
      <div className="grace-header">
        <i className="nes-icon trophy is-small"></i>
        <span className="grace-title">Winner Selected!</span>
      </div>

      <div className="grace-winner-info">
        <p className="winner-address-display">
          {formatAddress(lastWinner)}
        </p>
        <p className="winner-amount-display nes-text is-success">
          Won {formatUSDC(lastWinAmount)} USDC
        </p>
      </div>

      <div className="grace-countdown">
        <p className="countdown-label">Cooldown Period</p>
        <p className="countdown-timer nes-text is-warning">
          {formatTime(timeLeft)}
        </p>
        <p className="countdown-note">
          Pool reopens after grace period
        </p>
      </div>

      <div className="verification-note">
        <i className="nes-icon is-small star"></i>
        <span>Provably fair via Chainlink VRF</span>
      </div>
    </div>
  );
}
