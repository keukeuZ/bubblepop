const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x30Caca4997913a37572B4df2Acd04c5f01D4bB73";
  const mockUSDCAddress = "0xcCa67993A50bD0cb5f3Fa94d3da8E0a6DBe7Bb1c";

  console.log("=== BubblePop Setup Verification ===\n");

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(mockUSDCAddress);

  // Check contract state
  const owner = await bubblePop.owner();
  const subscriptionId = await bubblePop.s_subscriptionId();

  console.log("BubblePop Address:", bubblePopAddress);
  console.log("MockUSDC Address:", mockUSDCAddress);
  console.log("Contract Owner:", owner);
  console.log("VRF Subscription ID:", subscriptionId.toString().slice(0, 20) + "...");

  // Check USDC
  const [deployer] = await hre.ethers.getSigners();
  const usdcBalance = await usdc.balanceOf(deployer.address);

  console.log("\nYour Wallet:", deployer.address);
  console.log("- USDC Balance:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");

  console.log("\n=== Status ===");
  if (subscriptionId === 0n) {
    console.log("❌ VRF Subscription ID not set!");
  } else {
    console.log("✅ VRF Subscription configured");
  }

  if (usdcBalance > 0n) {
    console.log("✅ You have USDC for testing");
  } else {
    console.log("❌ No USDC balance - run mint-usdc.js first");
  }

  console.log("\n🎮 Ready for testing!");
}

main().catch(console.error);
