const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x03c698e2162847E81A84614F7F4d6A10853Df3Db";

  console.log("=== Checking for NoWinnerThisRoll events ===\n");

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 49000; // Stay under 50k block limit

  console.log(`Searching blocks ${fromBlock} to ${currentBlock}...`);

  const filter = bubblePop.filters.NoWinnerThisRoll();
  const events = await bubblePop.queryFilter(filter, fromBlock, currentBlock);

  console.log(`Found ${events.length} NoWinnerThisRoll events:\n`);

  for (const event of events) {
    const block = await event.getBlock();
    console.log("---");
    console.log("Pool:", event.args.poolId.toString());
    console.log("Request ID:", event.args.requestId.toString());
    console.log("Current Odds:", event.args.currentOdds.toString(), "/ 1,000,000 =", (Number(event.args.currentOdds) / 10000).toFixed(4) + "%");
    console.log("Block:", event.blockNumber);
    console.log("Date:", new Date(Number(block.timestamp) * 1000).toLocaleString());
    console.log("Tx:", event.transactionHash);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
