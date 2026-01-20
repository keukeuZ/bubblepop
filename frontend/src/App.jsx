import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { CHAIN_IDS } from './config/wagmi';
import { JackpotCard } from './components/JackpotCard';
import { WinnerHistory } from './components/WinnerHistory';
import { SponsorBoard } from './components/SponsorBoard';
import { FAQ } from './components/FAQ';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SMALL_POOL, BIG_POOL } from './hooks/useContract';
import './App.css';

function App() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();

  const isCorrectNetwork = chainId === CHAIN_IDS.BASE_SEPOLIA || chainId === CHAIN_IDS.BASE_MAINNET;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="app">
        <header className="header">
          <div className="logo">
            <h1 className="nes-text is-primary">BubblePop</h1>
          </div>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </header>

        <main className="main">
          <section className="nes-container is-dark with-title">
            <p className="title">Welcome!</p>
            <p>Pop the bubble. Win the jackpot.</p>
            <p className="nes-text is-warning">1 USDC or 10 USDC per entry</p>
          </section>

          {isConnected && !isCorrectNetwork && (
            <section className="nes-container is-rounded is-error">
              <p>Wrong network! Please switch to Base Sepolia or Base Mainnet.</p>
            </section>
          )}

          <div className="jackpots">
            <JackpotCard
              poolId={SMALL_POOL}
              title="Small Pot"
              isCorrectNetwork={isCorrectNetwork}
            />
            <JackpotCard
              poolId={BIG_POOL}
              title="Big Pot"
              isCorrectNetwork={isCorrectNetwork}
            />
          </div>

          <section className="nes-container with-title">
            <p className="title">How It Works</p>
            <ul className="nes-list is-disc">
              <li>Pay 1 or 10 USDC to enter</li>
              <li>Win the entire jackpot or nothing</li>
              <li>Winners picked randomly (Chainlink VRF)</li>
              <li>Instant payout to your wallet</li>
            </ul>
          </section>

          <FAQ />

          <WinnerHistory />

          <SponsorBoard />

          {isConnected && (
            <section className="nes-container is-dark with-title">
              <p className="title">Your Wallet</p>
              <p className="wallet-address">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <p className="network-status">
                Network: {chainId === CHAIN_IDS.BASE_SEPOLIA ? 'Base Sepolia (Testnet)' :
                         chainId === CHAIN_IDS.BASE_MAINNET ? 'Base Mainnet' : 'Unknown'}
              </p>
            </section>
          )}
        </main>

        <footer className="footer">
          <p className="nes-text is-disabled">
            Built on Base | Provably Fair
          </p>
        </footer>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
