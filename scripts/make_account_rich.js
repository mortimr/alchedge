const { parseEther } = require('@ethersproject/units');
const {providers, Contract} = require('ethers');
const { ERC20Abi } = require('../testAbis/ERC20');

const provider = new providers.JsonRpcProvider('http://localhost:8545');

const DaiRich = '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503';
const EthRich  = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

const DaiContract = '0x6b175474e89094c44da98b954eedeac495271d0f';

const main = async () => {
    await provider.send('hardhat_impersonateAccount', [DaiRich]);
    await provider.send('hardhat_impersonateAccount', [EthRich]);
    const DaiRichSigner = provider.getSigner(DaiRich);
    const EthRichSigner = provider.getSigner(EthRich);

    await EthRichSigner.sendTransaction({
        to: DaiRich,
        value: parseEther('1')
    });

    await EthRichSigner.sendTransaction({
        to: process.argv[2],
        value: parseEther('100')
    });

    const Dai = new Contract(DaiContract, ERC20Abi, provider);

    await Dai.connect(DaiRichSigner).transfer(process.argv[2], parseEther('1000000'));

    console.log(await provider.getNetwork());

};

main();