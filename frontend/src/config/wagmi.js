import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

// Get WalletConnect Project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = getDefaultConfig({
  appName: 'BubblePop',
  projectId,
  chains: [base, baseSepolia, mainnet], // Base Mainnet primary, mainnet for ENS
  ssr: false,
  transports: {
    [base.id]: fallback([
      http(import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org'),
      http('https://base-rpc.publicnode.com'),
      http('https://base.meowrpc.com'),
    ]),
    [baseSepolia.id]: fallback([
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://sepolia.base.org'),
      http('https://base-sepolia.blockpi.network/v1/rpc/public'),
    ]),
    [mainnet.id]: http(),
  },
});

// Chain-specific contract addresses
const CONTRACT_ADDRESSES = {
  [base.id]: {
    bubblePop: import.meta.env.VITE_BUBBLEPOP_ADDRESS || '',
    usdc: import.meta.env.VITE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  [baseSepolia.id]: {
    bubblePop: import.meta.env.VITE_BUBBLEPOP_ADDRESS_SEPOLIA || '0x03c698e2162847E81A84614F7F4d6A10853Df3Db',
    usdc: import.meta.env.VITE_USDC_ADDRESS_SEPOLIA || '0xBB565fDeb1C4d6e9A3478dC5c128F9FC33133B8d',
  },
};

/**
 * Get contract addresses for a given chain ID.
 * Falls back to env vars without chain suffix for backwards compatibility.
 */
export function getContracts(chainId) {
  if (CONTRACT_ADDRESSES[chainId]) {
    return CONTRACT_ADDRESSES[chainId];
  }
  // Fallback: use env vars directly
  return {
    bubblePop: import.meta.env.VITE_BUBBLEPOP_ADDRESS || '',
    usdc: import.meta.env.VITE_USDC_ADDRESS || '',
  };
}

// Default contracts (for backwards compatibility with existing imports)
// Components should migrate to useContracts() hook for chain-aware addresses
export const contracts = {
  bubblePop: import.meta.env.VITE_BUBBLEPOP_ADDRESS || '',
  usdc: import.meta.env.VITE_USDC_ADDRESS || '',
};

// Chain IDs for reference
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
};
