const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x9cde6D6Bd44790538a0548B6624a1c683A874e28";
  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  console.log("=== Checking for WinnerSelected events ===\n");
  console.log("Contract:", bubblePopAddress);

  // Get current block
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);

  // Search in chunks of 50k blocks (RPC limit)
  const CHUNK_SIZE = 49000;
  const TOTAL_BLOCKS_TO_SEARCH = 200000; // Search last ~200k blocks
  const fromBlock = Math.max(0, currentBlock - TOTAL_BLOCKS_TO_SEARCH);
  console.log("Searching from block:", fromBlock, "to", currentBlock);
  console.log("");

  // Query WinnerSelected events in chunks
  const filter = bubblePop.filters.WinnerSelected();
  let events = [];

  for (let start = fromBlock; start < currentBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, currentBlock);
    console.log(`Searching blocks ${start} to ${end}...`);
    const chunkEvents = await bubblePop.queryFilter(filter, start, end);
    events = events.concat(chunkEvents);
  }

  console.log(`Found ${events.length} WinnerSelected events:\n`);

  for (const event of events) {
    const block = await event.getBlock();
    const date = new Date(block.timestamp * 1000);

    console.log("---");
    console.log("Pool:", event.args.poolId.toString());
    console.log("Winner:", event.args.winner);
    console.log("Amount:", hre.ethers.formatUnits(event.args.amount, 6), "USDC");
    console.log("House Fee:", hre.ethers.formatUnits(event.args.houseFee, 6), "USDC");
    console.log("Request ID:", event.args.requestId.toString());
    console.log("Block:", event.blockNumber);
    console.log("Date:", date.toLocaleString());
    console.log("Tx Hash:", event.transactionHash);
    console.log("");
  }

  if (events.length === 0) {
    console.log("No WinnerSelected events found in the search range.");
    console.log("\nLet's check all available events on the contract...\n");

    // Check for other events to confirm the contract is active
    const entryFilter = bubblePop.filters.EntrySubmitted();
    const entries = await bubblePop.queryFilter(entryFilter, fromBlock);
    console.log(`Found ${entries.length} EntrySubmitted events`);

    const donationFilter = bubblePop.filters.DonationReceived();
    const donations = await bubblePop.queryFilter(donationFilter, fromBlock);
    console.log(`Found ${donations.length} DonationReceived events`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
