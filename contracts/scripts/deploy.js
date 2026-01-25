const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const network = hre.network.name;
  console.log("Network:", network);

  let vrfCoordinator, usdc, subscriptionId, keyHash;

  if (network === "hardhat" || network === "localhost") {
    // Deploy mocks for local testing
    console.log("\nDeploying mock contracts...");

    const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
    const mockVRF = await MockVRFCoordinator.deploy();
    await mockVRF.waitForDeployment();
    vrfCoordinator = await mockVRF.getAddress();
    console.log("MockVRFCoordinator deployed to:", vrfCoordinator);

    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdc = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", usdc);

    subscriptionId = 1n;
    keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";

  } else if (network === "baseSepolia") {
    // Base Sepolia testnet addresses
    // VRF Coordinator v2.5 on Base Sepolia (from https://vrf.chain.link/base-sepolia)
    vrfCoordinator = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    // You'll need to deploy a mock USDC or use a test token
    // For now, we'll deploy our mock USDC
    console.log("\nDeploying MockUSDC for testing...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdc = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", usdc);

    // You need to create a VRF subscription at https://vrf.chain.link
    // and fund it with LINK tokens
    subscriptionId = process.env.VRF_SUBSCRIPTION_ID || 0n;
    // Base Sepolia key hash (500 gwei)
    keyHash = "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71";

    if (subscriptionId === 0n) {
      console.log("\n⚠️  WARNING: VRF_SUBSCRIPTION_ID not set!");
      console.log("You need to:");
      console.log("1. Go to https://vrf.chain.link");
      console.log("2. Create a subscription on Base Sepolia");
      console.log("3. Fund it with LINK");
      console.log("4. Add VRF_SUBSCRIPTION_ID to your .env file");
      console.log("5. After deployment, add the contract as a consumer\n");
    }

  } else if (network === "base") {
    // Base Mainnet addresses
    vrfCoordinator = "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634";
    usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Real USDC on Base
    subscriptionId = process.env.VRF_SUBSCRIPTION_ID || 0n;
    keyHash = "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71";
  }

  // Deploy BubblePop
  console.log("\nDeploying BubblePop...");
  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = await BubblePop.deploy(
    vrfCoordinator,
    usdc,
    deployer.address, // house fee recipient
    subscriptionId,
    keyHash
  );
  await bubblePop.waitForDeployment();
  const bubblePopAddress = await bubblePop.getAddress();

  console.log("\n========================================");
  console.log("BubblePop deployed to:", bubblePopAddress);
  console.log("========================================");
  console.log("\nDeployment Summary:");
  console.log("- VRF Coordinator:", vrfCoordinator);
  console.log("- USDC:", usdc);
  console.log("- House Fee Recipient:", deployer.address);
  console.log("- Subscription ID:", subscriptionId.toString());
  console.log("- Key Hash:", keyHash);

  if (network === "baseSepolia" || network === "base") {
    console.log("\n📋 Next Steps:");
    console.log("1. Add this contract as a consumer in your VRF subscription");
    console.log("2. Update frontend/src/config/wagmi.js with:");
    console.log(`   bubblePop: "${bubblePopAddress}"`);
    console.log(`   usdc: "${usdc}"`);
  }

  // Verify contract on Etherscan (optional)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await bubblePop.deploymentTransaction().wait(5);

    console.log("Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: bubblePopAddress,
        constructorArguments: [
          vrfCoordinator,
          usdc,
          deployer.address,
          subscriptionId,
          keyHash
        ],
      });
      console.log("Contract verified!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
