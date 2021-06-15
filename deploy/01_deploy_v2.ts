import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const hegicEthOptionsMainnetAddress = '0xEfC0eEAdC1132A12c9487d800112693bf49EcfA2';
const hegicBtcOptionsMainnetAddress = '0x3961245DB602eD7c03eECcda33eA3846bD8723BD';
const alUSDMetaPoolAddress = '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c';
const alUSDAddress = '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9';
const DaiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const WbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const uniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const initialFee = 997000;

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  let owner;

  if (hre.network.live) {
    owner = '0xcA529c0F2ca0E4418B2eA322D78e7db0f7681D48';
  } else {
    owner = deployer;
  }

  console.log(owner);

  const TBDETHv2Receipt = await deploy('TBDETHv2', {
    from: deployer,
    args: [hegicEthOptionsMainnetAddress, alUSDAddress, DaiAddress, WethAddress, alUSDMetaPoolAddress, uniswapV2Router02Address, owner, initialFee],
    log: true,
    gasLimit: 2300000,
    gasPrice: process.env.GAS_PRICE,
    skipIfAlreadyDeployed: true
  });

  if (process.env.ETHERSCAN_API_KEY) {
    try {
      await hre.run("verify:verify", {
        address: TBDETHv2Receipt.address,
        constructorArguments: [
          hegicEthOptionsMainnetAddress, alUSDAddress, DaiAddress, WethAddress, alUSDMetaPoolAddress, uniswapV2Router02Address, owner, initialFee
        ],
      })
    } catch (e) {
      if (e.message !== 'Contract source code already verified') {
        throw e;
      } else {
        console.log('Contract already verified')
      }
    }
  }

  const TBDBTCv2Receipt = await deploy('TBDBTCv2', {
    from: deployer,
    args: [hegicBtcOptionsMainnetAddress, alUSDAddress, DaiAddress, WethAddress, WbtcAddress, alUSDMetaPoolAddress, uniswapV2Router02Address, owner, initialFee],
    log: true,
    gasLimit: 2300000,
    gasPrice: process.env.GAS_PRICE,
    skipIfAlreadyDeployed: true
  });

  if (process.env.ETHERSCAN_API_KEY) {
    try {
      await hre.run("verify:verify", {
        address: TBDBTCv2Receipt.address,
        constructorArguments: [
          hegicBtcOptionsMainnetAddress, alUSDAddress, DaiAddress, WethAddress, WbtcAddress, alUSDMetaPoolAddress, uniswapV2Router02Address, owner, initialFee
        ],
      })
    } catch (e) {
      if (e.message !== 'Contract source code already verified') {
        throw e;
      } else {
        console.log('Contract already verified')
      }
    }
  }

};

module.exports = deploy;
module.exports.tags = ['TBDv2']
