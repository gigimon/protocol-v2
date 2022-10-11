pragma solidity 0.6.12;

import {IProxyOracle} from './interfaces/IProxyOracle.sol';

contract ProxyOracle is IProxyOracle {
  IProxyOracle Oracle;

  constructor(address _oracle) public {
    Oracle = IProxyOracle(_oracle);
  }

  function latestRoundData()
    public
    view
    override
    returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    )
  {
    return Oracle.latestRoundData();
  }

  function latestAnswer() external view returns (int256) {
    (, int256 answer, , , ) = latestRoundData();
    return answer;
  }
}
