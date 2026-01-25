const hre = require("hardhat");

async function main() {
  const bubblePopAddress = "0x03c698e2162847E81A84614F7F4d6A10853Df3Db";
  const poolId = process.argv[2] || "0";

  console.log("=== Triggering VRF Request ===\n");
  console.log("BubblePop Address:", bubblePopAddress);
  console.log("Pool ID:", poolId, poolId === "0" ? "(Small Pool)" : "(Big Pool)");

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const BubblePop = await hre.ethers.getContractFactory("BubblePop");
  const bubblePop = BubblePop.attach(bubblePopAddress);

  // Check owner
  const owner = await bubblePop.owner();
  console.log("Contract Owner:", owner);
  console.log("Is Owner:", signer.address.toLowerCase() === owner.toLowerCase());

  // Check pool state
  const pool = await bubblePop.getPool(poolId);
  const entryCount = await bubblePop.getEntryCount(poolId);

  console.log("\nPool State:");
  console.log("- Jackpot:", hre.ethers.formatUnits(pool.jackpot, 6), "USDC");
  console.log("- Total Entries:", entryCount.toString());
  console.log("- VRF Request Pending:", pool.vrfRequestPending);
  console.log("- In Grace Period:", pool.inGracePeriod);

  if (entryCount === 0n) {
    console.log("\nNo entries in pool. Cannot request random winner.");
    process.exit(1);
  }

  if (pool.inGracePeriod) {
    console.log("\nPool is in grace period. Cannot request random winner.");
    process.exit(1);
  }

  if (pool.vrfRequestPending) {
    console.log("\nVRF request already pending.");
    process.exit(1);
  }

  console.log("\nCalling requestRandomWinner...");
  try {
    const tx = await bubblePop.requestRandomWinner(poolId, {
      gasLimit: 1000000
    });
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Parse events
    for (const log of receipt.logs) {
      try {
        const parsed = bubblePop.interface.parseLog(log);
        if (parsed) {
          console.log("\nEvent:", parsed.name);
          if (parsed.name === "RandomnessRequested") {
            console.log("  Pool ID:", parsed.args.poolId.toString());
            console.log("  Request ID:", parsed.args.requestId.toString());
          }
        }
      } catch (e) {
        // Skip unparseable logs (e.g., VRF Coordinator events)
      }
    }

    console.log("\nVRF request submitted successfully!");
    console.log("Now wait for Chainlink VRF to fulfill the request.");
    console.log("This may take 1-2 minutes on testnets.");
    console.log("\nCheck the subscription at: https://vrf.chain.link");
  } catch (error) {
    console.log("\nError:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    // Try to decode the error
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
