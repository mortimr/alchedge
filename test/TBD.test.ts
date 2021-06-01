import * as chai from 'chai'
import { ethers, artifacts } from 'hardhat';
import { Signer, BigNumber, Contract } from 'ethers';
import { EACAggregatorProxyAbi } from '../testAbis/EACAggregatorProxy';
import { AlchemistAbi } from '../testAbis/Alchemist';
import { ERC20Abi } from '../testAbis/ERC20';
import { AlTokenAbi } from '../testAbis/alToken';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;


interface Context {
  signers: Signer[]
  mocks: {
    AggregatorV3Mock: Contract;
  }
  dependencies: {
    HegicETHOptions: Contract;
    HegicBTCOptions: Contract;
    EACETHAggregatorProxy: Contract;
    EACBTCAggregatorProxy: Contract;
    Alchemist: Contract;
    Dai: Contract;
    alUSD: Contract;
      Wbtc: Contract;
  }
  mockFactories: {
  }
  contracts: {
    TBDETH: Contract;
    TBDBTC: Contract;
  }
  impersonatedAccounts: { [key: string]: Signer }
}

const hegicEthOptionsMainnetAddress = '0xEfC0eEAdC1132A12c9487d800112693bf49EcfA2';
const hegicBtcOptionsMainnetAddress = '0x3961245DB602eD7c03eECcda33eA3846bD8723BD';
const alUSDMetaPoolAddress = '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c';
const alUSDAddress = '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9';
const DaiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const WbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const uniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';


const accountsToImpersonate = {
  RandomOnChainDaiBillionaire: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
  AlchemistMultiSig: '0x8392F6669292fA56123F71949B52d883aE57e225'
}

describe('HegicAlUSD', function () {

  const ctx: Context = {
    signers: null,
    mocks: {
      AggregatorV3Mock: null
    },
    dependencies: {
      HegicETHOptions: null,
      HegicBTCOptions: null,
      EACETHAggregatorProxy: null,
      EACBTCAggregatorProxy: null,
      Alchemist: null,
      Dai: null,
      alUSD: null,
      Wbtc: null
    },
    mockFactories: {
    },
    contracts: {
      TBDETH: null,
      TBDBTC: null
    },
    impersonatedAccounts: {
    }
  }

  let snapshotId;

  before(async function () {

    const HegicEthOptionsArtifact = await artifacts.readArtifact("IHegicETHOptions");
    const HegicETHOptions = new ethers.Contract(hegicEthOptionsMainnetAddress, HegicEthOptionsArtifact.abi, ethers.provider);

    const EACETHAggregatorAddress = await HegicETHOptions.priceProvider();
    const EACETHAggregatorProxyInstance = new ethers.Contract(EACETHAggregatorAddress, EACAggregatorProxyAbi, ethers.provider);

    const HegicBtcOptionsArtifact = await artifacts.readArtifact("IHegicBTCOptions");
    const HegicBTCOptions = new ethers.Contract(hegicBtcOptionsMainnetAddress, HegicBtcOptionsArtifact.abi, ethers.provider);

    const EACBTCAggregatorAddress = await HegicBTCOptions.priceProvider();
    const EACBTCAggregatorProxyInstance = new ethers.Contract(EACBTCAggregatorAddress, EACAggregatorProxyAbi, ethers.provider);

    accountsToImpersonate['EACETHAggregatorProxyOwner'] = await EACETHAggregatorProxyInstance.owner();
    accountsToImpersonate['EACBTCAggregatorProxyOwner'] = await EACBTCAggregatorProxyInstance.owner();

    for (const accountName of Object.keys(accountsToImpersonate)) {
      console.log(`impersonating ${accountName}:${accountsToImpersonate[accountName]} ...`)
      await ethers.provider.send("hardhat_impersonateAccount", [accountsToImpersonate[accountName]]);
      console.log(`impersonated  ${accountName}:${accountsToImpersonate[accountName]} ...`)
    }

    snapshotId = await ethers.provider.send('evm_snapshot', []);

  });

  beforeEach(async function () {

    await ethers.provider.send('evm_revert', [snapshotId]);
    snapshotId = await ethers.provider.send('evm_snapshot', []);

    ctx.signers = await ethers.getSigners();

    for (const accountName of Object.keys(accountsToImpersonate)) {
      ctx.impersonatedAccounts[accountName] = await ethers.provider.getSigner(accountsToImpersonate[accountName]);
    }

    // HegicEthOptions
    const HegicEthOptionsArtifact = await artifacts.readArtifact("IHegicETHOptions");
    ctx.dependencies.HegicETHOptions = new ethers.Contract(hegicEthOptionsMainnetAddress, HegicEthOptionsArtifact.abi, ethers.provider);
    const EACETHAggregatorAddress = await ctx.dependencies.HegicETHOptions.priceProvider();

    const HegicBtcOptionsArtifact = await artifacts.readArtifact("IHegicBTCOptions");
    ctx.dependencies.HegicBTCOptions = new ethers.Contract(hegicBtcOptionsMainnetAddress, HegicBtcOptionsArtifact.abi, ethers.provider);
    const EACBTCAggregatorAddress = await ctx.dependencies.HegicBTCOptions.priceProvider();

    // Price Aggregator Proxy
    ctx.dependencies.EACETHAggregatorProxy = new ethers.Contract(EACETHAggregatorAddress, EACAggregatorProxyAbi, ethers.provider);
    ctx.dependencies.EACBTCAggregatorProxy = new ethers.Contract(EACBTCAggregatorAddress, EACAggregatorProxyAbi, ethers.provider);

    // Alchemix Alchemist
    ctx.dependencies.Alchemist = new ethers.Contract('0xc21d353ff4ee73c572425697f4f5aad2109fe35b', AlchemistAbi, ethers.provider);

    // Dai
    ctx.dependencies.Dai = new ethers.Contract(DaiAddress, ERC20Abi, ethers.provider);

    // alUSD
    ctx.dependencies.alUSD = new ethers.Contract(alUSDAddress, AlTokenAbi, ethers.provider);

    // Wbtc
    ctx.dependencies.Wbtc = new ethers.Contract(WbtcAddress, ERC20Abi, ethers.provider);

    // Price Aggregator Mock
    ctx.mocks.AggregatorV3Mock = await (await ethers.getContractFactory('AggregatorV3Mock')).deploy();

    // Eth Option buyer utility
    ctx.contracts.TBDETH = await (await ethers.getContractFactory('TBDETH')).deploy(
      hegicEthOptionsMainnetAddress,
      alUSDAddress,
      DaiAddress,
      WethAddress,
      alUSDMetaPoolAddress,
      uniswapV2Router02Address
    );

    // Eth Option buyer utility
    ctx.contracts.TBDBTC = await (await ethers.getContractFactory('TBDBTC')).deploy(
      hegicBtcOptionsMainnetAddress,
      alUSDAddress,
      DaiAddress,
      WethAddress,
      WbtcAddress,
      alUSDMetaPoolAddress,
      uniswapV2Router02Address
    );

  });

  const ETH_DECIMALS = BigNumber.from('1000000000000000000');
  const PRICE_DECIMALS = BigNumber.from('100000000');
  const DAY = 60 * 60 * 24;

  const changeETHPriceAggregator = async (newAggregatorAddress: string): Promise<void> => {

    await ctx.signers[0].sendTransaction({
      to: await ctx.impersonatedAccounts.EACETHAggregatorProxyOwner.getAddress(),
      value: BigNumber.from('1000000000000000000').toHexString()
    });

    await ctx.dependencies.EACETHAggregatorProxy.connect(ctx.impersonatedAccounts.EACETHAggregatorProxyOwner).proposeAggregator(newAggregatorAddress);
    await ctx.dependencies.EACETHAggregatorProxy.connect(ctx.impersonatedAccounts.EACETHAggregatorProxyOwner).confirmAggregator(newAggregatorAddress);

  }

  const changeBTCPriceAggregator = async (newAggregatorAddress: string): Promise<void> => {

    await ctx.signers[0].sendTransaction({
      to: await ctx.impersonatedAccounts.EACBTCAggregatorProxyOwner.getAddress(),
      value: BigNumber.from('1000000000000000000').toHexString()
    });

    await ctx.dependencies.EACBTCAggregatorProxy.connect(ctx.impersonatedAccounts.EACBTCAggregatorProxyOwner).proposeAggregator(newAggregatorAddress);
    await ctx.dependencies.EACBTCAggregatorProxy.connect(ctx.impersonatedAccounts.EACBTCAggregatorProxyOwner).confirmAggregator(newAggregatorAddress);

  }

  const increaseAlchemistCeiling = async (extraCeiling: BigNumber): Promise<void> => {

    await ctx.signers[0].sendTransaction({
      to: await ctx.impersonatedAccounts.AlchemistMultiSig.getAddress(),
      value: ethers.BigNumber.from('1000000000000000000').toHexString()
    });

    const currentCeiling = await ctx.dependencies.alUSD.ceiling(ctx.dependencies.Alchemist.address);

    await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.AlchemistMultiSig).setCeiling(ctx.dependencies.Alchemist.address, currentCeiling.add(extraCeiling));
  }

  const parsePurchaseLog = (log: any): any => {
    let abi = ["event PurchaseOption (address indexed owner,uint256 optionID,uint256 purchasePrice,address purchaseToken,uint256 fees)"];
    let iface = new ethers.utils.Interface(abi);
    return iface.parseLog(log);
  }

  describe('testing eth options scenarios', function () {

    it('purchase 50k Dai of eth 2300 1 week otm put @ 2487.32', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACETHAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeETHPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDETH.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDETH.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDETH.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('230000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        1,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDETH.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicETHOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('170000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ethers.provider.getBalance(userAddress)

      await ctx.dependencies.HegicETHOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ethers.provider.getBalance(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('70652561549095706671');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wethGoingToBePaid).toString()).to.equal('-1');

    }).timeout(60000);

    it('purchase 50k Dai of eth 2500 1 week itm put @ 2487.32', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACETHAggregatorProxy.latestRoundData();

      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeETHPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDETH.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDETH.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDETH.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('250000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        1,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDETH.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicETHOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('180000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ethers.provider.getBalance(userAddress)

      await ctx.dependencies.HegicETHOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ethers.provider.getBalance(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('67539944468486811996');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wethGoingToBePaid).toString()).to.equal('-2');

    }).timeout(60000);

    it('purchase 50k Dai of eth 3600 1 week otm call @ 2487.32', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACETHAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeETHPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDETH.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDETH.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDETH.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('360000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        2,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDETH.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicETHOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('420000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ethers.provider.getBalance(userAddress)

      await ctx.dependencies.HegicETHOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ethers.provider.getBalance(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('27009998599674874051');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wethGoingToBePaid).toString()).to.equal('-1');

    }).timeout(60000);

    it('purchase 50k Dai of eth 3300 1 week itm call @ 2487.32', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACETHAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeETHPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDETH.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDETH.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDETH.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('330000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        2,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDETH.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicETHOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('420000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ethers.provider.getBalance(userAddress)

      await ctx.dependencies.HegicETHOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ethers.provider.getBalance(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('45584914340063155846');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wethGoingToBePaid).toString()).to.equal('-1');

    }).timeout(60000);

    it('should fail for insufficient approval', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACETHAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeETHPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDETH.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDETH.address, alchemixDepositAmount.div(4))
      await expect(ctx.contracts.TBDETH.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('360000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        2,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      )).to.eventually.be.rejectedWith('revert ERC20: transfer amount exceeds allowance');

    }).timeout(60000);

  });

  describe('testing btc options scenarios', function () {

    it('purchase 50k Dai of btc 39000 1 week otm put @ 35869.7', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACBTCAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeBTCPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDBTC.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));
      const wbtcGoingToBePaid = await ctx.contracts.TBDBTC.getUnderlyingFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDBTC.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDBTC.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('3900000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        1,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDBTC.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicBTCOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('3000000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      await ctx.dependencies.HegicBTCOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('127587842');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wbtcGoingToBePaid).toString()).to.equal('-1');

    }).timeout(60000);

    it('purchase 50k Dai of btc 44000 1 week otm put @ 35869.7', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACBTCAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeBTCPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDBTC.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));
      const wbtcGoingToBePaid = await ctx.contracts.TBDBTC.getUnderlyingFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDBTC.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDBTC.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('4400000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        1,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDBTC.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicBTCOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('3000000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      await ctx.dependencies.HegicBTCOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('74797009');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wbtcGoingToBePaid).toString()).to.equal('-2');

    }).timeout(60000);

    it('purchase 50k Dai of btc 48000 1 week otm call @ 35869.7', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACBTCAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeBTCPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDBTC.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));
      const wbtcGoingToBePaid = await ctx.contracts.TBDBTC.getUnderlyingFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDBTC.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDBTC.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('4800000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        2,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDBTC.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicBTCOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('5500000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      await ctx.dependencies.HegicBTCOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('210267000');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wbtcGoingToBePaid).toString()).to.equal('-1');

    }).timeout(60000);

    it('purchase 50k Dai of btc 42000 1 week itm call @ 35869.7', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACBTCAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeBTCPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDBTC.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));
      const wbtcGoingToBePaid = await ctx.contracts.TBDBTC.getUnderlyingFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDBTC.address, alchemixDepositAmount.div(2))
      const createTx = await ctx.contracts.TBDBTC.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('4200000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        2,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      );

      const optionCreation = parsePurchaseLog((await ethers.provider.getLogs({
        ...ctx.contracts.TBDBTC.filters.PurchaseOption(userAddress),
        fromBlock: createTx.blockNumber,
        toBlock: createTx.blockNumber
      }))[0])

      const optionDetails = await ctx.dependencies.HegicBTCOptions.options(optionCreation.args.optionID);

      // change eth price in mocked aggregator
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, BigNumber.from('5500000000000'), currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const balance = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      await ctx.dependencies.HegicBTCOptions.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).exercise(optionCreation.args.optionID);
      const balanceAfter = await ctx.dependencies.Wbtc.balanceOf(userAddress);

      expect(balanceAfter.sub(balance).sub(optionDetails.premium.add(optionDetails.amount.div(100))).toString()).to.equal('442901429');
      expect(optionDetails.premium.add(optionDetails.amount.div(100)).sub(wbtcGoingToBePaid).toString()).to.equal('-1');

    }).timeout(60000);

    it('should fail for insufficient approval', async function () {

      // recover current data from oracle
      const currentData = await ctx.dependencies.EACBTCAggregatorProxy.latestRoundData();
      // set current data in mock contract
      await ctx.mocks.AggregatorV3Mock.setLatestRoundData(currentData.roundId, currentData.answer, currentData.startedAt, currentData.updatedAt, currentData.answeredInRound);

      const userAddress = await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress();

      // give eth to impersonated account
      await ctx.signers[0].sendTransaction({
        to: userAddress,
        value: ethers.BigNumber.from('1000000000000000000').toHexString()
      });

      // will make a 100000 deposit on alchemix, to purchase a 50k premium put option
      const alchemixDepositAmount = ethers.BigNumber.from('100000').mul(ETH_DECIMALS);

      // change oracle to use mock
      await changeBTCPriceAggregator(ctx.mocks.AggregatorV3Mock.address);
      // change alchemist ceiling
      await increaseAlchemistCeiling(alchemixDepositAmount);

      // deposit and retrieve 50k alUSD
      await ctx.dependencies.Dai.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.dependencies.Alchemist.address, alchemixDepositAmount)
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).deposit(alchemixDepositAmount);
      await ctx.dependencies.Alchemist.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).mint(alchemixDepositAmount.div(2));

      // estimate eth amount retrieve from swaps
      const wethGoingToBePaid = await ctx.contracts.TBDETH.getEthFeeFromAlUSD(alchemixDepositAmount.div(2));

      // approve and trigger option purchase
      await ctx.dependencies.alUSD.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).approve(ctx.contracts.TBDETH.address, alchemixDepositAmount.div(4))
      await expect(ctx.contracts.TBDBTC.connect(ctx.impersonatedAccounts.RandomOnChainDaiBillionaire).purchaseOptionWithAlUSD(
        alchemixDepositAmount.div(2),
        BigNumber.from('4000000000000'),
        604800,
        await ctx.impersonatedAccounts.RandomOnChainDaiBillionaire.getAddress(),
        2,
        wethGoingToBePaid.mul(995).div(1000) // 0.5% slippage allowed
      )).to.eventually.be.rejectedWith('revert ERC20: transfer amount exceeds allowance');

    }).timeout(60000);

  });

});