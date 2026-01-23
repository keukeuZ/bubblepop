const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BubblePop", function () {
  let bubblePop;
  let usdc;
  let vrfCoordinator;
  let owner;
  let player1;
  let player2;
  let houseFeeRecipient;

  const SMALL_POOL = 0;
  const BIG_POOL = 1;
  const ONE_USDC = 1000000n; // 1 USDC = 1e6
  const TEN_USDC = 10000000n; // 10 USDC = 10e6

  // Mock VRF config
  const SUBSCRIPTION_ID = 1;
  const KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

  beforeEach(async function () {
    [owner, player1, player2, houseFeeRecipient] = await ethers.getSigners();

    // Deploy mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    vrfCoordinator = await MockVRFCoordinator.deploy();
    await vrfCoordinator.waitForDeployment();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockUSDC");
    usdc = await MockERC20.deploy();
    await usdc.waitForDeployment();

    // Deploy BubblePop
    const BubblePop = await ethers.getContractFactory("BubblePop");
    bubblePop = await BubblePop.deploy(
      await vrfCoordinator.getAddress(),
      await usdc.getAddress(),
      houseFeeRecipient.address,
      SUBSCRIPTION_ID,
      KEY_HASH
    );
    await bubblePop.waitForDeployment();

    // Mint USDC to players
    await usdc.mint(player1.address, 1000n * ONE_USDC);
    await usdc.mint(player2.address, 1000n * ONE_USDC);

    // Approve BubblePop to spend USDC
    await usdc.connect(player1).approve(await bubblePop.getAddress(), ethers.MaxUint256);
    await usdc.connect(player2).approve(await bubblePop.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      expect(await bubblePop.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set correct house fee recipient", async function () {
      expect(await bubblePop.houseFeeRecipient()).to.equal(houseFeeRecipient.address);
    });

    it("Should set correct VRF config", async function () {
      expect(await bubblePop.s_subscriptionId()).to.equal(SUBSCRIPTION_ID);
      expect(await bubblePop.s_keyHash()).to.equal(KEY_HASH);
    });

    it("Should initialize pools correctly", async function () {
      const smallPool = await bubblePop.getPool(SMALL_POOL);
      const bigPool = await bubblePop.getPool(BIG_POOL);

      expect(smallPool.entryPrice).to.equal(ONE_USDC);
      expect(bigPool.entryPrice).to.equal(TEN_USDC);
      expect(smallPool.jackpot).to.equal(0);
      expect(bigPool.jackpot).to.equal(0);
    });
  });

  describe("Entry", function () {
    it("Should allow entry to small pool", async function () {
      await expect(bubblePop.connect(player1).enter(SMALL_POOL))
        .to.emit(bubblePop, "EntrySubmitted");

      const pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.jackpot).to.equal(ONE_USDC);
      expect(pool.totalEntries).to.equal(1);
    });

    it("Should allow entry to big pool", async function () {
      await expect(bubblePop.connect(player1).enter(BIG_POOL))
        .to.emit(bubblePop, "EntrySubmitted");

      const pool = await bubblePop.getPool(BIG_POOL);
      expect(pool.jackpot).to.equal(TEN_USDC);
    });

    it("Should revert on invalid pool ID", async function () {
      await expect(bubblePop.connect(player1).enter(2))
        .to.be.revertedWithCustomError(bubblePop, "InvalidPoolId");
    });

    it("Should track player entries", async function () {
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await bubblePop.connect(player1).enter(SMALL_POOL);

      expect(await bubblePop.getPlayerEntries(SMALL_POOL, player1.address)).to.equal(2);
    });
  });

  describe("VRF Integration", function () {
    beforeEach(async function () {
      // Add some entries
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await bubblePop.connect(player2).enter(SMALL_POOL);
    });

    it("Should request random winner", async function () {
      await expect(bubblePop.requestRandomWinner(SMALL_POOL))
        .to.emit(bubblePop, "RandomnessRequested");
    });

    it("Should revert if no entries", async function () {
      await expect(bubblePop.requestRandomWinner(BIG_POOL))
        .to.be.revertedWithCustomError(bubblePop, "NoEntries");
    });

    it("Should revert if VRF request already pending", async function () {
      await bubblePop.requestRandomWinner(SMALL_POOL);
      await expect(bubblePop.requestRandomWinner(SMALL_POOL))
        .to.be.revertedWithCustomError(bubblePop, "VRFRequestPending");
    });
  });

  describe("Winner Selection", function () {
    beforeEach(async function () {
      // Add entries from both players
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await bubblePop.connect(player2).enter(SMALL_POOL);

      // Fast forward time to max odds (14 days)
      await time.increase(14 * 24 * 60 * 60);
    });

    it("Should select winner and pay out when roll wins", async function () {
      // Request randomness
      const tx = await bubblePop.requestRandomWinner(SMALL_POOL);
      const receipt = await tx.wait();

      // Find request ID from event
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "RandomnessRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;

      // Fulfill with random number that will win (0 % 1000000 = 0, which is < 100 max odds)
      await expect(vrfCoordinator.fulfillRandomWord(requestId, 0))
        .to.emit(bubblePop, "WinnerSelected");

      // Check pool is in grace period
      const pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.inGracePeriod).to.be.true;
      // Jackpot should be 7.5% rollover (2 USDC * 750 / 10000 = 150000)
      expect(pool.jackpot).to.equal(150000n);
      expect(pool.lastWinner).to.equal(player1.address);
    });

    it("Should emit NoWinnerThisRoll when roll loses", async function () {
      // Reset to start of round for low odds
      const BubblePop = await ethers.getContractFactory("BubblePop");
      const freshBubblePop = await BubblePop.deploy(
        await vrfCoordinator.getAddress(),
        await usdc.getAddress(),
        houseFeeRecipient.address,
        SUBSCRIPTION_ID,
        KEY_HASH
      );

      await usdc.connect(player1).approve(await freshBubblePop.getAddress(), ethers.MaxUint256);
      await freshBubblePop.connect(player1).enter(SMALL_POOL);

      // Request randomness immediately (0.001% odds = 10/1000000)
      const tx = await freshBubblePop.requestRandomWinner(SMALL_POOL);
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
        try {
          return freshBubblePop.interface.parseLog(log)?.name === "RandomnessRequested";
        } catch { return false; }
      });
      const requestId = freshBubblePop.interface.parseLog(event).args.requestId;

      // Fulfill with random number that will NOT win (500 % 1000000 = 500, which is >= 10 base odds)
      await expect(vrfCoordinator.fulfillRandomWord(requestId, 500))
        .to.emit(freshBubblePop, "NoWinnerThisRoll");
    });
  });

  describe("Escalating Odds", function () {
    it("Should start at 0.01% (100 out of 1,000,000)", async function () {
      const odds = await bubblePop.getCurrentWinChance(SMALL_POOL);
      expect(odds).to.equal(100); // 0.01%
    });

    it("Should reach 0.07% cap after 14 days", async function () {
      await time.increase(14 * 24 * 60 * 60);
      const odds = await bubblePop.getCurrentWinChance(SMALL_POOL);
      expect(odds).to.equal(700); // 0.07% cap
    });

    it("Should increase linearly over time", async function () {
      // After 7 days (half of 14), should be ~400 (halfway between 100 and 700)
      await time.increase(7 * 24 * 60 * 60);
      const odds = await bubblePop.getCurrentWinChance(SMALL_POOL);
      expect(odds).to.be.closeTo(400, 5); // ~0.04%
    });

    it("Should cap and not exceed max after escalation period", async function () {
      await time.increase(30 * 24 * 60 * 60); // 30 days
      const odds = await bubblePop.getCurrentWinChance(SMALL_POOL);
      expect(odds).to.equal(700); // Still capped at 0.07%
    });
  });

  describe("Grace Period", function () {
    beforeEach(async function () {
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await time.increase(14 * 24 * 60 * 60); // Max odds

      const tx = await bubblePop.requestRandomWinner(SMALL_POOL);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "RandomnessRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;
      await vrfCoordinator.fulfillRandomWord(requestId, 0);
    });

    it("Should not allow entries during grace period", async function () {
      await expect(bubblePop.connect(player1).enter(SMALL_POOL))
        .to.be.revertedWithCustomError(bubblePop, "PoolInGracePeriod");
    });

    it("Should not allow ending grace period early", async function () {
      await expect(bubblePop.endGracePeriod(SMALL_POOL))
        .to.be.revertedWithCustomError(bubblePop, "GracePeriodNotOver");
    });

    it("Should allow ending grace period after 15 minutes", async function () {
      await time.increase(15 * 60); // 15 minutes
      await expect(bubblePop.endGracePeriod(SMALL_POOL))
        .to.emit(bubblePop, "GracePeriodEnded");

      const pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.inGracePeriod).to.be.false;
    });
  });

  describe("Constants", function () {
    it("Should have correct house fee", async function () {
      expect(await bubblePop.HOUSE_FEE_BPS()).to.equal(250); // 2.5%
    });

    it("Should have correct grace period", async function () {
      expect(await bubblePop.GRACE_PERIOD()).to.equal(900); // 15 minutes
    });

    it("Should have correct escalation period", async function () {
      expect(await bubblePop.ESCALATION_PERIOD()).to.equal(14 * 24 * 60 * 60); // 14 days
    });

    it("Should have correct chance denominator", async function () {
      expect(await bubblePop.CHANCE_DENOMINATOR()).to.equal(1000000);
    });
  });

  describe("Donations", function () {
    it("Should allow donations to a pool", async function () {
      const donationAmount = 50n * ONE_USDC;

      await expect(bubblePop.connect(player1).donate(SMALL_POOL, donationAmount))
        .to.emit(bubblePop, "DonationReceived")
        .withArgs(SMALL_POOL, player1.address, donationAmount, donationAmount);

      const pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.jackpot).to.equal(donationAmount);
    });

    it("Should track current round donations", async function () {
      const donation1 = 50n * ONE_USDC;
      const donation2 = 30n * ONE_USDC;

      await bubblePop.connect(player1).donate(SMALL_POOL, donation1);
      await bubblePop.connect(player2).donate(SMALL_POOL, donation2);

      expect(await bubblePop.getDonorAmount(SMALL_POOL, player1.address)).to.equal(donation1);
      expect(await bubblePop.getDonorAmount(SMALL_POOL, player2.address)).to.equal(donation2);
      expect(await bubblePop.getCurrentRoundDonorCount(SMALL_POOL)).to.equal(2);
    });

    it("Should accumulate multiple donations from same donor", async function () {
      const donation1 = 20n * ONE_USDC;
      const donation2 = 30n * ONE_USDC;

      await bubblePop.connect(player1).donate(SMALL_POOL, donation1);
      await bubblePop.connect(player1).donate(SMALL_POOL, donation2);

      expect(await bubblePop.getDonorAmount(SMALL_POOL, player1.address)).to.equal(donation1 + donation2);
      expect(await bubblePop.getCurrentRoundDonorCount(SMALL_POOL)).to.equal(1); // Still only 1 donor
    });

    it("Should revert on zero donation", async function () {
      await expect(bubblePop.connect(player1).donate(SMALL_POOL, 0))
        .to.be.revertedWithCustomError(bubblePop, "InvalidAmount");
    });

    it("Should revert on invalid pool ID", async function () {
      await expect(bubblePop.connect(player1).donate(2, ONE_USDC))
        .to.be.revertedWithCustomError(bubblePop, "InvalidPoolId");
    });

    it("Should return top donors sorted by amount", async function () {
      await bubblePop.connect(player1).donate(SMALL_POOL, 30n * ONE_USDC);
      await bubblePop.connect(player2).donate(SMALL_POOL, 50n * ONE_USDC);

      const [donors, amounts] = await bubblePop.getTopDonorsCurrentRound(SMALL_POOL, 10);

      expect(donors[0]).to.equal(player2.address);
      expect(amounts[0]).to.equal(50n * ONE_USDC);
      expect(donors[1]).to.equal(player1.address);
      expect(amounts[1]).to.equal(30n * ONE_USDC);
    });

    it("Should reset current round donations after winner payout", async function () {
      // Make a donation
      await bubblePop.connect(player1).donate(SMALL_POOL, 50n * ONE_USDC);
      expect(await bubblePop.getDonorAmount(SMALL_POOL, player1.address)).to.equal(50n * ONE_USDC);

      // Add an entry and trigger payout
      await bubblePop.connect(player2).enter(SMALL_POOL);
      await time.increase(14 * 24 * 60 * 60); // Max odds

      const tx = await bubblePop.requestRandomWinner(SMALL_POOL);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "RandomnessRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;
      await vrfCoordinator.fulfillRandomWord(requestId, 0);

      // Donations should be reset
      expect(await bubblePop.getDonorAmount(SMALL_POOL, player1.address)).to.equal(0);
      expect(await bubblePop.getCurrentRoundDonorCount(SMALL_POOL)).to.equal(0);
    });

    it("Should track all-time donations for yearly hall of fame", async function () {
      await bubblePop.connect(player1).donate(SMALL_POOL, 50n * ONE_USDC);
      await bubblePop.connect(player2).donate(BIG_POOL, 100n * ONE_USDC);

      expect(await bubblePop.getTotalDonationsCount()).to.equal(2);

      const [donors, amounts] = await bubblePop.getTopDonorsYearly(10);
      expect(donors.length).to.equal(2);
      expect(donors[0]).to.equal(player2.address);
      expect(amounts[0]).to.equal(100n * ONE_USDC);
    });
  });

  describe("90-Day Forced Draw", function () {
    beforeEach(async function () {
      // Add entries from both players
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await bubblePop.connect(player2).enter(SMALL_POOL);
    });

    it("Should have correct max round duration constant", async function () {
      expect(await bubblePop.MAX_ROUND_DURATION()).to.equal(90 * 24 * 60 * 60); // 90 days
    });

    it("Should not allow forced draw before 90 days", async function () {
      await time.increase(89 * 24 * 60 * 60); // 89 days
      await expect(bubblePop.requestForcedDraw(SMALL_POOL))
        .to.be.revertedWithCustomError(bubblePop, "RoundNotExpired");
    });

    it("Should report round as not expired before 90 days", async function () {
      await time.increase(89 * 24 * 60 * 60); // 89 days
      expect(await bubblePop.isRoundExpired(SMALL_POOL)).to.be.false;
    });

    it("Should report round as expired after 90 days", async function () {
      await time.increase(90 * 24 * 60 * 60); // 90 days
      expect(await bubblePop.isRoundExpired(SMALL_POOL)).to.be.true;
    });

    it("Should allow forced draw after 90 days", async function () {
      await time.increase(90 * 24 * 60 * 60); // 90 days
      await expect(bubblePop.requestForcedDraw(SMALL_POOL))
        .to.emit(bubblePop, "ForcedDrawRequested");
    });

    it("Should guarantee a winner on forced draw (no probability roll)", async function () {
      await time.increase(90 * 24 * 60 * 60); // 90 days

      const tx = await bubblePop.requestForcedDraw(SMALL_POOL);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "ForcedDrawRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;

      // Even with a random number that would normally LOSE (999999 % 1000000 = 999999 > max odds),
      // forced draw guarantees a winner
      await expect(vrfCoordinator.fulfillRandomWord(requestId, 999999))
        .to.emit(bubblePop, "WinnerSelected");
    });

    it("Should start grace period after forced draw payout", async function () {
      await time.increase(90 * 24 * 60 * 60); // 90 days

      const tx = await bubblePop.requestForcedDraw(SMALL_POOL);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "ForcedDrawRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;
      await vrfCoordinator.fulfillRandomWord(requestId, 0);

      const pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.inGracePeriod).to.be.true;
    });

    it("Should start new round with rollover after forced draw and grace period", async function () {
      const jackpotBefore = (await bubblePop.getPool(SMALL_POOL)).jackpot;

      await time.increase(90 * 24 * 60 * 60); // 90 days

      const tx = await bubblePop.requestForcedDraw(SMALL_POOL);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "ForcedDrawRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;
      await vrfCoordinator.fulfillRandomWord(requestId, 0);

      // Pool should have 7.5% rollover
      const expectedRollover = (jackpotBefore * 750n) / 10000n;
      const pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.jackpot).to.equal(expectedRollover);
      expect(pool.inGracePeriod).to.be.true;

      // End grace period
      await time.increase(15 * 60); // 15 minutes
      await bubblePop.endGracePeriod(SMALL_POOL);

      // Verify new round started
      const poolAfterGrace = await bubblePop.getPool(SMALL_POOL);
      expect(poolAfterGrace.inGracePeriod).to.be.false;
      expect(poolAfterGrace.totalEntries).to.equal(0);
      expect(poolAfterGrace.jackpot).to.equal(expectedRollover); // Rollover is seed

      // Should be able to enter again
      await expect(bubblePop.connect(player1).enter(SMALL_POOL))
        .to.emit(bubblePop, "EntrySubmitted");
    });

    it("Should increment round ID after forced draw", async function () {
      const roundBefore = await bubblePop.getCurrentRoundId(SMALL_POOL);

      await time.increase(90 * 24 * 60 * 60); // 90 days

      const tx = await bubblePop.requestForcedDraw(SMALL_POOL);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return bubblePop.interface.parseLog(log)?.name === "ForcedDrawRequested";
        } catch { return false; }
      });
      const requestId = bubblePop.interface.parseLog(event).args.requestId;
      await vrfCoordinator.fulfillRandomWord(requestId, 0);

      const roundAfter = await bubblePop.getCurrentRoundId(SMALL_POOL);
      expect(roundAfter).to.equal(roundBefore + 1n);
    });

    it("Should correctly report time until forced draw", async function () {
      // At start, should be 90 days
      const timeUntil = await bubblePop.getTimeUntilForcedDraw(SMALL_POOL);
      expect(timeUntil).to.be.closeTo(90n * 24n * 60n * 60n, 10n);

      // After 45 days, should be ~45 days remaining
      await time.increase(45 * 24 * 60 * 60);
      const timeUntilMid = await bubblePop.getTimeUntilForcedDraw(SMALL_POOL);
      expect(timeUntilMid).to.be.closeTo(45n * 24n * 60n * 60n, 10n);

      // After 90 days, should be 0
      await time.increase(45 * 24 * 60 * 60);
      const timeUntilEnd = await bubblePop.getTimeUntilForcedDraw(SMALL_POOL);
      expect(timeUntilEnd).to.equal(0);
    });
  });

  describe("Emergency VRF Reset", function () {
    it("Should allow owner to reset stuck VRF state", async function () {
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await bubblePop.requestRandomWinner(SMALL_POOL);

      // Pool should have VRF pending
      let pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.vrfRequestPending).to.be.true;

      // Owner can reset
      await expect(bubblePop.emergencyResetVRF(SMALL_POOL))
        .to.emit(bubblePop, "EmergencyVRFReset");

      pool = await bubblePop.getPool(SMALL_POOL);
      expect(pool.vrfRequestPending).to.be.false;
    });

    it("Should revert if no VRF request pending", async function () {
      await expect(bubblePop.emergencyResetVRF(SMALL_POOL))
        .to.be.revertedWithCustomError(bubblePop, "NoVRFRequestPending");
    });

    it("Should revert if called by non-owner", async function () {
      await bubblePop.connect(player1).enter(SMALL_POOL);
      await bubblePop.requestRandomWinner(SMALL_POOL);

      await expect(bubblePop.connect(player1).emergencyResetVRF(SMALL_POOL))
        .to.be.revertedWithCustomError(bubblePop, "OnlyOwner");
    });
  });
});
