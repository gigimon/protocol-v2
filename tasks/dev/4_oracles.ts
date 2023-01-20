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
    console.log('RUN DEPLOY CONTRACTS');
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
    console.log('GET MOCKED TOKENS');
    const mockTokens = await getAllMockedTokens();
    const mockTokensAddress = Object.keys(mockTokens).reduce<iAssetBase<string>>((prev, curr) => {
      prev[curr as keyof iAssetBase<string>] = mockTokens[curr].address;
      return prev;
    }, defaultTokenList);
    const addressesProvider = await getLendingPoolAddressesProvider();
    const admin = await addressesProvider.getPoolAdmin();
    console.log('DEPLOY PRICE ORACLE');
    const fallbackOracle = await deployPriceOracle(verify);
    console.log('Set USD PRICE', MockUsdPriceInWei);
    await waitForTx(await fallbackOracle.setEthUsdPrice(MockUsdPriceInWei));
    await setInitialAssetPricesInOracle(AllAssetsInitialPrices, mockTokensAddress, fallbackOracle);

    const mockAggregators = await deployAllMockAggregators(AllAssetsInitialPrices, verify);

    const allTokenAddresses = getAllTokenAddresses(mockTokens);
    const allAggregatorsAddresses = getAllAggregatorsAddresses(mockAggregators);

    const [tokens, aggregators] = getPairsTokenAggregator(
      allTokenAddresses,
      allAggregatorsAddresses,
      OracleQuoteCurrency
    );
    console.log('DEPLOY AAVE ORACLE');
    console.log('Tokens', tokens);
    console.log('Aggregators', aggregators);
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
    console.log('DEPLOY SET PRICE ORACLE');
    await waitForTx(await addressesProvider.setPriceOracle(fallbackOracle.address));

    const lendingRateOracle = await deployLendingRateOracle(verify);
    await waitForTx(await addressesProvider.setLendingRateOracle(lendingRateOracle.address));

    const { USD, ...tokensAddressesWithoutUsd } = allTokenAddresses;
    const allReservesAddresses = {
      ...tokensAddressesWithoutUsd,
    };
    console.log('SET INITIAL MARKET RATES IN RATES ORACLE BY HELPER');
    await setInitialMarketRatesInRatesOracleByHelper(
      LendingRateOracleRatesCommon,
      allReservesAddresses,
      lendingRateOracle,
      admin
    );
  });
