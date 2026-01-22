import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet } from 'wagmi/chains';

// Get WalletConnect Project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = getDefaultConfig({
  appName: 'BubblePop',
  projectId,
  chains: [baseSepolia, base, mainnet], // mainnet needed for ENS resolution
  ssr: false,
});

// Contract addresses (set after deployment)
export const contracts = {
  bubblePop: import.meta.env.VITE_BUBBLEPOP_ADDRESS || '',
  usdc: import.meta.env.VITE_USDC_ADDRESS || '',
};

// Chain IDs for reference
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
};
