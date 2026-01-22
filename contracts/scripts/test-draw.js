const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x9cde6D6Bd44790538a0548B6624a1c683A874e28";
  const poolId = process.argv[2] || "0"; // Default to small pool
  const seed = process.argv[3] || Math.floor(Math.random() * 1000000).toString();

  console.log("=== Test Draw ===\n");
  console.log("BubblePop Address:", bubblePopAddress);
  console.log("Pool ID:", poolId, poolId === "0" ? "(Small Pool)" : "(Big Pool)");
  console.log("Seed:", seed);

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  // Check pool state before
  const pool = await bubblePop.getPool(poolId);
  const entryCount = await bubblePop.getEntryCount(poolId);

  console.log("\nPool State Before:");
  console.log("- Jackpot:", hre.ethers.formatUnits(pool.jackpot, 6), "USDC");
  console.log("- Total Entries:", entryCount.toString());
  console.log("- In Grace Period:", pool.inGracePeriod);

  if (entryCount === 0n) {
    console.log("\n❌ No entries in pool! Enter the lottery first.");
    process.exit(1);
  }

  if (pool.inGracePeriod) {
    console.log("\n❌ Pool is in grace period. Wait for it to end.");
    process.exit(1);
  }

  console.log("\nExecuting testDraw...");
  const tx = await bubblePop.testDraw(poolId, seed);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed!");

  // Parse events
  for (const log of receipt.logs) {
    try {
      const parsed = bubblePop.interface.parseLog(log);
      if (parsed) {
        console.log("\nEvent:", parsed.name);
        if (parsed.name === "WinnerSelected") {
          console.log("  Winner:", parsed.args.winner);
          console.log("  Amount:", hre.ethers.formatUnits(parsed.args.amount, 6), "USDC");
          console.log("  House Fee:", hre.ethers.formatUnits(parsed.args.houseFee, 6), "USDC");
        }
        if (parsed.name === "GracePeriodStarted") {
          const endTime = new Date(Number(parsed.args.endTime) * 1000);
          console.log("  Grace Period Ends:", endTime.toLocaleString());
        }
      }
    } catch (e) {
      // Skip unparseable logs
    }
  }

  // Check pool state after
  const poolAfter = await bubblePop.getPool(poolId);
  console.log("\nPool State After:");
  console.log("- Jackpot (Rollover):", hre.ethers.formatUnits(poolAfter.jackpot, 6), "USDC");
  console.log("- Last Winner:", poolAfter.lastWinner);
  console.log("- Last Win Amount:", hre.ethers.formatUnits(poolAfter.lastWinAmount, 6), "USDC");
  console.log("- In Grace Period:", poolAfter.inGracePeriod);

  console.log("\n✅ Test draw completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
