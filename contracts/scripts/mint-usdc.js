const hre = require("hardhat");

async function main() {
  const mockUSDCAddress = "0x5C634839a4C95A257796Dc52E55AF9fa4d0d5324";

  const [deployer] = await hre.ethers.getSigners();

  // Mint to deployer by default, or pass an address as argument
  const recipient = process.argv[2] || deployer.address;

  // Mint 10,000 USDC (6 decimals)
  const amount = hre.ethers.parseUnits("10000", 6);

  console.log("MockUSDC address:", mockUSDCAddress);
  console.log("Minting to:", recipient);
  console.log("Amount:", hre.ethers.formatUnits(amount, 6), "USDC");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(mockUSDCAddress);

  console.log("\nSending transaction...");
  const tx = await usdc.mint(recipient, amount);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();

  const balance = await usdc.balanceOf(recipient);
  console.log("\nMint successful!");
  console.log("New balance:", hre.ethers.formatUnits(balance, 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
