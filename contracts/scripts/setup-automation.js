const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Setting up automation with account:", owner.address);

  // Contract address - update this after deployment
  const BUBBLEPOP_ADDRESS = "0x03c698e2162847E81A84614F7F4d6A10853Df3Db";

  const bubblePop = await hre.ethers.getContractAt("BubblePop", BUBBLEPOP_ADDRESS);

  // Configuration for automation
  const enabled = true;
  const minEntries = 1;  // Minimum entries before draw eligible
  const minInterval = 14400; // 4 hours in seconds

  console.log("\nCurrent automation config:");
  console.log("- automationEnabled:", await bubblePop.automationEnabled());
  console.log("- minEntriesForDraw:", await bubblePop.minEntriesForDraw());
  console.log("- minIntervalBetweenDraws:", await bubblePop.minIntervalBetweenDraws());

  console.log("\nEnabling automation with config:");
  console.log("- enabled:", enabled);
  console.log("- minEntries:", minEntries);
  console.log("- minInterval:", minInterval, "seconds (", minInterval / 3600, "hours)");

  const tx = await bubblePop.setAutomationConfig(enabled, minEntries, minInterval);
  await tx.wait();

  console.log("\n✅ Automation configured!");
  console.log("Transaction hash:", tx.hash);

  console.log("\n📋 Next Steps:");
  console.log("1. Go to https://automation.chain.link/base-sepolia");
  console.log("2. Click 'Register new Upkeep'");
  console.log("3. Select 'Custom logic'");
  console.log("4. Enter this contract address:", BUBBLEPOP_ADDRESS);
  console.log("5. Fund the upkeep with LINK tokens");
  console.log("6. Set a reasonable gas limit (e.g., 500000)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
