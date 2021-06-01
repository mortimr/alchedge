import '@nomiclabs/hardhat-waffle';
import 'hardhat-contract-sizer';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-tracer';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-prettier';
import 'hardhat-docgen';
import 'hardhat-deploy';

import { HardhatUserConfig } from 'hardhat/config';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ]
  },
  networks: {
    ...(process.env.MAINNET === 'true' ?
      {

        mainnet: {
          url: process.env.MAINNET_ETHEREUM_RPC_URL,
          chainId: 1,
          from: process.env.DEPLOYER_ACCOUNT,
          gas: 'auto',
          gasPrice: 'auto',
          accounts: {
            mnemonic: process.env.DEPLOYER_ACCOUNT_MNEMONIC,
          },
          live: true,
          saveDeployments: true,
          tags: [],
          timeout: 60 * 60 * 1000 // 1 hour
        }

      }
      :
      {
      }
    ),

    ...(process.env.FORK === 'true' ?
      {
        hardhat: {
          chainId: 1337,
          forking: {
            url: process.env.FORK_ETHEREUM_RPC_URL,
            blockNumber: 12522190
          },
          accounts: {
            mnemonic: process.env.DEPLOYER_ACCOUNT_MNEMONIC,
          },
        },
      }
      :
      {}
    ),

    ...(process.env.KOVAN === 'true' ?
      {

        kovan: {
          url: process.env.KOVAN_ETHEREUM_RPC_URL,
          chainId: 42,
          from: process.env.DEPLOYER_ACCOUNT,
          gas: 'auto',
          gasPrice: 'auto',
          accounts: {
            mnemonic: process.env.DEPLOYER_ACCOUNT_MNEMONIC,
          },
          live: true,
          saveDeployments: true,
          tags: [],
          timeout: 60 * 60 * 1000 // 1 hour
        }

      }
      :
      {
      }
    )
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
  namedAccounts: {
    deployer: process.env.DEPLOYER_ACCOUNT
  }
} as HardhatUserConfig;
