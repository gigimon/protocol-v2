import { Console } from 'console';
import { task } from 'hardhat/config';
import BigNumber from 'bignumber.js';
import {
  getLendingPool,
  getLendingPoolConfiguratorProxy,
  getLendingPoolAddressesProvider,
  getAaveProtocolDataProvider,
  getPriceOracle,
  getMockFlashLoanReceiver,
  getIErc20Detailed,
  getMintableERC20,
} from '../../helpers/contracts-getters';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';

task('aave:neon', 'Test scenarios on NEON')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addFlag('skipRegistry', 'Skip addresses provider registration at Addresses Provider Registry')
  .setAction(async ({ verify, skipRegistry }, DRE) => {
    await DRE.run('set-DRE');

    // Deploying contracts
    console.log('~~~~~~~~~~~  DEPLOYING CONTRACTS ~~~~~~~~~~~');
    await DRE.run('aave:dev');

    var lendingPoolAddressProvider = await getLendingPoolAddressesProvider();

    // Lending pool instance
    var lendingPool = await getLendingPool();
    console.log(`Lending Pool Address ${lendingPool.address}`);
    var lendingPoolConfigurator = await getLendingPoolConfiguratorProxy();
    var priceOracle = await getPriceOracle();
    var aaveProtocolDataProvider = await getAaveProtocolDataProvider();
    var mockFlashLoanReceiver = await getMockFlashLoanReceiver();

    var [user1, user2, depositor, borrower, liquidator] = await DRE.ethers.getSigners();

    var reserves = await lendingPool.getReservesList();

    console.log(reserves);

    var USDC = await getMintableERC20(reserves[0]);
    var USDT = await getMintableERC20(reserves[1]);
    var WETH = await getMintableERC20(reserves[2]);
    console.log(USDC.address);
    console.log(USDT.address);
    console.log(WETH.address);

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
    var poolAdmin = await lendingPoolAddressProvider.getEmergencyAdmin();
    var poolAdminUser1 = await DRE.ethers.provider.getSigner(poolAdmin);
    await lendingPoolConfigurator.connect(poolAdminUser1).setPoolPause(false);
    console.log('Pool paused: ', await lendingPool.paused());

    console.log('');
    console.log('Depositing 10 USDC from user 1 and 10 USDT from user 2 into the pool');
    await USDC.connect(user1).approve(lendingPool.address, DRE.ethers.utils.parseUnits('10', 6));
    await USDT.connect(user2).approve(lendingPool.address, DRE.ethers.utils.parseUnits('10', 6));
    await lendingPool
      .connect(user1)
      .deposit(USDC.address, DRE.ethers.utils.parseUnits('10', 6), await user1.getAddress(), '0', {
        gasLimit: 10000000,
      });
    await lendingPool
      .connect(user2)
      .deposit(USDT.address, DRE.ethers.utils.parseUnits('10', 6), await user2.getAddress(), '0', {
        gasLimit: 10000000,
      });
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
    var AUSDC = (await aaveProtocolDataProvider.getReserveTokensAddresses(USDC.address))
      .aTokenAddress;
    var AUSDT = (await aaveProtocolDataProvider.getReserveTokensAddresses(USDT.address))
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
    let tx = await lendingPool
      .connect(user1)
      .borrow(USDT.address, DRE.ethers.utils.parseUnits('5', 6), 2, 0, await user1.getAddress(), {
        gasLimit: 10000000,
      });

    await tx.wait();

    var AUSDTToken = await getMintableERC20(AUSDT);
    var AUSDCToken = await getMintableERC20(AUSDC);

    console.log('Current balances');
    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user1.getAddress()), 6),
      ' AUSDT: ',
      DRE.ethers.utils.formatUnits(await AUSDTToken.balanceOf(await user1.getAddress()), 6),
      ' AUSDC: ',
      DRE.ethers.utils.formatUnits(await AUSDCToken.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await USDT.balanceOf(await user2.getAddress()), 6),
      ' AUSDT: ',
      DRE.ethers.utils.formatUnits(await AUSDTToken.balanceOf(await user2.getAddress()), 6),
      ' AUSDC: ',
      DRE.ethers.utils.formatUnits(await AUSDCToken.balanceOf(await user2.getAddress()), 6)
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
    await USDT.connect(user1).approve(lendingPool.address, DRE.ethers.utils.parseUnits('5', 6));
    await lendingPool
      .connect(user1)
      .repay(USDT.address, DRE.ethers.utils.parseUnits('5', 6), 2, await user1.getAddress(), {
        gasLimit: 10000000,
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
    var reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(USDT.address);
    console.log(
      'User 1 takes a flashloan for all available USDT in the pool(',
      DRE.ethers.utils.formatUnits(reserveDataUSDT.availableLiquidity, 6),
      ')'
    );
    await lendingPool
      .connect(user1)
      .flashLoan(
        mockFlashLoanReceiver.address,
        [USDT.address],
        [reserveDataUSDT.availableLiquidity],
        [0],
        mockFlashLoanReceiver.address,
        '0x10',
        '0',
        {
          gasLimit: 10000000,
        }
      );
    reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(USDT.address);
    console.log(
      'Available liquidity after the flashloan: ',
      DRE.ethers.utils.formatUnits(reserveDataUSDT.availableLiquidity, 6)
    );

    console.log('User 1 and User 2 withdraw their deposits from the protocol');
    await lendingPool
      .connect(user1)
      .withdraw(USDC.address, DRE.ethers.utils.parseUnits('10', 6), await user1.getAddress(), {
        gasLimit: 10000000,
      });
    await lendingPool
      .connect(user2)
      .withdraw(USDT.address, DRE.ethers.utils.parseUnits('10', 6), await user2.getAddress(), {
        gasLimit: 10000000,
      });
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

    await USDC.connect(depositor).mint(DRE.ethers.utils.parseUnits('1000', 6));
    await USDC.connect(liquidator).mint(DRE.ethers.utils.parseUnits('1000', 6));
    await WETH.connect(borrower).mint(DRE.ethers.utils.parseEther('1'));

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

    await USDC.connect(depositor).approve(
      lendingPool.address,
      DRE.ethers.utils.parseUnits('1000', 6)
    );
    await USDC.connect(liquidator).approve(
      lendingPool.address,
      DRE.ethers.utils.parseUnits('1000', 6)
    );
    await WETH.connect(borrower).approve(lendingPool.address, DRE.ethers.utils.parseUnits('1'));

    console.log('Depositor and Borrower deposit funds into the pool');
    await lendingPool
      .connect(depositor)
      .deposit(
        USDC.address,
        DRE.ethers.utils.parseUnits('1000', 6),
        await depositor.getAddress(),
        '0',
        {
          gasLimit: 10000000,
        }
      );
    await lendingPool
      .connect(borrower)
      .deposit(WETH.address, DRE.ethers.utils.parseUnits('1'), await borrower.getAddress(), '0', {
        gasLimit: 10000000,
      });

    var userGlobalData = await lendingPool.getUserAccountData(await borrower.getAddress());

    var usdcPrice = await priceOracle.getAssetPrice(USDC.address);

    var amountUSDCToBorrow = await convertToCurrencyDecimals(
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
    await lendingPool
      .connect(borrower)
      .borrow(USDC.address, amountUSDCToBorrow, '1', '0', borrower.address, {
        gasLimit: 10000000,
      });

    console.log('Borrower borrows USDC');
    console.log(
      'Borrower: USDC: ',
      DRE.ethers.utils.formatUnits(await USDC.balanceOf(await borrower.getAddress()), 6),
      ' WETH: ',
      DRE.ethers.utils.formatUnits(await WETH.balanceOf(await borrower.getAddress()), 18)
    );

    // //drops HF below 1
    // console.log('Dropping health factor below 1...');
    // await priceOracle.setAssetPrice(
    //   USDC.address,
    //   new BigNumber(usdcPrice.toString()).multipliedBy(1.12).toFixed(0)
    // );

    // var userGlobalDataBefore = await lendingPool.getUserAccountData(await borrower.getAddress());
    // console.log(
    //   'Borrower health factor: ',
    //   DRE.ethers.utils.formatEther(userGlobalDataBefore.healthFactor)
    // );

    // var userReserveDataBefore = await aaveProtocolDataProvider.getUserReserveData(
    //   USDC.address,
    //   borrower.address
    // );

    // var usdcReserveDataBefore = await aaveProtocolDataProvider.getReserveData(USDC.address);
    // var ethReserveDataBefore = await aaveProtocolDataProvider.getReserveData(WETH.address);

    // var amountToLiquidate = DRE.ethers.BigNumber.from(
    //   userReserveDataBefore.currentStableDebt.toString()
    // )
    //   .div(2)
    //   .toString();
    // console.log('Can liquidate ', DRE.ethers.utils.formatUnits(amountToLiquidate, 6), 'USDC');

    // console.log('');
    // console.log('Performing liquidation ...');
    // await lendingPool
    //   .connect(liquidator)
    //   .liquidationCall(WETH.address, USDC.address, borrower.address, amountToLiquidate, false, {
    //     gasLimit: 10000000,
    //   });

    // var userReserveDataAfter = await aaveProtocolDataProvider.getUserReserveData(
    //   USDC.address,
    //   borrower.address
    // );

    // var userGlobalDataAfter = await lendingPool.getUserAccountData(borrower.address);
    // console.log(
    //   'New borrower health factor: ',
    //   DRE.ethers.utils.formatEther(userGlobalDataAfter.healthFactor)
    // );

    // var usdcReserveDataAfter = await aaveProtocolDataProvider.getReserveData(USDC.address);
    // var ethReserveDataAfter = await aaveProtocolDataProvider.getReserveData(WETH.address);

    // var collateralPrice = await priceOracle.getAssetPrice(WETH.address);
    // var principalPrice = await priceOracle.getAssetPrice(USDC.address);

    // const collateralDecimals = (
    //   await aaveProtocolDataProvider.getReserveConfigurationData(WETH.address)
    // ).decimals.toString();
    // const principalDecimals = (
    //   await aaveProtocolDataProvider.getReserveConfigurationData(USDC.address)
    // ).decimals.toString();

    // var expectedCollateralLiquidated = new BigNumber(principalPrice.toString())
    //   .times(new BigNumber(amountToLiquidate).times(105))
    //   .times(new BigNumber(10).pow(collateralDecimals))
    //   .div(
    //     new BigNumber(collateralPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
    //   )
    //   .div(100)
    //   .decimalPlaces(0, BigNumber.ROUND_DOWN)
    //   .toString();
    // console.log(
    //   'Expected collateral liquidated: ',
    //   DRE.ethers.utils.formatEther(expectedCollateralLiquidated)
    // );
    // console.log(
    //   'Liquidator: USDC: ',
    //   DRE.ethers.utils.formatUnits(await USDC.balanceOf(await liquidator.getAddress()), 6),
    //   ' WETH: ',
    //   DRE.ethers.utils.formatUnits(await WETH.balanceOf(await liquidator.getAddress()), 18)
    // );

    console.log('');
    console.log('Test scenario finished with success!');
  });
