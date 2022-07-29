[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Build pass](https://github.com/AAVE/protocol-v2/actions/workflows/node.js.yml/badge.svg)](https://github.com/aave/protocol-v2/actions/workflows/node.js.yml)
```
        .///.                .///.     //.            .//  `/////////////-
       `++:++`              .++:++`    :++`          `++:  `++:......---.`
      `/+: -+/`            `++- :+/`    /+/         `/+/   `++.
      /+/   :+/            /+:   /+/    `/+/        /+/`   `++.
  -::/++::`  /+:       -::/++::` `/+:    `++:      :++`    `++/:::::::::.
  -:+++::-`  `/+:      --++/---`  `++-    .++-    -++.     `++/:::::::::.
   -++.       .++-      -++`       .++.    .++.  .++-      `++.
  .++-         -++.    .++.         -++.    -++``++-       `++.
 `++:           :++`  .++-           :++`    :+//+:        `++:----------`
 -/:             :/-  -/:             :/.     ://:         `/////////////-
```

# Aave Protocol v2 on NEON

This repository contains the smart contracts source code and markets configuration for Aave Protocol V2 for NEON platform. The repository uses Docker Compose and Hardhat as development enviroment for compilation, testing and deployment tasks.

## Getting Started

You can install `@aave/protocol-v2` as an NPM package in your Hardhat, Buidler or Truffle project to import the contracts and interfaces:

`npm install @aave/protocol-v2`

Import at Solidity files:

```
import {ILendingPool} from "@aave/protocol-v2/contracts/interfaces/ILendingPool.sol";

contract Misc {

  function deposit(address pool, address token, address user, uint256 amount) public {
    ILendingPool(pool).deposit(token, amount, user, 0);
    {...}
  }
}
```

The JSON artifacts with the ABI and Bytecode are also included into the bundled NPM package at `artifacts/` directory.

Import JSON file via Node JS `require`:

```
const LendingPoolV2Artifact = require('@aave/protocol-v2/artifacts/contracts/protocol/lendingpool/LendingPool.sol/LendingPool.json');

// Log the ABI into console
console.log(LendingPoolV2Artifact.abi)
```

## Setup

The repository uses Docker Compose to manage sensitive keys and load the configuration. Prior any action like test or deploy, you must run `docker-compose up` to start the `contracts-env` container, and then connect to the container console via `docker-compose exec contracts-env bash`.

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an enviroment file named `.env` and fill the next enviroment variables

```
# Mnemonic, only first address will be used
MNEMONIC=""

# Add Alchemy or Infura provider keys, alchemy takes preference at the config level
ALCHEMY_KEY=""
INFURA_KEY=""


# Optional Etherscan key, for automatize the verification of the contracts at Etherscan
ETHERSCAN_KEY=""

# Optional, if you plan to use Tenderly scripts
TENDERLY_PROJECT=""
TENDERLY_USERNAME=""

```

## Markets configuration

The configurations related with the Aave Markets are located at `markets` directory. You can follow the `IAaveConfiguration` interface to create new Markets configuration or extend the current Aave configuration.

Each market should have his own Market configuration file, and their own set of deployment tasks, using the Aave market config and tasks as a reference.

## Test

You can run the full test suite with the following commands:

```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# A new Bash terminal is prompted, connected to the container
npm run test
```

## Deployments

For deploying Aave Protocol V2, you can use the available scripts located at `package.json`. For a complete list, run `npm run` to see all the tasks.

### Kovan deployment

```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# A new Bash terminal is prompted, connected to the container
npm run aave:kovan:full:migration
```

### Mainnet fork deployment

You can deploy Aave Protocol v2 in a forked Mainnet chain using Hardhat built-in fork feature:

```
docker-compose run contracts-env npm run aave:fork:main
```

### Deploy Aave into a NEON via console

You can deploy Aave into the Hardhat console running through NEON, to interact with the protocol inside NEON or for testing purposes.

Run NEON:

```
sudo NEON_EVM_COMMIT=v0.8.3 FAUCET_COMMIT=latest REVISION=v0.9.1 docker-compose -f docker-compose.neon.yml up -d
```

Run the deploy and test task in NEON:

```
docker-compose run contracts-env npm run neonlabs:deploy
```

For interactive deploy and test, start hardhat console:

```
docker-compose run contracts-env npm run neonlabs:console
```

At the Hardhat console, interact with the Aave protocol:

```

// Deploy the Aave protocol in fork mode
await run('aave:dev')

// Or your custom Hardhat task
await run('your-custom-task');

// After you initialize the HRE via 'set-DRE' task, you can import any TS/JS file
await run('set-DRE');

// Import contract getters to retrieve an Ethers.js Contract instance
await run('set-DRE');
var BigNumber = require('bignumber.js');
const contractGetters = require('./helpers/contracts-getters'); // Import a TS/JS file
const contractHelpers = require('./helpers/contracts-helpers'); 
const configuration = require('./helpers/configuration'); 
const deployments = require('./helpers/contracts-deployments'); 

// Lending pool instance
const lendingPool = await contractGetters.getLendingPool();
var lendingPoolConfigurator = await contractGetters.getLendingPoolConfiguratorProxy();
var lendingPoolAddressProvider = await contractGetters.getLendingPoolAddressesProvider();
var priceOracle = await contractGetters.getPriceOracle();
var aaveProtocolDataProvider = await contractGetters.getAaveProtocolDataProvider();
var mockFlashLoanReceiver = await contractGetters.getMockFlashLoanReceiver();

// Unpause pool
var poolAdmin = await lendingPoolAddressProvider.getEmergencyAdmin()
var signer = await ethers.provider.getSigner(poolAdmin)
await lendingPoolConfigurator.connect(signer).setPoolPause(0)
await lendingPool.paused()

// Mint some intial balance
var [signer, signer1, depositor, borrower, liquidator] = await ethers.getSigners();
var reserves = await lendingPool.getReservesList()
var USDC = await contractGetters.getMintableERC20(reserves[0])
var USDT = await contractGetters.getMintableERC20(reserves[1])
var WETH = await contractGetters.getMintableERC20(reserves[2])
await USDC.connect(signer).mint(ethers.utils.parseUnits('10', 6))
await USDT.connect(signer1).mint(ethers.utils.parseUnits('10', 6))

ethers.utils.formatUnits(await USDC.balanceOf(await signer.getAddress()), 6)
ethers.utils.formatUnits(await USDT.balanceOf(await signer.getAddress()), 6)
ethers.utils.formatUnits(await USDC.balanceOf(await signer1.getAddress()), 6)
ethers.utils.formatUnits(await USDT.balanceOf(await signer1.getAddress()), 6)

// Deposit funds in the pool
await USDC.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('10', 6));
await USDT.connect(signer1).approve(lendingPool.address, ethers.utils.parseUnits('10', 6));
await lendingPool.connect(signer).deposit(USDC.address, ethers.utils.parseUnits('10', 6), await signer.getAddress(), '0');
await lendingPool.connect(signer1).deposit(USDT.address, ethers.utils.parseUnits('10', 6), await signer1.getAddress(), '0');

await lendingPool.connect(signer).borrow(USDT.address, ethers.utils.parseUnits('5', 6), 2, 0, await signer.getAddress())
await USDT.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('5', 6));
await lendingPool.connect(signer).repay(USDT.address, ethers.utils.parseUnits('5', 6), 2, await signer.getAddress())

await lendingPool.connect(signer).withdraw(USDC.address, ethers.utils.parseUnits('10', 6), await signer.getAddress());
await lendingPool.connect(signer1).withdraw(USDT.address, ethers.utils.parseUnits('10', 6), await signer1.getAddress());

var reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(USDT.address)
var reserveDataUSDC = await aaveProtocolDataProvider.getReserveData(USDC.address)
ethers.utils.formatEther(reserveDataUSDC.availableLiquidity)
ethers.utils.formatEther(reserveDataUSDT.availableLiquidity)
await lendingPool.connect(signer).flashLoan(mockFlashLoanReceiver.address, [USDT.address], [reserveDataUSDT.availableLiquidity], [0],   mockFlashLoanReceiver.address, '0x10', '0');
ethers.utils.formatEther(reserveDataUSDC.availableLiquidity)
ethers.utils.formatEther(reserveDataUSDT.availableLiquidity)

await USDC.connect(depositor).mint(ethers.utils.parseUnits('1000', 6))
await USDC.connect(liduidator).mint(ethers.utils.parseUnits('1000', 6))
await WETH.connect(borrower).mint(ethers.utils.parseEther('1'))

ethers.utils.formatUnits(await USDC.balanceOf(await depositor.getAddress()), 6)
ethers.utils.formatUnits(await USDC.balanceOf(await liquidator.getAddress()), 6)
ethers.utils.formatEther(await WETH.balanceOf(await liquidator.getAddress()))
ethers.utils.formatEther(await WETH.balanceOf(await borrower.getAddress()))
ethers.utils.formatUnits(await USDC.balanceOf(await borrower.getAddress()), 6)

await USDC.connect(depositor).approve(lendingPool.address, ethers.utils.parseUnits('1000', 6));
await USDC.connect(liquidator).approve(lendingPool.address, ethers.utils.parseUnits('1000', 6));
await WETH.connect(borrower).approve(lendingPool.address, ethers.utils.parseUnits('1'));

await lendingPool.connect(depositor).deposit(USDC.address, ethers.utils.parseUnits('1000', 6), await depositor.getAddress(), '0');
await lendingPool.connect(borrower).deposit(WETH.address, ethers.utils.parseUnits('1'), await borrower.getAddress(), '0');

var userGlobalData = await lendingPool.getUserAccountData(await borrower.getAddress());

var usdcPrice = await priceOracle.getAssetPrice(USDC.address);

var amountUSDCToBorrow = await contractHelpers.convertToCurrencyDecimals(
  USDC.address,
  new BigNumber(userGlobalData.availableBorrowsETH.toString())
    .div(usdcPrice.toString())
    .multipliedBy(0.9502)
    .toFixed(0)
);

await lendingPool.connect(borrower).borrow(USDC.address, amountUSDCToBorrow, '1', '0', borrower.address);

//drops HF below 1
await priceOracle.setAssetPrice(USDC.address, new BigNumber(usdcPrice.toString()).multipliedBy(1.12).toFixed(0));

var userReserveDataBefore = await aaveProtocolDataProvider.getUserReserveData(USDC.address, borrower.address);

var usdcReserveDataBefore = await aaveProtocolDataProvider.getReserveData(USDC.address);
var ethReserveDataBefore = await aaveProtocolDataProvider.getReserveData(WETH.address);

var amountToLiquidate = ethers.BigNumber.from(userReserveDataBefore1.currentStableDebt.toString()).div(2).toString();

await lendingPool.connect(liquidator).liquidationCall(WETH.address, USDC.address, borrower.address, amountToLiquidate, false);

var userReserveDataAfter = await aaveProtocolDataProvider.getUserReserveData(USDC.address, borrower.address);

var userGlobalDataAfter = await lendingPool.getUserAccountData(borrower.address);

var usdcReserveDataAfter = await aaveProtocolDataProvider.getReserveData(USDC.address);
var ethReserveDataAfter = await aaveProtocolDataProvider.getReserveData(WETH.address);

var collateralPrice = await priceOracle.getAssetPrice(WETH.address);
var principalPrice = await priceOracle.getAssetPrice(USDC.address);

const collateralDecimals = (await aaveProtocolDataProvider.getReserveConfigurationData(WETH.address)).decimals.toString();
const principalDecimals = (await aaveProtocolDataProvider.getReserveConfigurationData(USDC.address)).decimals.toString();

var expectedCollateralLiquidated = new BigNumber(principalPrice.toString()).times(new BigNumber(amountToLiquidate).times(105)).times(new BigNumber(10).pow(collateralDecimals)).div(new BigNumber(collateralPrice.toString()).times(new BigNumber(10).pow(principalDecimals))).div(100).decimalPlaces(0, BigNumber.ROUND_DOWN).toString();
```