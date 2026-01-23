const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x0A36BA086aF3843c7b168523651DE80ccC1C79Ca";
  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  console.log("=== Pool Status ===\n");

  for (let poolId = 0; poolId <= 1; poolId++) {
    const pool = await bubblePop.getPool(poolId);
    const entries = await bubblePop.getEntryCount(poolId);

    console.log(`Pool ${poolId} (${poolId === 0 ? "Small - 1 USDC" : "Big - 10 USDC"})`);
    console.log("  Jackpot:", hre.ethers.formatUnits(pool.jackpot, 6), "USDC");
    console.log("  Entries:", entries.toString());
    console.log("  In Grace Period:", pool.inGracePeriod);

    if (pool.inGracePeriod) {
      const gracePeriodEnd = await bubblePop.getGracePeriodEnd(poolId);
      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(gracePeriodEnd) - now;
      console.log("  Grace Period Ends:", new Date(Number(gracePeriodEnd) * 1000).toLocaleString());

      if (remaining > 0) {
        console.log("  Remaining:", remaining, "seconds");
      } else {
        console.log("  Status: READY TO END - calling endGracePeriod...");
        const tx = await bubblePop.endGracePeriod(poolId);
        await tx.wait();
        console.log("  ✅ Grace period ended!");
      }
    }
    console.log("");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
