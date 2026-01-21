import { useState, useEffect } from 'react';

/**
 * Format elapsed time as HH:MM:SS or DD:HH:MM:SS
 */
function formatElapsedTime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n) => n.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

export function PoolTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || startTime === 0) return;

    // Calculate initial elapsed time
    const now = Math.floor(Date.now() / 1000);
    const start = Number(startTime);
    setElapsed(Math.max(0, now - start));

    // Update every second
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setElapsed(Math.max(0, now - start));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime || startTime === 0) {
    return null;
  }

  return (
    <div className="pool-timer">
      <span className="timer-icon">⏱</span>
      <span className="timer-label">Running:</span>
      <span className="timer-value">{formatElapsedTime(elapsed)}</span>
    </div>
  );
}
