require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      forking: {
        // enabled: true,
        // url: "https://api.securerpc.com/v1",
        url: "https://arb1.arbitrum.io/rpc",
        // blockNumber: 98403400
      }
    }
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000
          }
        }
      }, 
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000
          }
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 2000000
  }
}