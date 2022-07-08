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
sudo NEON_EVM_COMMIT=v0.7.8 FAUCET_COMMIT=latest REVISION=v0.7.23 docker-compose -f docker-compose-test.yml up -d
```

Run the console in NEON:

```
docker-compose run contracts-env npm run aave:neonlabs:console
```

At the Hardhat console, interact with the Aave protocol in Mainnet fork mode:

```
// Deploy the Aave protocol in fork mode
await run('aave:dev')

// Or your custom Hardhat task
await run('your-custom-task');

// After you initialize the HRE via 'set-DRE' task, you can import any TS/JS file
run('set-DRE');

// Import contract getters to retrieve an Ethers.js Contract instance
const contractGetters = require('./helpers/contracts-getters'); // Import a TS/JS file
const contractHelpers = require('./helpers/contracts-helpers'); 
const configuration = require('./helpers/configuration'); 

// Lending pool instance
const lendingPool = await contractGetters.getLendingPool();
var lendingPoolConfigurator = await contractGetters.getLendingPoolConfiguratorProxy();
var priceOracle = await contractGetters.getPriceOracle();
var aaveProtocolDataProvider = await contractGetters.getAaveProtocolDataProvider();

// Unpause pool
var poolAdmin = await lendingPoolAddressProvider.getEmergencyAdmin()
var signer = await ethers.provider.getSigner(poolAdmin)
await lendingPoolConfigurator.connect(signer).setPoolPause(0)
await lendingPool.paused()

// Mint some intial balance
var reserves = await lendingPool.getReservesList()
var USDC = await contractGetters.getMintableERC20(reserves[0])
await USDC.mint(ethers.utils.parseEther('10'))
var signer = await ethers.provider.getSigner()
ethers.utils.formatEther(await USDC.balanceOf(await signer.getAddress()))

// Deposit funds in the pool
await USDC.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('10'));
await lendingPool.connect(signer).deposit(USDC.address, ethers.utils.parseUnits('10'), await signer.getAddress(), '0');
await lendingPool.connect(signer).withdraw(USDC.address, ethers.utils.parseUnits('10'), await signer.getAddress());

// You can impersonate any Ethereum address
await network.provider.request({ method: "hardhat_impersonateAccount",  params: ["0xb1adceddb2941033a090dd166a462fe1c2029484"]});

const signer = await ethers.provider.getSigner("0xb1adceddb2941033a090dd166a462fe1c2029484")

// ERC20 token DAI Mainnet instance
const DAI = await contractGetters.getIErc20Detailed("0x6B175474E89094C44Da98b954EedeAC495271d0F");

// Approve 100 DAI to LendingPool address
await DAI.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('100'));

// Deposit 100 DAI
await lendingPool.connect(signer).deposit(DAI.address, ethers.utils.parseUnits('100'), await signer.getAddress(), '0');

```

## Interact with Aave in Mainnet via console

You can interact with Aave at Mainnet network using the Hardhat console, in the scenario where the frontend is down or you want to interact directly. You can check the deployed addresses at https://docs.aave.com/developers/deployed-contracts.

Run the Hardhat console pointing to the Mainnet network:

```
docker-compose run contracts-env npx hardhat --network main console
```

At the Hardhat console, you can interact with the protocol:

```
// Load the HRE into helpers to access signers
run("set-DRE")

// Import getters to instance any Aave contract
const contractGetters = require('./helpers/contracts-getters');

// Load the first signer
const signer = await contractGetters.getFirstSigner();

// Lending pool instance
const lendingPool = await contractGetters.getLendingPool("0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9");

// ERC20 token DAI Mainnet instance
const DAI = await contractGetters.getIErc20Detailed("0x6B175474E89094C44Da98b954EedeAC495271d0F");

// Approve 100 DAI to LendingPool address
await DAI.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('100'));

// Deposit 100 DAI
await lendingPool.connect(signer).deposit(DAI.address, ethers.utils.parseUnits('100'), await signer.getAddress(), '0');
```
