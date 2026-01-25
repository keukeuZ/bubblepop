const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x03c698e2162847E81A84614F7F4d6A10853Df3Db";

  console.log("=== VRF Debug Info ===\n");

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  // Get VRF config from contract
  const subscriptionId = await bubblePop.s_subscriptionId();
  const keyHash = await bubblePop.s_keyHash();
  const callbackGasLimit = await bubblePop.s_callbackGasLimit();
  const requestConfirmations = await bubblePop.s_requestConfirmations();

  console.log("Contract VRF Configuration:");
  console.log("- Subscription ID:", subscriptionId.toString());
  console.log("- Key Hash:", keyHash);
  console.log("- Callback Gas Limit:", callbackGasLimit.toString());
  console.log("- Request Confirmations:", requestConfirmations.toString());

  // Check automation config
  const automationEnabled = await bubblePop.automationEnabled();
  const minEntries = await bubblePop.minEntriesForDraw();
  const minInterval = await bubblePop.minIntervalBetweenDraws();

  console.log("\nAutomation Configuration:");
  console.log("- Enabled:", automationEnabled);
  console.log("- Min Entries:", minEntries.toString());
  console.log("- Min Interval:", minInterval.toString(), "seconds");

  // Check pool states
  for (let poolId = 0; poolId < 2; poolId++) {
    const pool = await bubblePop.getPool(poolId);
    const entryCount = await bubblePop.getEntryCount(poolId);

    console.log(`\nPool ${poolId} (${poolId === 0 ? "Small" : "Big"}):`);
    console.log("- Jackpot:", hre.ethers.formatUnits(pool.jackpot, 6), "USDC");
    console.log("- Total Entries:", entryCount.toString());
    console.log("- VRF Request Pending:", pool.vrfRequestPending);
    console.log("- In Grace Period:", pool.inGracePeriod);
    console.log("- Round Start Time:", new Date(Number(pool.roundStartTime) * 1000).toLocaleString());
  }

  // Expected Base Sepolia VRF v2.5 configuration
  console.log("\n=== Expected Base Sepolia VRF v2.5 Config ===");
  console.log("VRF Coordinator: 0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9");
  console.log("Key Hash (500 gwei): 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71");

  // Check if subscription ID looks valid
  if (subscriptionId === 0n) {
    console.log("\n WARNING: Subscription ID is 0! Update using setVRFConfig()");
  }

  // Try to simulate a VRF request to see what error we get
  console.log("\n=== Attempting to check VRF eligibility ===");
  try {
    const [upkeepNeeded, performData] = await bubblePop.checkUpkeep("0x");
    console.log("Upkeep Needed:", upkeepNeeded);
    if (upkeepNeeded) {
      const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(
        ["bool", "bool", "bool", "bool"],
        performData
      );
      console.log("- Pool 0 Eligible:", decoded[0]);
      console.log("- Pool 1 Eligible:", decoded[1]);
      console.log("- Pool 0 Forced Draw:", decoded[2]);
      console.log("- Pool 1 Forced Draw:", decoded[3]);
    }
  } catch (e) {
    console.log("checkUpkeep error:", e.message);
  }

  console.log("\n=== Next Steps ===");
  console.log("1. Verify the VRF Coordinator address is correct for Base Sepolia VRF v2.5");
  console.log("2. Check that the contract is added as consumer in the VRF subscription");
  console.log("3. Ensure the subscription has LINK balance");
  console.log("4. Verify the key hash matches a supported gas lane");
  console.log("\nTo test without VRF, use: npx hardhat run scripts/test-draw.js --network baseSepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
