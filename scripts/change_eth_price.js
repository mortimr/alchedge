const { parseEther } = require('@ethersproject/units');
const {providers, Contract, ContractFactory} = require('ethers');
const { HegicEthOptionsAbi } = require('../testAbis/HegicEthOptions');
const { EACAggregatorProxyAbi } = require('../testAbis/EACAggregatorProxy');
const FakeProviderMockArtifact = require('../artifacts/contracts/mocks/AggregatorV3Mock.sol/AggregatorV3Mock.json');

const provider = new providers.JsonRpcProvider('http://localhost:8545');

const EthRich  = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const HegicEthOptionsAddress = '0xEfC0eEAdC1132A12c9487d800112693bf49EcfA2';

const main = async () => {

    const HegicETH = new Contract(HegicEthOptionsAddress, HegicEthOptionsAbi, provider);

    const priceProviderAddress = await HegicETH.priceProvider();

    const HegicETHPriceProvider = new Contract(priceProviderAddress, EACAggregatorProxyAbi, provider);

    const owner = await HegicETHPriceProvider.owner();
    const latestData = await HegicETHPriceProvider.latestRoundData();

    await provider.send('hardhat_impersonateAccount', [owner]);
    await provider.send('hardhat_impersonateAccount', [EthRich]);
    const ownerSigner = provider.getSigner(owner);
    const EthRichSigner = provider.getSigner(EthRich);

    await EthRichSigner.sendTransaction({
        to: owner,
        value: parseEther('1')
    });

    const FakePriceProviderFactory = new ContractFactory(FakeProviderMockArtifact.abi, FakeProviderMockArtifact.bytecode);
    const FakePriceProvider = await FakePriceProviderFactory.connect(EthRichSigner).deploy();

    await FakePriceProvider.setLatestRoundData(latestData.roundId, parseFloat(process.argv[2]) * 100000000, latestData.startedAt, latestData.updatedAt, latestData.answeredInRound);

    await HegicETHPriceProvider.connect(ownerSigner).proposeAggregator(FakePriceProvider.address);
    await HegicETHPriceProvider.connect(ownerSigner).confirmAggregator(FakePriceProvider.address);

};

main();