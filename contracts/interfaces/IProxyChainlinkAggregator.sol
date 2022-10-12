// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

interface IProxyChainlinkAggregator {
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
}
