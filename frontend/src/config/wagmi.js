import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

// Get WalletConnect Project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

// Custom Base Sepolia chain with multiple RPC endpoints
const baseSepoliaWithFallbacks = {
  ...baseSepolia,
  rpcUrls: {
    default: {
      http: ['https://base-sepolia-rpc.publicnode.com'],
    },
    public: {
      http: ['https://base-sepolia-rpc.publicnode.com'],
    },
  },
};

export const config = getDefaultConfig({
  appName: 'BubblePop',
  projectId,
  chains: [baseSepoliaWithFallbacks, base, mainnet], // mainnet needed for ENS resolution
  ssr: false,
  transports: {
    // Use fallback transports for Base Sepolia with multiple RPCs
    [baseSepolia.id]: fallback([
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://sepolia.base.org'),
      http('https://base-sepolia.blockpi.network/v1/rpc/public'),
    ]),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
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
