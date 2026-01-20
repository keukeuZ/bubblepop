// BubblePop Contract ABI - Essential functions for frontend
export const BUBBLEPOP_ABI = [
  // View functions
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "getPool",
    outputs: [
      {
        components: [
          { name: "entryPrice", type: "uint256" },
          { name: "jackpot", type: "uint256" },
          { name: "roundStartTime", type: "uint256" },
          { name: "lastPayoutTime", type: "uint256" },
          { name: "totalEntries", type: "uint256" },
          { name: "inGracePeriod", type: "bool" },
          { name: "vrfRequestPending", type: "bool" },
          { name: "lastWinner", type: "address" },
          { name: "lastWinAmount", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "getEntryCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    name: "getPlayerEntries",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "getCurrentWinChance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "isPoolOpen",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "getGracePeriodEnd",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "CHANCE_DENOMINATOR",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GRACE_PERIOD",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdc",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "enter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "endGracePeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "donate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Donation view functions
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "maxResults", type: "uint256" },
    ],
    name: "getTopDonorsCurrentRound",
    outputs: [
      { name: "donors", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "maxResults", type: "uint256" }],
    name: "getTopDonorsYearly",
    outputs: [
      { name: "donors", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "donor", type: "address" },
    ],
    name: "getDonorAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "getCurrentRoundDonorCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "entryNumber", type: "uint256" },
      { indexed: false, name: "blockNumber", type: "uint256" },
    ],
    name: "EntrySubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: true, name: "winner", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "houseFee", type: "uint256" },
      { indexed: false, name: "requestId", type: "uint256" },
    ],
    name: "WinnerSelected",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: false, name: "endTime", type: "uint256" },
    ],
    name: "GracePeriodStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "poolId", type: "uint256" }],
    name: "GracePeriodEnded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: true, name: "donor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "newJackpot", type: "uint256" },
    ],
    name: "DonationReceived",
    type: "event",
  },
];

// Standard ERC20 ABI for USDC interactions
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];
