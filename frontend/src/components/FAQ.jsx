import { useState } from 'react';

const FAQ_ITEMS = [
  {
    question: 'How does BubblePop work?',
    answer: 'Pay 1 or 10 USDC to enter a pool. Each entry has a chance to win the entire jackpot. Winners are selected randomly using Chainlink VRF, which provides provably fair and verifiable randomness.',
  },
  {
    question: 'What are the odds of winning?',
    answer: 'Odds start at 0.001% per entry and gradually increase to 0.01% over 14 days. This gentle escalation means longer rounds build bigger jackpots while still giving early entries a chance.',
  },
  {
    question: 'Is the game fair?',
    answer: 'Yes! We use Chainlink VRF (Verifiable Random Function) which provides cryptographically secure randomness that cannot be manipulated by anyone - not even us. Every winner selection can be verified on-chain.',
  },
  {
    question: 'What happens when someone wins?',
    answer: 'The winner receives 99.1% of the jackpot instantly to their wallet. The remaining 0.9% rolls over to seed the next round\'s jackpot - so the pot is never empty! After a 1-hour grace period for verification, a new round begins with the rolled-over funds.',
  },
  {
    question: 'What is the Rolling Pot?',
    answer: 'When someone wins, 0.9% of the jackpot automatically seeds the next round. This means the jackpot is never zero - every new round starts with funds already in the pot. The more people play over time, the larger these rolling seed amounts become!',
  },
  {
    question: 'What is USDC?',
    answer: 'USDC is a stablecoin pegged 1:1 to the US Dollar. It runs on the blockchain and is widely trusted. You can get USDC from exchanges like Coinbase or swap other crypto for it.',
  },
  {
    question: 'Why Base blockchain?',
    answer: 'Base is an Ethereum Layer 2 built by Coinbase. It offers fast transactions, low fees, and strong security inherited from Ethereum. Perfect for a fair, transparent lottery.',
  },
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="faq-item">
      <button
        className={`faq-question ${isOpen ? 'is-open' : ''}`}
        onClick={onToggle}
      >
        <span>{question}</span>
        <span className="faq-icon">{isOpen ? '-' : '+'}</span>
      </button>
      {isOpen && (
        <div className="faq-answer">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <div className="nes-container with-title">
        <p className="title">FAQ</p>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
        <div className="trust-badges">
          <span className="trust-badge">
            <span className="badge-icon">&#x2713;</span> Chainlink VRF
          </span>
          <span className="trust-badge">
            <span className="badge-icon">&#x2713;</span> Built on Base
          </span>
          <span className="trust-badge">
            <span className="badge-icon">&#x2713;</span> Open Source
          </span>
        </div>
      </div>
    </section>
  );
}
