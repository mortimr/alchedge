// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

contract AggregatorV3Mock {
    // mock latest round data

    uint80 internal _roundId;
    int256 internal _answer;
    uint256 _startedAt;
    uint256 _updatedAt;
    uint80 _answeredInRound;

    function setLatestRoundData(
        uint80 __roundId,
        int256 __answer,
        uint256 __startedAt,
        uint256 __updatedAt,
        uint80 __answeredInRound
    ) public {
        _roundId = __roundId;
        _answer = __answer;
        _startedAt = __startedAt;
        _updatedAt = __updatedAt;
        _answeredInRound = __answeredInRound;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = _roundId;
        answer = _answer;
        startedAt = _startedAt;
        updatedAt = _updatedAt;
        answeredInRound = _answeredInRound;
    }
}
