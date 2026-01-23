// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title BubblePop Lottery
 * @notice A lottery game with two jackpot pools on Base blockchain
 * @dev Uses Chainlink VRF v2.5 for provably fair randomness
 */
contract BubblePop is VRFConsumerBaseV2Plus, ReentrancyGuard, AutomationCompatibleInterface {
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
        bool forcedDraw; // If true, guarantees a winner (90-day rule)
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
    uint256 public constant MAX_ROUND_DURATION = 90 days; // Force draw after 90 days
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
    uint256 public constant MAX_YEARLY_DONORS = 10;         // Top 10 for yearly hall of fame
    uint256 public constant MAX_CURRENT_ROUND_DONORS = 100; // Max unique donors per round (gas limit protection)
    uint256 public constant MAX_ALL_TIME_DONATIONS = 10000; // Max all-time donation entries before cleanup

    // ============ VRF Configuration ============

    uint256 public s_subscriptionId;
    bytes32 public s_keyHash;
    uint32 public s_callbackGasLimit = 200000;
    uint16 public s_requestConfirmations = 3;
    uint32 public constant NUM_WORDS = 1;

    // ============ Automation Configuration ============

    bool public automationEnabled = false;
    uint256 public minEntriesForDraw = 1;         // Minimum entries before draw eligible
    uint256 public minIntervalBetweenDraws = 1 hours; // Minimum time between draws
    mapping(uint256 => uint256) public lastAutomationDrawTime; // Track last automation draw per pool

    // ============ State Variables ============

    IERC20 public immutable usdc;
    address public houseFeeRecipient;

    // Pool IDs: 0 = Small (1 USDC), 1 = Big (10 USDC)
    Pool[2] public pools;

    // Entries per pool: poolId => entries array
    mapping(uint256 => Entry[]) public poolEntries;

    // VRF request tracking
    mapping(uint256 => VRFRequest) public vrfRequests;

    // ============ Round Tracking ============

    // Current round ID per pool (incremented on each winner)
    mapping(uint256 => uint256) public currentRoundId;

    // ============ Donation Tracking ============

    // Round donations: poolId => roundId => donor => amount
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public roundDonations;

    // List of donors per round: poolId => roundId => donors array
    mapping(uint256 => mapping(uint256 => address[])) public roundDonorList;

    // Total donations per round: poolId => roundId => total
    mapping(uint256 => mapping(uint256 => uint256)) public roundTotalDonations;

    // Track if address is already in round donor list: poolId => roundId => donor => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public isRoundDonor;

    // All-time donations (for yearly hall of fame)
    Donation[] public allTimeDonations;

    // Player entry count per round: poolId => roundId => player => count
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public roundPlayerEntryCount;

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
    event AutomationConfigUpdated(bool enabled, uint256 minEntries, uint256 minInterval);
    event DonationReceived(
        uint256 indexed poolId,
        address indexed donor,
        uint256 amount,
        uint256 newJackpot
    );
    event ForcedDrawRequested(uint256 indexed poolId, uint256 indexed requestId);
    event EmergencyVRFReset(uint256 indexed poolId);
    event NewRoundStarted(uint256 indexed poolId, uint256 roundId);

    // ============ Errors ============

    error PoolInGracePeriod();
    error InvalidPoolId();
    error NoEntries();
    error InvalidAmount();
    error GracePeriodNotOver();
    error VRFRequestPending();
    error UnknownVRFRequest();
    error OnlyOwner();
    error InvalidGasLimit();
    error TooManyDonors();
    error RoundNotExpired();
    error NoVRFRequestPending();

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

        // Auto-end grace period if time has elapsed
        if (pool.inGracePeriod) {
            if (block.timestamp >= pool.lastPayoutTime + GRACE_PERIOD) {
                pool.inGracePeriod = false;
                pool.roundStartTime = block.timestamp;
                emit GracePeriodEnded(poolId);
            } else {
                revert PoolInGracePeriod();
            }
        }

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

        // Track player entries per round (automatically resets with new round)
        uint256 roundId = currentRoundId[poolId];
        roundPlayerEntryCount[poolId][roundId][msg.sender]++;

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
            exists: true,
            forcedDraw: false
        });

        emit RandomnessRequested(poolId, requestId);
    }

    /**
     * @notice Request a forced draw after 90 days - guarantees a winner
     * @param poolId The pool to force draw
     */
    function requestForcedDraw(uint256 poolId) external onlyAuthorized {
        if (poolId > 1) revert InvalidPoolId();

        Pool storage pool = pools[poolId];

        if (pool.inGracePeriod) revert PoolInGracePeriod();
        if (pool.vrfRequestPending) revert VRFRequestPending();
        if (poolEntries[poolId].length == 0) revert NoEntries();

        // Must be 90 days since round started
        if (block.timestamp < pool.roundStartTime + MAX_ROUND_DURATION) {
            revert RoundNotExpired();
        }

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
            exists: true,
            forcedDraw: true
        });

        emit ForcedDrawRequested(poolId, requestId);
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
        uint256 roundId = currentRoundId[poolId];

        // Transfer USDC from donor
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Add to jackpot
        pool.jackpot += amount;

        // Track round donation (uses round ID - no reset loop needed!)
        roundDonations[poolId][roundId][msg.sender] += amount;
        roundTotalDonations[poolId][roundId] += amount;

        // Add to donor list if not already present (with gas limit protection)
        if (!isRoundDonor[poolId][roundId][msg.sender]) {
            if (roundDonorList[poolId][roundId].length >= MAX_CURRENT_ROUND_DONORS) {
                revert TooManyDonors();
            }
            roundDonorList[poolId][roundId].push(msg.sender);
            isRoundDonor[poolId][roundId][msg.sender] = true;
        }

        // Track all-time donation for yearly hall of fame (with cleanup when limit reached)
        if (allTimeDonations.length >= MAX_ALL_TIME_DONATIONS) {
            _cleanupOldDonations();
        }
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
        bool isForcedDraw = request.forcedDraw;
        Pool storage pool = pools[poolId];

        pool.vrfRequestPending = false;
        delete vrfRequests[requestId];

        Entry[] storage entries = poolEntries[poolId];
        if (entries.length == 0) return;

        uint256 randomWord = randomWords[0];

        // Forced draw (90-day rule): guarantee a winner
        if (isForcedDraw) {
            _processWinner(poolId, randomWord, requestId);
            return;
        }

        // Normal draw: check probability
        uint256 currentOdds = getCurrentWinChance(poolId);
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

        // Increment round ID - this effectively resets all round-based tracking
        // (donations, player entries) without any loops! Old data becomes stale.
        currentRoundId[poolId]++;
        emit NewRoundStarted(poolId, currentRoundId[poolId]);

        // Transfer winnings
        usdc.safeTransfer(winningEntry.player, winnerPayout);
        usdc.safeTransfer(houseFeeRecipient, houseFee);

        emit WinnerSelected(poolId, winningEntry.player, winnerPayout, houseFee, requestId);
        emit GracePeriodStarted(poolId, block.timestamp + GRACE_PERIOD);
    }

    /**
     * @notice Clean up old donations to prevent unbounded array growth
     * @dev Removes donations older than YEARLY_ROTATION_PERIOD
     */
    function _cleanupOldDonations() internal {
        uint256 cutoffTime = block.timestamp - YEARLY_ROTATION_PERIOD;
        uint256 writeIndex = 0;

        // Compact array by overwriting old entries
        for (uint256 readIndex = 0; readIndex < allTimeDonations.length; readIndex++) {
            if (allTimeDonations[readIndex].timestamp >= cutoffTime) {
                if (writeIndex != readIndex) {
                    allTimeDonations[writeIndex] = allTimeDonations[readIndex];
                }
                writeIndex++;
            }
        }

        // Remove excess entries from the end
        uint256 toRemove = allTimeDonations.length - writeIndex;
        for (uint256 i = 0; i < toRemove; i++) {
            allTimeDonations.pop();
        }
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
        uint256 roundId = currentRoundId[poolId];
        return roundPlayerEntryCount[poolId][roundId][player];
    }

    /**
     * @notice Check if a pool's round has exceeded 90 days (eligible for forced draw)
     */
    function isRoundExpired(uint256 poolId) external view returns (bool) {
        if (poolId > 1) return false;
        Pool memory pool = pools[poolId];
        if (pool.inGracePeriod) return false;
        return block.timestamp >= pool.roundStartTime + MAX_ROUND_DURATION;
    }

    /**
     * @notice Get time remaining until forced draw is available (0 if already available)
     */
    function getTimeUntilForcedDraw(uint256 poolId) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        Pool memory pool = pools[poolId];
        uint256 forcedDrawTime = pool.roundStartTime + MAX_ROUND_DURATION;
        if (block.timestamp >= forcedDrawTime) return 0;
        return forcedDrawTime - block.timestamp;
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
     * @param maxResults Maximum number of results to return (capped at MAX_TOP_DONORS)
     * @return donors Array of donor addresses
     * @return amounts Array of donation amounts
     */
    function getTopDonorsCurrentRound(uint256 poolId, uint256 maxResults)
        external
        view
        returns (address[] memory donors, uint256[] memory amounts)
    {
        if (poolId > 1) revert InvalidPoolId();

        // Cap maxResults to prevent excessive gas usage
        if (maxResults > MAX_TOP_DONORS) {
            maxResults = MAX_TOP_DONORS;
        }

        uint256 roundId = currentRoundId[poolId];
        address[] storage donorList = roundDonorList[poolId][roundId];
        uint256 count = donorList.length < maxResults ? donorList.length : maxResults;

        // Create temporary arrays for sorting
        address[] memory tempDonors = new address[](donorList.length);
        uint256[] memory tempAmounts = new uint256[](donorList.length);

        for (uint256 i = 0; i < donorList.length; i++) {
            tempDonors[i] = donorList[i];
            tempAmounts[i] = roundDonations[poolId][roundId][donorList[i]];
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
     * @param maxResults Maximum number of results to return (capped at MAX_YEARLY_DONORS)
     * @return donors Array of donor addresses
     * @return amounts Array of total donation amounts
     */
    function getTopDonorsYearly(uint256 maxResults)
        external
        view
        returns (address[] memory donors, uint256[] memory amounts)
    {
        // Cap maxResults to prevent excessive gas usage
        if (maxResults > MAX_YEARLY_DONORS) {
            maxResults = MAX_YEARLY_DONORS;
        }

        uint256 cutoffTime = block.timestamp - YEARLY_ROTATION_PERIOD;
        uint256 donationCount = allTimeDonations.length;

        // Limit scan to prevent gas issues (last MAX_ALL_TIME_DONATIONS entries)
        uint256 startIndex = donationCount > MAX_ALL_TIME_DONATIONS ? donationCount - MAX_ALL_TIME_DONATIONS : 0;

        // First pass: aggregate donations per donor within the time window
        // Use fixed-size arrays to limit gas (max MAX_YEARLY_DONORS * 10 unique donors tracked)
        uint256 maxUniqueDonors = MAX_YEARLY_DONORS * 10;
        address[] memory tempDonors = new address[](maxUniqueDonors);
        uint256[] memory tempAmounts = new uint256[](maxUniqueDonors);
        uint256 uniqueDonorCount = 0;

        for (uint256 i = startIndex; i < donationCount; i++) {
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

            if (!found && uniqueDonorCount < maxUniqueDonors) {
                tempDonors[uniqueDonorCount] = d.donor;
                tempAmounts[uniqueDonorCount] = d.amount;
                uniqueDonorCount++;
            }
        }

        // Sort by amount (bubble sort - bounded by maxUniqueDonors)
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
        uint256 roundId = currentRoundId[poolId];
        return roundDonations[poolId][roundId][donor];
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
        uint256 roundId = currentRoundId[poolId];
        return roundDonorList[poolId][roundId].length;
    }

    /**
     * @notice Get current round ID for a pool
     */
    function getCurrentRoundId(uint256 poolId) external view returns (uint256) {
        if (poolId > 1) revert InvalidPoolId();
        return currentRoundId[poolId];
    }

    // ============ Chainlink Automation Functions ============

    /**
     * @notice Check if upkeep is needed (called by Chainlink Automation)
     * @param checkData Not used, but required by interface
     * @return upkeepNeeded True if automation should trigger
     * @return performData Encoded pool IDs and forced draw flags
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (!automationEnabled) {
            return (false, "");
        }

        // Check both pools for regular draws and forced draws (90-day rule)
        bool pool0Eligible = _isPoolEligibleForAutoDraw(0);
        bool pool1Eligible = _isPoolEligibleForAutoDraw(1);
        bool pool0Forced = _isPoolEligibleForForcedDraw(0);
        bool pool1Forced = _isPoolEligibleForForcedDraw(1);

        if (pool0Eligible || pool1Eligible || pool0Forced || pool1Forced) {
            upkeepNeeded = true;
            performData = abi.encode(pool0Eligible, pool1Eligible, pool0Forced, pool1Forced);
        }

        return (upkeepNeeded, performData);
    }

    /**
     * @notice Perform the upkeep (called by Chainlink Automation)
     * @param performData Encoded pool eligibility from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        if (!automationEnabled) return;

        (bool pool0Eligible, bool pool1Eligible, bool pool0Forced, bool pool1Forced) =
            abi.decode(performData, (bool, bool, bool, bool));

        // Forced draws take priority (90-day rule)
        if (pool0Forced && _isPoolEligibleForForcedDraw(0)) {
            _triggerAutomationDraw(0, true);
        } else if (pool0Eligible && _isPoolEligibleForAutoDraw(0)) {
            lastAutomationDrawTime[0] = block.timestamp;
            _triggerAutomationDraw(0, false);
        }

        if (pool1Forced && _isPoolEligibleForForcedDraw(1)) {
            _triggerAutomationDraw(1, true);
        } else if (pool1Eligible && _isPoolEligibleForAutoDraw(1)) {
            lastAutomationDrawTime[1] = block.timestamp;
            _triggerAutomationDraw(1, false);
        }
    }

    /**
     * @notice Check if a pool is eligible for an automated draw
     * @param poolId The pool to check
     * @return True if eligible
     */
    function _isPoolEligibleForAutoDraw(uint256 poolId) internal view returns (bool) {
        Pool memory pool = pools[poolId];

        // Not eligible if in grace period
        if (pool.inGracePeriod) return false;

        // Not eligible if VRF request is pending
        if (pool.vrfRequestPending) return false;

        // Not eligible if not enough entries
        if (poolEntries[poolId].length < minEntriesForDraw) return false;

        // Not eligible if min interval hasn't passed
        if (block.timestamp < lastAutomationDrawTime[poolId] + minIntervalBetweenDraws) return false;

        return true;
    }

    /**
     * @notice Check if a pool is eligible for a forced draw (90-day rule)
     * @param poolId The pool to check
     * @return True if eligible for forced draw
     */
    function _isPoolEligibleForForcedDraw(uint256 poolId) internal view returns (bool) {
        Pool memory pool = pools[poolId];

        // Not eligible if in grace period
        if (pool.inGracePeriod) return false;

        // Not eligible if VRF request is pending
        if (pool.vrfRequestPending) return false;

        // Not eligible if no entries
        if (poolEntries[poolId].length == 0) return false;

        // Eligible if 90 days have passed
        return block.timestamp >= pool.roundStartTime + MAX_ROUND_DURATION;
    }

    /**
     * @notice Trigger an automated draw for a pool
     * @param poolId The pool to draw
     * @param forced Whether this is a forced draw (90-day rule)
     */
    function _triggerAutomationDraw(uint256 poolId, bool forced) internal {
        Pool storage pool = pools[poolId];

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
            exists: true,
            forcedDraw: forced
        });

        if (forced) {
            emit ForcedDrawRequested(poolId, requestId);
        } else {
            emit RandomnessRequested(poolId, requestId);
        }
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

    /**
     * @notice Update automation configuration
     * @param enabled Whether automation is enabled
     * @param minEntries Minimum entries required before a draw
     * @param minInterval Minimum time between automated draws
     */
    function setAutomationConfig(
        bool enabled,
        uint256 minEntries,
        uint256 minInterval
    ) external {
        if (msg.sender != owner()) revert OnlyOwner();
        automationEnabled = enabled;
        minEntriesForDraw = minEntries;
        minIntervalBetweenDraws = minInterval;
        emit AutomationConfigUpdated(enabled, minEntries, minInterval);
    }

    /**
     * @notice Emergency function to reset VRF pending state if callback fails
     * @dev Only use if VRF callback failed and pool is stuck
     * @param poolId The pool to reset
     */
    function emergencyResetVRF(uint256 poolId) external {
        if (msg.sender != owner()) revert OnlyOwner();
        if (poolId > 1) revert InvalidPoolId();
        if (!pools[poolId].vrfRequestPending) revert NoVRFRequestPending();

        pools[poolId].vrfRequestPending = false;
        emit EmergencyVRFReset(poolId);
    }

}
