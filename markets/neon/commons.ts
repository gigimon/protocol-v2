import {
  oneRay,
  ZERO_ADDRESS,
  MOCK_CHAINLINK_AGGREGATORS_PRICES,
  oneEther,
} from '../../helpers/constants';
import { ICommonConfiguration, eNeonNetwork } from '../../helpers/types';

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const CommonsConfig: ICommonConfiguration = {
  MarketId: 'Commons',
  ATokenNamePrefix: 'Aave interest bearing',
  StableDebtTokenNamePrefix: 'Aave stable debt bearing',
  VariableDebtTokenNamePrefix: 'Aave variable debt bearing',
  SymbolPrefix: '',
  ProviderId: 0, // Overriden in index.ts
  OracleQuoteCurrency: 'ETH',
  OracleQuoteUnit: oneEther.toString(),
  ProtocolGlobalParams: {
    TokenDistributorPercentageBase: '10000',
    MockUsdPriceInWei: '5848466240000000',
    UsdAddress: '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96',
    NilAddress: '0x0000000000000000000000000000000000000000',
    OneAddress: '0x0000000000000000000000000000000000000001',
    AaveReferral: '0',
  },

  // ----------------
  // COMMON PROTOCOL PARAMS ACROSS POOLS AND NETWORKS
  // ----------------

  Mocks: {
    AllAssetsInitialPrices: {
      ...MOCK_CHAINLINK_AGGREGATORS_PRICES,
    },
  },
  // TODO: reorg alphabetically, checking the reason of tests failing
  LendingRateOracleRatesCommon: {
    USDC: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDT: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
  },
  // ----------------
  // COMMON PROTOCOL ADDRESSES ACROSS POOLS
  // ----------------

  // If PoolAdmin/emergencyAdmin is set, will take priority over PoolAdminIndex/emergencyAdminIndex
  PoolAdmin: {
    [eNeonNetwork.neonlabs]: undefined,
  },
  PoolAdminIndex: 0,
  EmergencyAdmin: {
    [eNeonNetwork.neonlabs]: undefined,
  },
  EmergencyAdminIndex: 1,
  ProviderRegistry: {
    [eNeonNetwork.neonlabs]: '0x52D306e36E3B6B02c153d0266ff0f85d18BCD413',
  },
  ProviderRegistryOwner: {
    [eNeonNetwork.neonlabs]: '0xB9062896ec3A615a4e4444DF183F0531a77218AE',
  },
  LendingRateOracle: {
    [eNeonNetwork.neonlabs]: '', //'0x8A32f49FFbA88aba6EFF96F45D8BD1D4b3f35c7D',
  },
  LendingPoolCollateralManager: {
    [eNeonNetwork.neonlabs]: '0xbd4765210d4167CE2A5b87280D9E8Ee316D5EC7C',
  },
  LendingPoolConfigurator: {
    [eNeonNetwork.neonlabs]: '',
  },
  LendingPool: {
    [eNeonNetwork.neonlabs]: '',
  },
  WethGateway: {
    [eNeonNetwork.neonlabs]: '',
  },
  TokenDistributor: {
    [eNeonNetwork.neonlabs]: '0xe3d9988f676457123c5fd01297605efdd0cba1ae',
  },
  AaveOracle: {
    [eNeonNetwork.neonlabs]: '', //'0xA50ba011c48153De246E5192C8f9258A2ba79Ca9',
  },
  FallbackOracle: {
    [eNeonNetwork.neonlabs]: ZERO_ADDRESS,
  },
  ChainlinkAggregator: {
    [eNeonNetwork.neonlabs]: {
      USDC: '0x986b5E1e1755e3C2440e960477f25201B0a8bbD4',
      USDT: '0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46',
    },
  },
  ReserveAssets: {
    [eNeonNetwork.neonlabs]: {},
  },
  ReservesConfig: {},
  ATokenDomainSeparator: {
    [eNeonNetwork.neonlabs]: '',
  },
  WETH: {
    [eNeonNetwork.neonlabs]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  WrappedNativeToken: {
    [eNeonNetwork.neonlabs]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  ReserveFactorTreasuryAddress: {
    [eNeonNetwork.neonlabs]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
  },
  IncentivesController: {
    [eNeonNetwork.neonlabs]: ZERO_ADDRESS,
  },
};
