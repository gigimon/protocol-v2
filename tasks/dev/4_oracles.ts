import { task } from 'hardhat/config';
import {
  deployPriceOracle,
  deployAaveOracle,
  deployLendingRateOracle,
} from '../../helpers/contracts-deployments';
import {
  setInitialAssetPricesInOracle,
  deployAllMockAggregators,
  setInitialMarketRatesInRatesOracleByHelper,
} from '../../helpers/oracles-helpers';
import { ICommonConfiguration, iAssetBase, TokenContractId } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import { getAllAggregatorsAddresses, getAllTokenAddresses } from '../../helpers/mock-helpers';
import { ConfigNames, loadPoolConfig, getQuoteCurrency } from '../../helpers/configuration';
import {
  getAllMockedTokens,
  getLendingPoolAddressesProvider,
  getPairsTokenAggregator,
} from '../../helpers/contracts-getters';

task('dev:deploy-oracles', 'Deploy oracles for dev environment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run('set-DRE');
    const poolConfig = loadPoolConfig(pool);
    const {
      Mocks: { AllAssetsInitialPrices },
      ProtocolGlobalParams: { UsdAddress, MockUsdPriceInWei },
      LendingRateOracleRatesCommon,
      OracleQuoteCurrency,
      OracleQuoteUnit,
    } = poolConfig as ICommonConfiguration;

    const defaultTokenList = {
      ...Object.fromEntries(Object.keys(TokenContractId).map((symbol) => [symbol, ''])),
      USD: UsdAddress,
    } as iAssetBase<string>;
    const mockTokens = await getAllMockedTokens();
    const mockTokensAddress = Object.keys(mockTokens).reduce<iAssetBase<string>>((prev, curr) => {
      prev[curr as keyof iAssetBase<string>] = mockTokens[curr].address;
      return prev;
    }, defaultTokenList);
    const addressesProvider = await getLendingPoolAddressesProvider();
    const admin = await addressesProvider.getPoolAdmin();

    const fallbackOracle = await deployPriceOracle(verify);
    await waitForTx(await fallbackOracle.setEthUsdPrice(MockUsdPriceInWei));

    await setInitialAssetPricesInOracle(AllAssetsInitialPrices, mockTokensAddress, fallbackOracle);

    const allTokenAddresses = getAllTokenAddresses(mockTokens);
    console.log('__________________________________');
    console.log(allTokenAddresses);
    console.log('__________________________________');

    const allAggregatorsAddresses = {
      DAI: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
      AAVE: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
      TUSD: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    };
    //   BAT: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   WETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   USDC: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   USDT: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   SUSD: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   ZRX: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   MKR: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   WBTC: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   LINK: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   KNC: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   MANA: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   REN: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   SNX: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   BUSD: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   USD: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   YFI: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UNI: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   ENJ: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniDAIWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniWBTCWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniAAVEWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniBATWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniDAIUSDC: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniCRVWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniLINKWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniMKRWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniRENWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniSNXWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniUNIWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniUSDCWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniWBTCUSDC: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   UniYFIWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   BptWBTCWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   BptBALWETH: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   WMATIC: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   STAKE: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   xSUSHI: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    //   WAVAX: '0x85E216ce09bF998DF2CB5A43eFE89DDe33523D94',
    // };

    const [tokens, aggregators] = getPairsTokenAggregator(
      allTokenAddresses,
      allAggregatorsAddresses,
      OracleQuoteCurrency
    );

    await deployAaveOracle(
      [
        tokens,
        aggregators,
        fallbackOracle.address,
        await getQuoteCurrency(poolConfig),
        OracleQuoteUnit,
      ],
      verify
    );
    await waitForTx(await addressesProvider.setPriceOracle(fallbackOracle.address));

    const lendingRateOracle = await deployLendingRateOracle(verify);
    await waitForTx(await addressesProvider.setLendingRateOracle(lendingRateOracle.address));

    const { USD, ...tokensAddressesWithoutUsd } = allTokenAddresses;
    const allReservesAddresses = {
      ...tokensAddressesWithoutUsd,
    };

    await setInitialMarketRatesInRatesOracleByHelper(
      LendingRateOracleRatesCommon,
      allReservesAddresses,
      lendingRateOracle,
      admin
    );
  });
