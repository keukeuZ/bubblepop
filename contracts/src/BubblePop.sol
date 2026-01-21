// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title BubblePop Lottery
 * @notice A lottery game with two jackpot pools on Base blockchain
 * @dev Uses Chainlink VRF v2.5 for provably fair randomness
 */
contract BubblePop is VRFConsumerBaseV2Plus, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Pool {
        uint256 entryPrice;          // Price to enter (in USDC, 6 decimals)
        uint256 jackpot;             // Current jackpot amount
        uint256 roundStartTime;      // When current round started
        uint256 lastPayoutTime;      // When last payout occurred
        uint256 totalEntries;        // Total entries this round
        bool inGracePeriod;          // Whether pool is in grace period
        bool vrfRequestPending;      // Whether VRF request is in flight
        address lastWinner;          // Last winner address
        uint256 lastWinAmount;       // Last win amount
    }

    struct Entry {
        address player;
        uint256 blockNumber;
    }

    struct VRFRequest {
        uint256 poolId;
        bool exists;
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    // ============ Constants ============

    uint256 public constant HOUSE_FEE_BPS = 90; // 0.9% = 90 basis points
    uint256 public constant ROLLOVER_BPS = 910; // 9.1% = 910 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant GRACE_PERIOD = 15 minutes;
    uint256 public constant SMALL_POOL_ENTRY = 1e6;  // 1 USDC (6 decimals)
    uint256 public constant BIG_POOL_ENTRY = 10e6;   // 10 USDC (6 decimals)

    // Escalating odds: gentle curve, no guarantee
    // Using 1,000,000 as denominator for finer granularity
    uint256 public constant CHANCE_DENOMINATOR = 1000000;   // For percentage calculations
    uint256 public constant BASE_WIN_CHANCE = 10;           // 0.001% (10/1,000,000)
    uint256 public constant MAX_WIN_CHANCE = 100;           // 0.01% cap (100/1,000,000)
    uint256 public constant ESCALATION_PERIOD = 14 days;    // Time to reach cap

    // Donation/Sponsor board constants
    uint256 public constant YEARLY_ROTATION_PERIOD = 365 days;
    uint256 public constant MAX_TOP_DONORS = 20;            // Max donors to track for current round
    uint256 public constant MAX_YEARLY_DONORS = 3;          // Top 3 for yearly hall of fame

    // ============ VRF Configuration ============

    uint256 public s_subscriptionId;
    bytes32 public s_keyHash;
    uint32 public s_callbackGasLimit = 200000;
    uint16 public s_requestConfirmations = 3;
    uint32 public constant NUM_WORDS = 1;

    // ============ State Variables ============

    IERC20 public immutable usdc;
    address public houseFeeRecipient;

    // Pool IDs: 0 = Small (1 USDC), 1 = Big (10 USDC)
    Pool[2] public pools;

    // Entries per pool: poolId => entries array
    mapping(uint256 => Entry[]) public poolEntries;

    // Track player entries per pool per round
    mapping(uint256 => mapping(address => uint256)) public playerEntryCount;

    // VRF request tracking
    mapping(uint256 => VRFRequest) public vrfRequests;

    // ============ Donation Tracking ============

    // Current round donations per pool: poolId => donor => amount
    mapping(uint256 => mapping(address => uint256)) public currentRoundDonations;

    // List of donors in current round per pool (for iteration)
    mapping(uint256 => address[]) public currentRoundDonorList;

    // Total donations in current round per pool
    mapping(uint256 => uint256) public currentRoundTotalDonations;

    // All-time donations (for yearly hall of fame)
    Donation[] public allTimeDonations;

    // Track if address is already in current round donor list
    mapping(uint256 => mapping(address => bool)) public isCurrentRoundDonor;

    // ============ Events ============

    event EntrySubmitted(
        uint256 indexed poolId,
        address indexed player,
        uint256 entryNumber,
        uint256 blockNumber
    );

    event RandomnessRequested(
        uint256 indexed poolId,
        uint256 indexed requestId
    );

    event WinnerSelected(
        uint256 indexed poolId,
        address indexed winner,
        uint256 amount,
        uint256 houseFee,
        uint256 requestId
    );

    event NoWinnerThisRoll(
        uint256 indexed poolId,
        uint256 indexed requestId,
        uint256 currentOdds
    );

    event GracePeriodStarted(uint256 indexed poolId, uint256 endTime);
    event GracePeriodEnded(uint256 indexed poolId);
    event HouseFeeRecipientUpdated(address newRecipient);
    event KeeperUpdated(address newKeeper);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash);
    event DonationReceived(
        uint256 indexed poolId,
        address indexed donor,
        uint256 amount,
        uint256 newJackpot
    );

    // ============ Errors ============

    error PoolInGracePeriod();
    error InvalidPoolId();
    error NoEntries();
    error InvalidAmount();
    error GracePeriodNotOver();
    error SameBlockEntry();
    error VRFRequestPending();
    error UnknownVRFRequest();
    error OnlyOwner();
    error InvalidGasLimit();

    // ============ Constructor ============

    constructor(
        address _vrfCoordinator,
        address _usdc,
        address _houseFeeRecipient,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_houseFeeRecipient == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        houseFeeRecipient = _houseFeeRecipient;
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;

        // Initialize pools
        pools[0] = Pool({
            entryPrice: SMALL_POOL_ENTRY,
            jackpot: 0,
            roundStartTime: block.timestamp,
            lastPayoutTime: 0,
            totalEntries: 0,
            inGracePeriod: false,
            vrfRequestPending: false,
            lastWinner: address(0),
            lastWinAmount: 0
        });

        pools[1] = Pool({
            entryPrice: BIG_POOL_ENTRY,
            jackpot: 0,
            roundStartTime: block.timestamp,
            lastPayoutTime: 0,
            totalEntries: 0,
            inGracePeriod: false,
            vrfRequestPending: false,
            lastWinner: address(0),
            lastWinAmount: 0
        });
    }

    // ============ State: Keeper ============

    address public keeper;

    // ============ Modifiers ============

    modifier onlyAuthorized() {
        if (msg.sender != owner() && msg.sender != keeper) {
            revert OnlyOwner();
        }
        _;
    }

    // ============ External Functions ============

    /**
     * @notice Enter a lottery pool
     * @param poolId 0 for small pool (1 USDC), 1 for big pool (10 USDC)
     */
    function enter(uint256 poolId) external nonReentrant {
        if (poolId > 1) revert InvalidPoolId();

        Pool storage pool = pools[poolId];

        if (pool.inGracePeriod) revert PoolInGracePeriod();

        uint256 entryPrice = pool.entryPrice;

        // Transfer USDC from player
        usdc.safeTransferFrom(msg.sender, address(this), entryPrice);

        // Add entry
        poolEntries[poolId].push(Entry({
            player: msg.sender,
            blockNumber: block.number
        }));

        pool.jackpot += entryPrice;
        pool.totalEntries++;
        playerEntryCount[poolId][msg.sender]++;

        emit EntrySubmitted(
            poolId,
            msg.sender,
            pool.totalEntries,
            block.number
        );
    }

    /**
     * @notice Request randomness to potentially select a winner
     * @param poolId The pool to roll for
     */
    function requestRandomWinner(uint256 poolId) external onlyAuthorized {
        if (poolId > 1) revert InvalidPoolId();

        Pool storage pool = pools[poolId];

        if (pool.inGracePeriod) revert PoolInGracePeriod();
        if (pool.vrfRequestPending) revert VRFRequestPending();
        if (poolEntries[poolId].length == 0) revert NoEntries();

        pool.vrfRequestPending = true;

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: s_requestConfirmations,
                callbackGasLimit: s_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        vrfRequests[requestId] = VRFRequest({
            poolId: poolId,
            exists: true
        });

        emit RandomnessRequested(poolId, requestId);
    }

    /**
     * @notice End grace period and start new round
     * @param poolId The pool to restart
     */
    function endGracePeriod(uint256 poolId) external {
        if (poolId > 1) revert InvalidPoolId();

        Pool storage pool = pools[poolId];

        if (!pool.inGracePeriod) return;
        if (block.timestamp < pool.lastPayoutTime + GRACE_PERIOD) {
            revert GracePeriodNotOver();
        }

        pool.inGracePeriod = false;
        pool.roundStartTime = block.timestamp;

        emit GracePeriodEnded(poolId);
    }

    /**
     * @notice Donate USDC to a pool's jackpot
     * @param poolId The pool to donate to (0 = small, 1 = big)
     * @param amount Amount of USDC to donate (6 decimals)
     */
    function donate(uint256 poolId, uint256 amount) external nonReentrant {
        if (poolId > 1) revert InvalidPoolId();
        if (amount == 0) revert InvalidAmount();

        Pool storage pool = pools[poolId];

        // Transfer USDC from donor
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Add to jackpot
        pool.jackpot += amount;

        // Track current round donation
        currentRoundDonations[poolId][msg.sender] += amount;
        currentRoundTotalDonations[poolId] += amount;

        // Add to donor list if not already present
        if (!isCurrentRoundDonor[poolId][msg.sender]) {
            currentRoundDonorList[poolId].push(msg.sender);
            isCurrentRoundDonor[poolId][msg.sender] = true;
        }

        // Track all-time donation for yearly hall of fame
        allTimeDonations.push(Donation({
            donor: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        }));

        emit DonationReceived(poolId, msg.sender, amount, pool.jackpot);
    }

    // ============ VRF Callback ============

    /**
     * @notice Callback function used by VRF Coordinator
     * @param requestId The request ID
     * @param randomWords Array of random values
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        VRFRequest memory request = vrfRequests[requestId];
        if (!request.exists) revert UnknownVRFRequest();

        uint256 poolId = request.poolId;
        Pool storage pool = pools[poolId];

        pool.vrfRequestPending = false;
        delete vrfRequests[requestId];

        Entry[] storage entries = poolEntries[poolId];
        if (entries.length == 0) return;

        uint256 randomWord = randomWords[0];

        // Calculate current win chance based on time elapsed
        uint256 currentOdds = getCurrentWinChance(poolId);

        // Check if this roll wins (random % 1000000 < currentOdds)
        uint256 rollResult = randomWord % CHANCE_DENOMINATOR;

        if (rollResult < currentOdds) {
            // Winner! Select from entries
            _processWinner(poolId, randomWord, requestId);
        } else {
            // No winner this roll
            emit NoWinnerThisRoll(poolId, requestId, currentOdds);
        }
    }

    // ============ Internal Functions ============

    function _processWinner(uint256 poolId, uint256 randomWord, uint256 requestId) internal {
        Pool storage pool = pools[poolId];
        Entry[] storage entries = poolEntries[poolId];

        // Select winner using random number
        uint256 winnerIndex = randomWord % entries.length;
        Entry memory winningEntry = entries[winnerIndex];

        // Calculate payout, house fee, and rollover
        uint256 jackpot = pool.jackpot;
        uint256 houseFee = (jackpot * HOUSE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 rollover = (jackpot * ROLLOVER_BPS) / BPS_DENOMINATOR;
        uint256 winnerPayout = jackpot - houseFee - rollover;

        // Update pool state
        pool.lastWinner = winningEntry.player;
        pool.lastWinAmount = winnerPayout;
        pool.lastPayoutTime = block.timestamp;
        pool.inGracePeriod = true;
        pool.jackpot = rollover; // Rollover to next round
        pool.totalEntries = 0;

        // Clear entries for new round
        delete poolEntries[poolId];

        // Reset player entry counts (gas optimization: done lazily on next round)

        // Reset current round donations
        _resetCurrentRoundDonations(poolId);

        // Transfer winnings
        usdc.safeTransfer(winningEntry.player, winnerPayout);
        usdc.safeTransfer(houseFeeRecipient, houseFee);

        emit WinnerSelected(poolId, winningEntry.player, winnerPayout, houseFee, requestId);
        emit GracePeriodStarted(poolId, block.timestamp + GRACE_PERIOD);
    }

    /**
     * @notice Reset current round donations for a pool
     */
    function _resetCurrentRoundDonations(uint256 poolId) internal {
        address[] storage donors = currentRoundDonorList[poolId];

        // Reset individual donation amounts
        for (uint256 i = 0; i < donors.length; i++) {
            address donor = donors[i];
            currentRoundDonations[poolId][donor] = 0;
            isCurrentRoundDonor[poolId][donor] = false;
        }

        // Clear donor list and total
        delete currentRoundDonorList[poolId];
        currentRoundTotalDonations[poolId] = 0;
    }

    // ============ View Functions ============

    /**
     * @notice Get current win chance for a pool based on time elapsed
     * @param poolId The pool to check
     * @return Win chance out of 1,000,000 (10 = 0.001%, 100 = 0.01%)
     */
    function getCurrentWinChance(uint256 poolId) public view returns (uint256) {
        if (poolId > 1) return 0;

        Pool memory pool = pools[poolId];
        uint256 elapsed = block.timestamp - pool.roundStartTime;

        if (elapsed >= ESCALATION_PERIOD) {
            return MAX_WIN_CHANCE; // 0.01% cap after 14 days
        }

        // Linear increase from BASE_WIN_CHANCE to MAX_WIN_CHANCE over ESCALATION_PERIOD
        uint256 additionalChance = ((MAX_WIN_CHANCE - BASE_WIN_CHANCE) * elapsed) / ESCALATION_PERIOD;
        return BASE_WIN_CHANCE + additionalChance;
    }

    /**
     * @notice Get pool information
     */
    function getPool(uint256 poolId) external view returns (Pool memory) {
        if (poolId > 1) revert InvalidPoolId();
        return pools[poolId];
    }

    /**
     * @notice Get number of entries in a pool
     */
    function getEntryCount(uint256 poolId) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        return poolEntries[poolId].length;
    }

    /**
     * @notice Get player's entry count in current round
     */
    function getPlayerEntries(uint256 poolId, address player) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        return playerEntryCount[poolId][player];
    }

    /**
     * @notice Check if pool is accepting entries
     */
    function isPoolOpen(uint256 poolId) external view returns (bool) {
        if (poolId > 1) return false;
        return !pools[poolId].inGracePeriod;
    }

    /**
     * @notice Get grace period end time
     */
    function getGracePeriodEnd(uint256 poolId) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        Pool memory pool = pools[poolId];
        if (!pool.inGracePeriod) return 0;
        return pool.lastPayoutTime + GRACE_PERIOD;
    }

    // ============ Sponsor Board View Functions ============

    /**
     * @notice Get top donors for current round (sorted by amount, descending)
     * @param poolId The pool to query
     * @param maxResults Maximum number of results to return
     * @return donors Array of donor addresses
     * @return amounts Array of donation amounts
     */
    function getTopDonorsCurrentRound(uint256 poolId, uint256 maxResults)
        external
        view
        returns (address[] memory donors, uint256[] memory amounts)
    {
        if (poolId > 1) revert InvalidPoolId();

        address[] storage donorList = currentRoundDonorList[poolId];
        uint256 count = donorList.length < maxResults ? donorList.length : maxResults;

        // Create temporary arrays for sorting
        address[] memory tempDonors = new address[](donorList.length);
        uint256[] memory tempAmounts = new uint256[](donorList.length);

        for (uint256 i = 0; i < donorList.length; i++) {
            tempDonors[i] = donorList[i];
            tempAmounts[i] = currentRoundDonations[poolId][donorList[i]];
        }

        // Simple bubble sort (fine for small arrays)
        for (uint256 i = 0; i < tempDonors.length; i++) {
            for (uint256 j = i + 1; j < tempDonors.length; j++) {
                if (tempAmounts[j] > tempAmounts[i]) {
                    // Swap
                    (tempAmounts[i], tempAmounts[j]) = (tempAmounts[j], tempAmounts[i]);
                    (tempDonors[i], tempDonors[j]) = (tempDonors[j], tempDonors[i]);
                }
            }
        }

        // Return top N results
        donors = new address[](count);
        amounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            donors[i] = tempDonors[i];
            amounts[i] = tempAmounts[i];
        }

        return (donors, amounts);
    }

    /**
     * @notice Get top donors from the last 365 days (yearly hall of fame)
     * @param maxResults Maximum number of results to return
     * @return donors Array of donor addresses
     * @return amounts Array of total donation amounts
     */
    function getTopDonorsYearly(uint256 maxResults)
        external
        view
        returns (address[] memory donors, uint256[] memory amounts)
    {
        uint256 cutoffTime = block.timestamp - YEARLY_ROTATION_PERIOD;

        // First pass: aggregate donations per donor within the time window
        // Using a simple approach - scan all donations and aggregate
        address[] memory tempDonors = new address[](allTimeDonations.length);
        uint256[] memory tempAmounts = new uint256[](allTimeDonations.length);
        uint256 uniqueDonorCount = 0;

        for (uint256 i = 0; i < allTimeDonations.length; i++) {
            Donation memory d = allTimeDonations[i];

            // Skip donations outside the yearly window
            if (d.timestamp < cutoffTime) continue;

            // Check if donor already in temp array
            bool found = false;
            for (uint256 j = 0; j < uniqueDonorCount; j++) {
                if (tempDonors[j] == d.donor) {
                    tempAmounts[j] += d.amount;
                    found = true;
                    break;
                }
            }

            if (!found) {
                tempDonors[uniqueDonorCount] = d.donor;
                tempAmounts[uniqueDonorCount] = d.amount;
                uniqueDonorCount++;
            }
        }

        // Sort by amount (bubble sort, fine for small result sets)
        for (uint256 i = 0; i < uniqueDonorCount; i++) {
            for (uint256 j = i + 1; j < uniqueDonorCount; j++) {
                if (tempAmounts[j] > tempAmounts[i]) {
                    (tempAmounts[i], tempAmounts[j]) = (tempAmounts[j], tempAmounts[i]);
                    (tempDonors[i], tempDonors[j]) = (tempDonors[j], tempDonors[i]);
                }
            }
        }

        // Return top N results
        uint256 count = uniqueDonorCount < maxResults ? uniqueDonorCount : maxResults;
        donors = new address[](count);
        amounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            donors[i] = tempDonors[i];
            amounts[i] = tempAmounts[i];
        }

        return (donors, amounts);
    }

    /**
     * @notice Get donation amount for a specific donor in current round
     */
    function getDonorAmount(uint256 poolId, address donor) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        return currentRoundDonations[poolId][donor];
    }

    /**
     * @notice Get total donations count (all-time)
     */
    function getTotalDonationsCount() external view returns (uint256) {
        return allTimeDonations.length;
    }

    /**
     * @notice Get current round donor count for a pool
     */
    function getCurrentRoundDonorCount(uint256 poolId) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        return currentRoundDonorList[poolId].length;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update house fee recipient
     */
    function setHouseFeeRecipient(address newRecipient) external {
        if (msg.sender != owner()) revert OnlyOwner();
        if (newRecipient == address(0)) revert ZeroAddress();
        houseFeeRecipient = newRecipient;
        emit HouseFeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Update keeper address for automation
     */
    function setKeeper(address newKeeper) external {
        if (msg.sender != owner()) revert OnlyOwner();
        keeper = newKeeper;
        emit KeeperUpdated(newKeeper);
    }

    /**
     * @notice Update VRF configuration
     */
    function setVRFConfig(
        uint256 subscriptionId,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmations
    ) external {
        if (msg.sender != owner()) revert OnlyOwner();
        if (callbackGasLimit == 0) revert InvalidGasLimit();
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        s_callbackGasLimit = callbackGasLimit;
        s_requestConfirmations = requestConfirmations;
        emit VRFConfigUpdated(subscriptionId, keyHash);
    }

    // ============ Testing Functions (Testnet Only) ============

    /**
     * @notice Force a winner draw for testing purposes (owner only)
     * @dev This bypasses VRF and directly selects a winner. USE ONLY FOR TESTING.
     * @param poolId The pool to draw from
     * @param seed A seed value to determine the winner (for predictable testing)
     */
    function testDraw(uint256 poolId, uint256 seed) external {
        if (msg.sender != owner()) revert OnlyOwner();
        if (poolId > 1) revert InvalidPoolId();

        Pool storage pool = pools[poolId];
        Entry[] storage entries = poolEntries[poolId];

        if (entries.length == 0) revert NoEntries();
        if (pool.inGracePeriod) revert PoolInGracePeriod();

        // Use a fake request ID for the event
        uint256 fakeRequestId = uint256(keccak256(abi.encodePacked(block.timestamp, seed, "TEST")));

        // Process winner using the seed
        _processWinner(poolId, seed, fakeRequestId);
    }

    /**
     * @notice Force a no-winner roll for testing purposes (owner only)
     * @dev This allows testing the NoWinnerThisRoll flow without VRF
     * @param poolId The pool to test
     */
    function testNoWinRoll(uint256 poolId) external {
        if (msg.sender != owner()) revert OnlyOwner();
        if (poolId > 1) revert InvalidPoolId();

        Pool storage pool = pools[poolId];
        if (pool.inGracePeriod) revert PoolInGracePeriod();
        if (poolEntries[poolId].length == 0) revert NoEntries();

        uint256 fakeRequestId = uint256(keccak256(abi.encodePacked(block.timestamp, "NO_WIN_TEST")));
        uint256 currentOdds = getCurrentWinChance(poolId);

        emit NoWinnerThisRoll(poolId, fakeRequestId, currentOdds);
    }
}
