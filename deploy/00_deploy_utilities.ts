export const tag = '0';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const hegicEthOptionsMainnetAddress = '0xEfC0eEAdC1132A12c9487d800112693bf49EcfA2';
const hegicBtcOptionsMainnetAddress = '0x3961245DB602eD7c03eECcda33eA3846bD8723BD';
const alUSDMetaPoolAddress = '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c';
const alUSDAddress = '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9';
const DaiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const WbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const uniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('TBDETH', {
    from: deployer,
    args: [hegicEthOptionsMainnetAddress, alUSDAddress, DaiAddress, WethAddress, alUSDMetaPoolAddress, uniswapV2Router02Address],
    log: true,
    gasLimit: 2000000,
    gasPrice: process.env.GAS_PRICE
  });

  await deploy('TBDBTC', {
    from: deployer,
    args: [hegicBtcOptionsMainnetAddress, alUSDAddress, DaiAddress, WethAddress, WbtcAddress, alUSDMetaPoolAddress, uniswapV2Router02Address],
    log: true,
    gasLimit: 2000000,
    gasPrice: process.env.GAS_PRICE
  });

};

export default deploy;