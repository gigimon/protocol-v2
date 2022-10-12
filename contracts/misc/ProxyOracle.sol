pragma solidity 0.6.12;

import {IProxyOracle} from './interfaces/IProxyOracle.sol';

contract ProxyOracle {
  IProxyOracle Oracle;

  constructor(address _oracle) public {
    Oracle = IProxyOracle(_oracle);
  }

  function latestAnswer() external view returns (int256) {
    (, int256 answer, , , ) = Oracle.latestRoundData();
    return answer;
  }
}
