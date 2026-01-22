const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x9cde6D6Bd44790538a0548B6624a1c683A874e28";
  const mockUSDCAddress = "0x5C634839a4C95A257796Dc52E55AF9fa4d0d5324";
  const poolId = process.argv[2] || "0"; // Default to small pool

  const [signer] = await hre.ethers.getSigners();

  console.log("=== Let Me Win! ===\n");
  console.log("Your address:", signer.address);
  console.log("Pool ID:", poolId, poolId === "0" ? "(Small Pool - 1 USDC)" : "(Big Pool - 10 USDC)");

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(mockUSDCAddress);

  // Step 1: Check pool state
  let pool = await bubblePop.getPool(poolId);
  console.log("\n--- Step 1: Check Pool State ---");
  console.log("Jackpot:", hre.ethers.formatUnits(pool.jackpot, 6), "USDC");
  console.log("In Grace Period:", pool.inGracePeriod);

  // Step 2: End grace period if needed
  if (pool.inGracePeriod) {
    console.log("\n--- Step 2: Ending Grace Period ---");
    const gracePeriodEnd = await bubblePop.getGracePeriodEnd(poolId);
    const now = Math.floor(Date.now() / 1000);

    if (now < gracePeriodEnd) {
      const waitTime = Number(gracePeriodEnd) - now;
      console.log(`Grace period ends in ${waitTime} seconds...`);
      console.log("Waiting for grace period to end...");
      await new Promise(resolve => setTimeout(resolve, (waitTime + 5) * 1000));
    }

    console.log("Calling endGracePeriod...");
    const endTx = await bubblePop.endGracePeriod(poolId);
    await endTx.wait();
    console.log("Grace period ended!");

    pool = await bubblePop.getPool(poolId);
  }

  // Step 3: Approve USDC if needed
  console.log("\n--- Step 3: Approve USDC ---");
  const entryPrice = pool.entryPrice;
  const allowance = await usdc.allowance(signer.address, bubblePopAddress);

  if (allowance < entryPrice) {
    console.log("Approving USDC...");
    const approveTx = await usdc.approve(bubblePopAddress, hre.ethers.MaxUint256);
    await approveTx.wait();
    console.log("Approved!");
  } else {
    console.log("Already approved");
  }

  // Step 4: Check USDC balance and mint if needed
  console.log("\n--- Step 4: Check USDC Balance ---");
  let balance = await usdc.balanceOf(signer.address);
  console.log("Your USDC balance:", hre.ethers.formatUnits(balance, 6));

  if (balance < entryPrice) {
    console.log("Minting more USDC...");
    const mintTx = await usdc.mint(signer.address, hre.ethers.parseUnits("1000", 6));
    await mintTx.wait();
    balance = await usdc.balanceOf(signer.address);
    console.log("New balance:", hre.ethers.formatUnits(balance, 6), "USDC");
  }

  // Step 5: Enter the lottery
  console.log("\n--- Step 5: Enter Lottery ---");
  const entryCountBefore = await bubblePop.getEntryCount(poolId);
  console.log("Current entry count:", entryCountBefore.toString());

  console.log("Entering lottery with", hre.ethers.formatUnits(entryPrice, 6), "USDC...");
  const enterTx = await bubblePop.enter(poolId);
  await enterTx.wait();

  const entryCountAfter = await bubblePop.getEntryCount(poolId);
  console.log("New entry count:", entryCountAfter.toString());
  console.log("Your entry index:", (entryCountAfter - 1n).toString());

  // Step 6: Calculate winning seed
  console.log("\n--- Step 6: Trigger Winning Draw ---");
  const myEntryIndex = entryCountAfter - 1n; // Your entry is the last one
  const totalEntries = entryCountAfter;

  // Seed that will select our entry: seed % totalEntries = myEntryIndex
  // Simply use myEntryIndex as seed (since myEntryIndex % totalEntries = myEntryIndex for myEntryIndex < totalEntries)
  const winningSeed = myEntryIndex;

  console.log("Total entries:", totalEntries.toString());
  console.log("Your entry index:", myEntryIndex.toString());
  console.log("Using seed:", winningSeed.toString(), "(seed % entries =", Number(winningSeed % totalEntries), ")");

  // Step 7: Execute testDraw with winning seed
  console.log("\nExecuting testDraw...");
  const drawTx = await bubblePop.testDraw(poolId, winningSeed);
  console.log("Transaction hash:", drawTx.hash);

  const receipt = await drawTx.wait();
  console.log("Transaction confirmed!");

  // Parse events
  for (const log of receipt.logs) {
    try {
      const parsed = bubblePop.interface.parseLog(log);
      if (parsed) {
        if (parsed.name === "WinnerSelected") {
          console.log("\n🎉🎉🎉 YOU WON! 🎉🎉🎉");
          console.log("Winner:", parsed.args.winner);
          console.log("Amount:", hre.ethers.formatUnits(parsed.args.amount, 6), "USDC");
          console.log("House Fee:", hre.ethers.formatUnits(parsed.args.houseFee, 6), "USDC");
        }
      }
    } catch (e) {
      // Skip unparseable logs
    }
  }

  // Final state
  const finalPool = await bubblePop.getPool(poolId);
  const finalBalance = await usdc.balanceOf(signer.address);

  console.log("\n--- Final State ---");
  console.log("Your USDC balance:", hre.ethers.formatUnits(finalBalance, 6), "USDC");
  console.log("Pool Rollover:", hre.ethers.formatUnits(finalPool.jackpot, 6), "USDC");
  console.log("Last Winner:", finalPool.lastWinner);

  if (finalPool.lastWinner.toLowerCase() === signer.address.toLowerCase()) {
    console.log("\n✅ Congratulations! You are the winner!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
