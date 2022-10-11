// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

interface IChainlinkAggregator {
  function decimals() external view returns (uint8);

  function latestAnswer() external view returns (int256);

  function latestRoundData()
    external
    view
    returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    );

  function latestTimestamp() external view returns (uint256);

  function latestRound() external view returns (uint256);

  function getAnswer(uint256 roundId) external view returns (int256);

  function getTimestamp(uint256 roundId) external view returns (uint256);

  event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 timestamp);
  event NewRound(uint256 indexed roundId, address indexed startedBy);
}
