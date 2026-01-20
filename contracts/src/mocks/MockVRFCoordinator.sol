// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title MockVRFCoordinator
 * @notice Mock VRF Coordinator for testing BubblePop
 */
contract MockVRFCoordinator {
    uint256 private _requestCounter;
    mapping(uint256 => address) private _requestConsumers;

    event RandomWordsRequested(
        uint256 indexed requestId,
        address indexed consumer,
        uint256 subId,
        uint32 callbackGasLimit
    );

    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId) {
        _requestCounter++;
        requestId = _requestCounter;
        _requestConsumers[requestId] = msg.sender;

        emit RandomWordsRequested(
            requestId,
            msg.sender,
            req.subId,
            req.callbackGasLimit
        );

        return requestId;
    }

    /**
     * @notice Simulate VRF callback with specified random words
     * @param requestId The request ID to fulfill
     * @param randomWords The random values to return
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        address consumer = _requestConsumers[requestId];
        require(consumer != address(0), "Request not found");

        // Call the consumer's rawFulfillRandomWords function
        (bool success, ) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        require(success, "Fulfillment failed");

        delete _requestConsumers[requestId];
    }

    /**
     * @notice Fulfill with a single random word (convenience function)
     */
    function fulfillRandomWord(uint256 requestId, uint256 randomWord) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;
        this.fulfillRandomWords(requestId, randomWords);
    }

    function getRequestConsumer(uint256 requestId) external view returns (address) {
        return _requestConsumers[requestId];
    }
}
