const {providers, ethers} = require('ethers');

const provider = new providers.JsonRpcProvider('http://localhost:8545');

const main = async () => {

    const ownerSigner = provider.getSigner(process.argv[2]);

    const TBDETHv2 = new ethers.Contract(process.argv[3], [
        {
        "inputs": [],
        "name": "withdrawFees",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ], provider);

      const balanceBefore = await ownerSigner.getBalance();

      const tx = await TBDETHv2.connect(ownerSigner).withdrawFees();
      const finalTx = await tx.wait();

      const balanceAfter = await ownerSigner.getBalance();

    console.log(`collected fees`, balanceAfter.sub(balanceBefore).add(finalTx.gasUsed.mul(tx.gasPrice)).toString());

};

main();