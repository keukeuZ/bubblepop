import { useEffect, useState, useMemo } from 'react';

// ASCII bubble art patterns
const bubblePatterns = [
  `  ○  `,
  ` ◯◯ `,
  `  ◌  `,
  ` °°° `,
  `  •  `,
  ` ○○○ `,
  `◯`,
  `○`,
  `◌`,
  `°`,
  `•`,
  `( )`,
  `(○)`,
  `{◯}`,
  ` .oO `,
  `o O o`,
];

// Dollar/coin patterns for variety
const coinPatterns = [
  `$`,
  `$$`,
  `💰`,
  `🪙`,
  `✨`,
  `⭐`,
];

function getRandomPattern() {
  const allPatterns = [...bubblePatterns, ...coinPatterns];
  return allPatterns[Math.floor(Math.random() * allPatterns.length)];
}

function getRandomColor() {
  const colors = [
    'var(--accent-pink)',
    'var(--accent-blue)',
    'var(--success)',
    'var(--warning)',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function Bubble({ id, onComplete }) {
  const style = useMemo(() => ({
    left: `${Math.random() * 100}%`,
    animationDuration: `${15 + Math.random() * 20}s`,
    animationDelay: `${Math.random() * 5}s`,
    fontSize: `${0.8 + Math.random() * 1.2}rem`,
    color: getRandomColor(),
  }), []);

  const pattern = useMemo(() => getRandomPattern(), []);

  useEffect(() => {
    const duration = parseFloat(style.animationDuration) * 1000;
    const delay = parseFloat(style.animationDelay) * 1000;
    const timer = setTimeout(() => {
      onComplete(id);
    }, duration + delay);

    return () => clearTimeout(timer);
  }, [id, onComplete, style]);

  return (
    <div className="bubble" style={style}>
      {pattern}
    </div>
  );
}

export function ASCIIBackground() {
  const [bubbles, setBubbles] = useState([]);
  const [nextId, setNextId] = useState(0);

  // Initial bubbles
  useEffect(() => {
    const initialBubbles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
    }));
    setBubbles(initialBubbles);
    setNextId(15);
  }, []);

  // Add new bubbles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) => {
        if (prev.length < 20) {
          return [...prev, { id: nextId }];
        }
        return prev;
      });
      setNextId((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [nextId]);

  const handleBubbleComplete = (id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="ascii-background">
      {bubbles.map((bubble) => (
        <Bubble
          key={bubble.id}
          id={bubble.id}
          onComplete={handleBubbleComplete}
        />
      ))}
    </div>
  );
}
