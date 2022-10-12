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

    await DAI.connect(user1).mint(DRE.ethers.utils.parseUnits('10', 6));
    await AAVE.connect(user2).mint(DRE.ethers.utils.parseUnits('10', 6));

    console.log('Initial balances');
    console.log(
      'User 1 DAI: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 DAI: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );

    console.log('Unpausing pool');
    let poolAdmin = await lendingPoolAddressProvider.getEmergencyAdmin();
    let poolAdminUser1 = await DRE.ethers.provider.getSigner(poolAdmin);
    await lendingPoolConfigurator.connect(poolAdminUser1).setPoolPause(false);
    console.log('Pool paused: ', await lendingPool.paused());

    console.log('\nDepositing 10 DAI from user 1 and 10 AAVE from user 2 into the pool');
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
      'User 1 DAI:',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 DAI:',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );

    // ADAI, AAAVE - aave tokens holding reserves
    let ADAI = (await aaveProtocolDataProvider.getReserveTokensAddresses(DAI.address))
      .aTokenAddress;
    let AAAVE = (await aaveProtocolDataProvider.getReserveTokensAddresses(AAVE.address))
      .aTokenAddress;
    console.log(
      'Pool DAI balance (aDAI tokens minted):  ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(ADAI), 6)
    );
    console.log(
      'Pool AAVE balance (aAAVE tokens minted):  ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(AAAVE), 6)
    );

    console.log('\nUser 1 borrows 5 AAVE');
    let tx = await lendingPool
      .connect(user1)
      .borrow(AAVE.address, DRE.ethers.utils.parseUnits('5', 6), 2, 0, await user1.getAddress(), {
        gasLimit: 10000000,
      });

    await tx.wait();

    let AAAVEToken = await getMintableERC20(AAAVE);
    let ADAIToken = await getMintableERC20(ADAI);

    console.log('Current balances');
    console.log(
      'User 1 DAI: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6),
      ' AAAVE: ',
      DRE.ethers.utils.formatUnits(await AAAVEToken.balanceOf(await user1.getAddress()), 6),
      ' ADAI: ',
      DRE.ethers.utils.formatUnits(await ADAIToken.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 DAI: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6),
      ' AAAVE: ',
      DRE.ethers.utils.formatUnits(await AAAVEToken.balanceOf(await user2.getAddress()), 6),
      ' ADAI: ',
      DRE.ethers.utils.formatUnits(await ADAIToken.balanceOf(await user2.getAddress()), 6)
    );
    console.log('Pool DAI balance:  ', DRE.ethers.utils.formatUnits(await DAI.balanceOf(ADAI), 6));
    console.log(
      'Pool AAVE balance:  ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(AAAVE), 6)
    );

    console.log('');
    console.log('User 1 repays 5 AAVE');
    await AAVE.connect(user1).approve(lendingPool.address, DRE.ethers.utils.parseUnits('5', 6));
    await lendingPool
      .connect(user1)
      .repay(AAVE.address, DRE.ethers.utils.parseUnits('5', 6), 2, await user1.getAddress(), {
        gasLimit: 10000000,
      });
    console.log(
      'User 1 DAI: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2 DAI: ',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );

    console.log('');
    console.log('~~~~~~~~~~~  FLASHLOAN ~~~~~~~~~~~');
    console.log('');
    let reserveDataAAVE = await aaveProtocolDataProvider.getReserveData(AAVE.address);
    console.log(
      'User 1 takes a flashloan for all available AAVE in the pool(',
      DRE.ethers.utils.formatUnits(reserveDataAAVE.availableLiquidity, 6),
      ')'
    );
    await lendingPool
      .connect(user1)
      .flashLoan(
        mockFlashLoanReceiver.address,
        [AAVE.address],
        [reserveDataAAVE.availableLiquidity],
        [0],
        mockFlashLoanReceiver.address,
        '0x10',
        '0',
        {
          gasLimit: 10000000,
        }
      );
    reserveDataAAVE = await aaveProtocolDataProvider.getReserveData(AAVE.address);
    console.log(
      'Available liquidity after the flashloan: ',
      DRE.ethers.utils.formatUnits(reserveDataAAVE.availableLiquidity, 6)
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
      'User 1: DAI',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user1.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user1.getAddress()), 6)
    );
    console.log(
      'User 2: DAI',
      DRE.ethers.utils.formatUnits(await DAI.balanceOf(await user2.getAddress()), 6),
      ' AAVE: ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(await user2.getAddress()), 6)
    );
    console.log('Pool DAI balance:  ', DRE.ethers.utils.formatUnits(await DAI.balanceOf(ADAI), 6));
    console.log(
      'Pool AAVE balance:  ',
      DRE.ethers.utils.formatUnits(await AAVE.balanceOf(AAAVE), 6)
    );

    console.log('\nTest scenario finished with success!');
  });
