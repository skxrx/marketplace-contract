import * as dotenv from 'dotenv'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

import './tasks/createItem'

dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.14',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },

  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_KEY as string,
        enabled: true,
      },
    },
    rinkeby: {
      url: `${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHS_API_KEY,
  },
}

export default config
