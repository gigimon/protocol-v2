import { ethers } from 'hardhat';
import { task } from 'hardhat/config';
import BigNumber from 'bignumber.js';
import {
  getLendingPool,
  getLendingPoolConfiguratorProxy,
  getLendingPoolAddressesProvider,
  getAaveProtocolDataProvider,
  getPriceOracle,
  getMockFlashLoanReceiver,
  getMintableERC20,
} from '../../helpers/contracts-getters';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import fs from 'fs/promises';

type ReportItem = { [key: string]: string | number };

task('aave:neon', 'Test scenarios on NEON')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addFlag('skipRegistry', 'Skip addresses provider registration at Addresses Provider Registry')
  .setAction(async ({ verify, skipRegistry }, DRE) => {
    await DRE.run('set-DRE');

    // Deploying contracts
    console.log('~~~~~~~~~~~  DEPLOYING CONTRACTS ~~~~~~~~~~~');
    await DRE.run('aave:dev');

    const gasPrice = await ethers.provider.getGasPrice();
    let report = {
      name: 'AAVE',
      actions: [] as ReportItem[],
    };

    let lendingPoolAddressProvider = await getLendingPoolAddressesProvider();
    // Lending pool instance
    let lendingPool = await getLendingPool();
    let lendingPoolConfigurator = await getLendingPoolConfiguratorProxy();
    let priceOracle = await getPriceOracle();
    let aaveProtocolDataProvider = await getAaveProtocolDataProvider();
    let mockFlashLoanReceiver = await getMockFlashLoanReceiver();
    let [user1, user2, depositor, borrower, liquidator] = await DRE.ethers.getSigners();
    let reserves = await lendingPool.getReservesList();
    let USDC = await getMintableERC20(reserves[0]);
    let USDT = await getMintableERC20(reserves[1]);
    let WETH = await getMintableERC20(reserves[2]);
    await USDC.connect(user1).mint(DRE.ethers.utils.parseUnits('10', 6));
    await USDT.connect(user2).mint(DRE.ethers.utils.parseUnits('10', 6));

    console.log('Intitial balances');
    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user2.getAddress()), 6)
    );

    console.log('Unpausing pool');
    let poolAdmin = await lendingPoolAddressProvider.getEmergencyAdmin();
    let poolAdminUser1 = await DRE.ethers.provider.getSigner(poolAdmin);
    await waitForTx(await lendingPoolConfigurator.connect(poolAdminUser1).setPoolPause(false));
    console.log('Pool paused: ', await lendingPool.paused());

    console.log('');
    console.log('Depositing 10 USDC from user 1 and 10 USDT from user 2 into the pool');
    const approveTx = await USDC.connect(user1).approve(
      lendingPool.address,
      DRE.ethers.utils.parseUnits('10', 6)
    );
    await waitForTx(approveTx);

    report['actions'].push({
      name: 'Token approve',
      usedGas: approveTx['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: approveTx['transactionHash'],
    });

    await waitForTx(
      await USDT.connect(user2).approve(lendingPool.address, DRE.ethers.utils.parseUnits('10', 6))
    );
    const depTx = await lendingPool
      .connect(user1)
      .deposit(USDC.address, DRE.ethers.utils.parseUnits('10', 6), await user1.getAddress(), '0');
    await waitForTx(depTx);

    report['actions'].push({
      name: 'Deposit to lending pool',
      usedGas: depTx['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: depTx['transactionHash'],
    });

    await waitForTx(
      await lendingPool
        .connect(user2)
        .deposit(USDT.address, DRE.ethers.utils.parseUnits('10', 6), await user2.getAddress(), '0')
    );
    console.log('Current balances');
    console.log(
      'User 1 USDC:',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC:',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user2.getAddress()), 6)
    );

    // AUSDC, AUSDT - aave tokens holding reserves
    let AUSDC = (await aaveProtocolDataProvider.getReserveTokensAddresses(USDC.address))
      .aTokenAddress;
    let AUSDT = (await aaveProtocolDataProvider.getReserveTokensAddresses(USDT.address))
      .aTokenAddress;
    console.log(
      'Pool USDC balance (aUSDC tokens minted):  ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(AUSDC), 6)
    );
    console.log(
      'Pool USDT balance (aUSDT tokens minted):  ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(AUSDT), 6)
    );

    console.log('');
    console.log('User 1 borrows 5 USDT');
    const txBor = await lendingPool
      .connect(user1)
      .borrow(USDT.address, DRE.ethers.utils.parseUnits('5', 6), 2, 0, await user1.getAddress());
    await waitForTx(txBor);

    report['actions'].push({
      name: 'Borrow from lending pool',
      usedGas: txBor['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: txBor['transactionHash'],
    });

    console.log('Current balances');
    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user2.getAddress()), 6)
    );
    console.log(
      'Pool USDC balance:  ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(AUSDC), 6)
    );
    console.log(
      'Pool USDT balance:  ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(AUSDT), 6)
    );

    console.log('');
    console.log('User 1 repays 5 USDT');
    await waitForTx(
      await USDT.connect(user1).approve(lendingPool.address, DRE.ethers.utils.parseUnits('5', 6))
    );
    const repayTx = await lendingPool
      .connect(user1)
      .repay(USDT.address, DRE.ethers.utils.parseUnits('5', 6), 2, await user1.getAddress());
    await waitForTx(repayTx);

    report['actions'].push({
      name: 'Repay',
      usedGas: repayTx['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: repayTx['transactionHash'],
    });

    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user2.getAddress()), 6)
    );

    console.log('');
    console.log('~~~~~~~~~~~  FLASHLOAN ~~~~~~~~~~~');
    console.log('');
    let reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(USDT.address);
    console.log(
      'User 1 takes a flashloan for all available USDT in the pool(',
      DRE.ethers.utils.formatUnits(reserveDataUSDT.availableLiquidity, 6),
      ')'
    );
    const flashTx = await lendingPool
      .connect(user1)
      .flashLoan(
        mockFlashLoanReceiver.address,
        [USDT.address],
        [reserveDataUSDT.availableLiquidity],
        [0],
        mockFlashLoanReceiver.address,
        '0x10',
        '0'
      );
    await waitForTx(flashTx);

    report['actions'].push({
      name: 'Flashload',
      usedGas: flashTx['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: flashTx['transactionHash'],
    });

    reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(USDT.address);
    console.log(
      'Available liquidity after the flashloan: ',
      DRE.ethers.utils.formatUnits(reserveDataUSDT.availableLiquidity, 6)
    );

    console.log('User 1 and User 2 withdraw their deposits from the protocol');
    const txWith = await lendingPool
      .connect(user1)
      .withdraw(USDC.address, DRE.ethers.utils.parseUnits('10', 6), await user1.getAddress());
    await waitForTx(txWith);

    report['actions'].push({
      name: 'Withdraw',
      usedGas: txWith['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: txWith['transactionHash'],
    });

    await waitForTx(
      await lendingPool
        .connect(user2)
        .withdraw(USDT.address, DRE.ethers.utils.parseUnits('10', 6), await user2.getAddress())
    );
    console.log('Current balances');
    console.log(
      'User 1: USDC',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2: USDC',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user2.getAddress()), 6)
    );
    console.log(
      'Pool USDC balance:  ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(AUSDC), 6)
    );
    console.log(
      'Pool USDT balance:  ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(AUSDT), 6)
    );

    console.log('');
    console.log('~~~~~~~~~~~  LIQUIDATION ~~~~~~~~~~~');
    console.log('');

    await waitForTx(await USDC.connect(depositor).mint(DRE.ethers.utils.parseUnits('1000', 6)));
    await waitForTx(await USDC.connect(liquidator).mint(DRE.ethers.utils.parseUnits('1000', 6)));
    await waitForTx(await WETH.connect(borrower).mint(DRE.ethers.utils.parseEther('1')));

    console.log('Intitial balances');
    console.log(
      'Depositor: USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await depositor.getAddress()), 6)
    );
    console.log(
      'Borrower: USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await borrower.getAddress()), 6),
      ' WETH: ',
      DRE.ethers.utils.formatUnits(await WETH.balanceOf(await borrower.getAddress()), 18)
    );
    console.log(
      'Liquidator: USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await liquidator.getAddress()), 6),
      ' WETH: ',
      DRE.ethers.utils.formatUnits(await WETH.balanceOf(await liquidator.getAddress()), 18)
    );
    console.log('');

    await waitForTx(
      await USDC.connect(depositor).approve(
        lendingPool.address,
        DRE.ethers.utils.parseUnits('1000', 6)
      )
    );
    await waitForTx(
      await USDC.connect(liquidator).approve(
        lendingPool.address,
        DRE.ethers.utils.parseUnits('1000', 6)
      )
    );
    await waitForTx(
      await WETH.connect(borrower).approve(lendingPool.address, DRE.ethers.utils.parseUnits('1'))
    );

    console.log('Depositor and Borrower deposit funds into the pool');
    await waitForTx(
      await lendingPool
        .connect(depositor)
        .deposit(
          USDC.address,
          DRE.ethers.utils.parseUnits('1000', 6),
          await depositor.getAddress(),
          '0'
        )
    );
    await waitForTx(
      await lendingPool
        .connect(borrower)
        .deposit(WETH.address, DRE.ethers.utils.parseUnits('1'), await borrower.getAddress(), '0')
    );

    let userGlobalData = await lendingPool.getUserAccountData(await borrower.getAddress());

    let usdcPrice = await priceOracle.getAssetPrice(USDC.address);

    let amountUSDCToBorrow = await convertToCurrencyDecimals(
      USDC.address,
      new BigNumber(userGlobalData.availableBorrowsETH.toString())
        .div(usdcPrice.toString())
        .multipliedBy(0.9502)
        .toFixed(0)
    );
    console.log(
      'USDC price: ',
      DRE.ethers.utils.formatEther(usdcPrice.toString()),
      ', can borrow ',
      DRE.ethers.utils.formatUnits(amountUSDCToBorrow.toString(), 6),
      ' USDC'
    );
    await waitForTx(
      await lendingPool
        .connect(borrower)
        .borrow(USDC.address, amountUSDCToBorrow, '1', '0', borrower.address)
    );

    console.log('Borrower borrows USDC');
    console.log(
      'Borrower: USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await borrower.getAddress()), 6),
      ' WETH: ',
      DRE.ethers.utils.formatUnits(await WETH.balanceOf(await borrower.getAddress()), 18)
    );

    //drops HF below 1
    console.log('Dropping health factor below 1...');
    await waitForTx(
      await priceOracle.setAssetPrice(
        USDC.address,
        new BigNumber(usdcPrice.toString()).multipliedBy(1.12).toFixed(0)
      )
    );

    let userGlobalDataBefore = await lendingPool.getUserAccountData(await borrower.getAddress());
    console.log(
      'Borrower health factor: ',
      DRE.ethers.utils.formatEther(userGlobalDataBefore.healthFactor)
    );

    let userReserveDataBefore = await aaveProtocolDataProvider.getUserReserveData(
      USDC.address,
      borrower.address
    );

    let amountToLiquidate = DRE.ethers.BigNumber.from(
      userReserveDataBefore.currentStableDebt.toString()
    )
      .div(2)
      .toString();
    console.log('Can liquidate ', DRE.ethers.utils.formatUnits(amountToLiquidate, 6), 'USDC');

    console.log('');
    console.log('Performing liquidation ...');
    const liquidTx = await lendingPool
      .connect(liquidator)
      .liquidationCall(WETH.address, USDC.address, borrower.address, amountToLiquidate, false);
    await waitForTx(liquidTx);

    report['actions'].push({
      name: 'Liquidation',
      usedGas: liquidTx['gasUsed'].toString(),
      gasPrice: gasPrice.toString(),
      tx: liquidTx['transactionHash'],
    });

    let userGlobalDataAfter = await lendingPool.getUserAccountData(borrower.address);
    console.log(
      'New borrower health factor: ',
      DRE.ethers.utils.formatEther(userGlobalDataAfter.healthFactor)
    );

    let collateralPrice = await priceOracle.getAssetPrice(WETH.address);
    let principalPrice = await priceOracle.getAssetPrice(USDC.address);

    const collateralDecimals = (
      await aaveProtocolDataProvider.getReserveConfigurationData(WETH.address)
    ).decimals.toString();
    const principalDecimals = (
      await aaveProtocolDataProvider.getReserveConfigurationData(USDC.address)
    ).decimals.toString();

    let expectedCollateralLiquidated = new BigNumber(principalPrice.toString())
      .times(new BigNumber(amountToLiquidate).times(105))
      .times(new BigNumber(10).pow(collateralDecimals))
      .div(
        new BigNumber(collateralPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
      )
      .div(100)
      .decimalPlaces(0, BigNumber.ROUND_DOWN)
      .toString();
    console.log(
      'Expected collateral liquidated: ',
      DRE.ethers.utils.formatEther(expectedCollateralLiquidated)
    );
    console.log(
      'Liquidator: USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await liquidator.getAddress()), 6),
      ' WETH: ',
      DRE.ethers.utils.formatUnits(await WETH.balanceOf(await liquidator.getAddress()), 18)
    );

    console.log('');
    console.log('Test scenario finished with success!');
    await fs.writeFile('report.json', JSON.stringify(report));
  });
