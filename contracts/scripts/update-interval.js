const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x03c698e2162847E81A84614F7F4d6A10853Df3Db";
  const bubblePop = await hre.ethers.getContractAt("BubblePop", bubblePopAddress);

  console.log("Updating automation interval to 4 hours (14400 seconds)...");
  const tx = await bubblePop.setAutomationConfig(true, 1, 14400);
  await tx.wait();
  console.log("Done! TX:", tx.hash);

  // Verify
  const interval = await bubblePop.minIntervalBetweenDraws();
  console.log("New interval:", interval.toString(), "seconds =", Number(interval) / 3600, "hours");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
