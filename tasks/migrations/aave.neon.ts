import { task } from 'hardhat/config';
import {
  getLendingPool,
  getLendingPoolConfiguratorProxy,
  getLendingPoolAddressesProvider,
  getAaveProtocolDataProvider,
  getMockFlashLoanReceiver,
  getMintableERC20,
} from '../../helpers/contracts-getters';

task('aave:neon', 'Test scenarios on NEON')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addFlag('skipRegistry', 'Skip addresses provider registration at Addresses Provider Registry')
  .setAction(async ({ verify, skipRegistry }, DRE) => {
    await DRE.run('set-DRE');

    // Deploying contracts
    console.log('~~~~~~~~~~~  DEPLOYING CONTRACTS ~~~~~~~~~~~');
    await DRE.run('aave:dev');

    let lendingPoolAddressProvider = await getLendingPoolAddressesProvider();

    // Lending pool instance
    let lendingPool = await getLendingPool();
    console.log(`Lending Pool Address ${lendingPool.address}`);
    let lendingPoolConfigurator = await getLendingPoolConfiguratorProxy();
    let aaveProtocolDataProvider = await getAaveProtocolDataProvider();
    let mockFlashLoanReceiver = await getMockFlashLoanReceiver();

    let [user1, user2] = await DRE.ethers.getSigners();

    let reserves = await lendingPool.getReservesList();

    console.log(reserves);

    let DAI = await getMintableERC20(reserves[0]);
    let AAVE = await getMintableERC20(reserves[1]);
    let TUSD = await getMintableERC20(reserves[2]);
    console.log(DAI.address);
    console.log(AAVE.address);
    console.log(TUSD.address);

    await DAI.connect(user1).mint(DRE.ethers.utils.parseUnits('10', 6));
    await AAVE.connect(user2).mint(DRE.ethers.utils.parseUnits('10', 6));

    console.log('Initial balances');
    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );

    console.log('Unpausing pool');
    let poolAdmin = await lendingPoolAddressProvider.getEmergencyAdmin();
    let poolAdminUser1 = await DRE.ethers.provider.getSigner(poolAdmin);
    await lendingPoolConfigurator.connect(poolAdminUser1).setPoolPause(false);
    console.log('Pool paused: ', await lendingPool.paused());

    console.log('\nDepositing 10 USDC from user 1 and 10 USDT from user 2 into the pool');
    await DAI.connect(user1).approve(lendingPool.address, DRE.ethers.utils.parseUnits('10', 6));
    await AAVE.connect(user2).approve(lendingPool.address, DRE.ethers.utils.parseUnits('10', 6));
    await lendingPool
      .connect(user1)
      .deposit(DAI.address, DRE.ethers.utils.parseUnits('10', 6), await user1.getAddress(), '0', {
        gasLimit: 10000000,
      });
    await lendingPool
      .connect(user2)
      .deposit(AAVE.address, DRE.ethers.utils.parseUnits('10', 6), await user2.getAddress(), '0', {
        gasLimit: 10000000,
      });
    console.log('Current balances');
    console.log(
      'User 1 USDC:',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC:',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );

    // AUSDC, AUSDT - aave tokens holding reserves
    let AUSDC = (await aaveProtocolDataProvider.getReserveTokensAddresses(DAI.address))
      .aTokenAddress;
    let AUSDT = (await aaveProtocolDataProvider.getReserveTokensAddresses(AAVE.address))
      .aTokenAddress;
    console.log(
      'Pool USDC balance (aUSDC tokens minted):  ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(AUSDC), 6)
    );
    console.log(
      'Pool USDT balance (aUSDT tokens minted):  ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(AUSDT), 6)
    );

    console.log('\nUser 1 borrows 5 USDT');
    let tx = await lendingPool
      .connect(user1)
      .borrow(AAVE.address, DRE.ethers.utils.parseUnits('5', 6), 2, 0, await user1.getAddress(), {
        gasLimit: 10000000,
      });

    await tx.wait();

    let AUSDTToken = await getMintableERC20(AUSDT);
    let AUSDCToken = await getMintableERC20(AUSDC);

    console.log('Current balances');
    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6),
      ' AUSDT: ',
      DRE.ethers.utils.formatUnits(await AUSDTToken.balanceOf(await user1.getAddress()), 6),
      ' AUSDC: ',
      DRE.ethers.utils.formatUnits(await AUSDCToken.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6),
      ' AUSDT: ',
      DRE.ethers.utils.formatUnits(await AUSDTToken.balanceOf(await user2.getAddress()), 6),
      ' AUSDC: ',
      DRE.ethers.utils.formatUnits(await AUSDCToken.balanceOf(await user2.getAddress()), 6)
    );
    console.log(
      'Pool USDC balance:  ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(AUSDC), 6)
    );
    console.log(
      'Pool USDT balance:  ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(AUSDT), 6)
    );

    console.log('');
    console.log('User 1 repays 5 USDT');
    await AAVE.connect(user1).approve(lendingPool.address, DRE.ethers.utils.parseUnits('5', 6));
    await lendingPool
      .connect(user1)
      .repay(AAVE.address, DRE.ethers.utils.parseUnits('5', 6), 2, await user1.getAddress(), {
        gasLimit: 10000000,
      });
    console.log(
      'User 1 USDC: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 USDC: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );

    console.log('');
    console.log('~~~~~~~~~~~  FLASHLOAN ~~~~~~~~~~~');
    console.log('');
    let reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(AAVE.address);
    console.log(
      'User 1 takes a flashloan for all available USDT in the pool(',
      DRE.ethers.utils.formatUnits(reserveDataUSDT.availableLiquidity, 6),
      ')'
    );
    await lendingPool
      .connect(user1)
      .flashLoan(
        mockFlashLoanReceiver.address,
        [AAVE.address],
        [reserveDataUSDT.availableLiquidity],
        [0],
        mockFlashLoanReceiver.address,
        '0x10',
        '0',
        {
          gasLimit: 10000000,
        }
      );
    reserveDataUSDT = await aaveProtocolDataProvider.getReserveData(AAVE.address);
    console.log(
      'Available liquidity after the flashloan: ',
      DRE.ethers.utils.formatUnits(reserveDataUSDT.availableLiquidity, 6)
    );

    console.log('User 1 and User 2 withdraw their deposits from the protocol');
    await lendingPool
      .connect(user1)
      .withdraw(DAI.address, DRE.ethers.utils.parseUnits('10', 6), await user1.getAddress(), {
        gasLimit: 10000000,
      });
    await lendingPool
      .connect(user2)
      .withdraw(AAVE.address, DRE.ethers.utils.parseUnits('10', 6), await user2.getAddress(), {
        gasLimit: 10000000,
      });
    console.log('Current balances');
    console.log(
      'User 1: USDC',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2: USDC',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' USDT: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );
    console.log(
      'Pool USDC balance:  ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(AUSDC), 6)
    );
    console.log(
      'Pool USDT balance:  ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(AUSDT), 6)
    );

    console.log('\nTest scenario finished with success!');
  });
