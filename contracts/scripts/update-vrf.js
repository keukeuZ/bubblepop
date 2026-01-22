const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x9cde6D6Bd44790538a0548B6624a1c683A874e28";

  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    console.error("VRF_SUBSCRIPTION_ID not set in .env");
    process.exit(1);
  }

  console.log("Updating VRF config for BubblePop at:", bubblePopAddress);
  console.log("New Subscription ID:", subscriptionId);

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  // Base Sepolia key hash (500 gwei)
  const keyHash = "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71";
  const callbackGasLimit = 500000;
  const requestConfirmations = 3;

  console.log("\nSending transaction...");
  const tx = await bubblePop.setVRFConfig(
    subscriptionId,
    keyHash,
    callbackGasLimit,
    requestConfirmations
  );

  console.log("Transaction hash:", tx.hash);
  await tx.wait();

  console.log("\nVRF config updated successfully!");
  console.log("- Subscription ID:", subscriptionId);
  console.log("- Key Hash:", keyHash);
  console.log("- Callback Gas Limit:", callbackGasLimit);
  console.log("- Request Confirmations:", requestConfirmations);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
