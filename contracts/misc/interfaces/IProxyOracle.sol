pragma solidity 0.6.12;

interface IProxyOracle {
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
