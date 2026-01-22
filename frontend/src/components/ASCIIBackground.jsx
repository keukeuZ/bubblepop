import { useEffect, useState, useMemo } from 'react';

// ASCII bubble art patterns - various sizes
const bubblePatterns = [
  // Tiny
  `·`,
  `•`,
  `°`,
  `◦`,
  `∘`,
  // Small
  `○`,
  `◯`,
  `◌`,
  `⊙`,
  `⊚`,
  `◎`,
  // Medium
  `( )`,
  `(○)`,
  `(•)`,
  `{◯}`,
  `[○]`,
  // Cluster patterns
  `°°`,
  `••`,
  `○○`,
  `°•°`,
  `•°•`,
  `.oO`,
  `oOo`,
  `°o°`,
  // Decorative
  `⊛`,
  `✧`,
  `◇`,
  `◈`,
  `❂`,
  `❈`,
];

// Dollar/coin patterns for variety
const coinPatterns = [
  `$`,
  `$$`,
  `💰`,
  `🪙`,
  `✨`,
  `⭐`,
  `💎`,
  `🫧`,
  `○`,
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
    '#ff6b9d',  // bright pink
    '#00d4ff',  // cyan
    '#a855f7',  // purple
    '#f97316',  // orange
    '#22d3ee',  // light cyan
    '#c084fc',  // light purple
    '#fb7185',  // coral
    '#34d399',  // emerald
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function Bubble({ id, onComplete }) {
  // More variety in sizes: tiny (0.5rem) to large (3rem)
  const sizeRand = Math.random();
  let fontSize;
  if (sizeRand < 0.3) {
    // 30% tiny bubbles
    fontSize = 0.4 + Math.random() * 0.4;
  } else if (sizeRand < 0.7) {
    // 40% medium bubbles
    fontSize = 0.8 + Math.random() * 0.8;
  } else if (sizeRand < 0.9) {
    // 20% large bubbles
    fontSize = 1.6 + Math.random() * 1.0;
  } else {
    // 10% extra large bubbles
    fontSize = 2.6 + Math.random() * 1.0;
  }

  const style = useMemo(() => ({
    left: `${Math.random() * 100}%`,
    animationDuration: `${10 + Math.random() * 25}s`,
    animationDelay: `${Math.random() * 3}s`,
    fontSize: `${fontSize}rem`,
    color: getRandomColor(),
    opacity: 0.15 + Math.random() * 0.35,
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

  // Initial bubbles - start with more
  useEffect(() => {
    const initialBubbles = Array.from({ length: 35 }, (_, i) => ({
      id: i,
    }));
    setBubbles(initialBubbles);
    setNextId(35);
  }, []);

  // Add new bubbles more frequently
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) => {
        if (prev.length < 50) {
          // Add 1-3 bubbles at a time for more variety
          const newBubbles = Array.from(
            { length: 1 + Math.floor(Math.random() * 2) },
            (_, i) => ({ id: nextId + i })
          );
          return [...prev, ...newBubbles];
        }
        return prev;
      });
      setNextId((prev) => prev + 3);
    }, 1500);

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
