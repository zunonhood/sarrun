require('@nomicfoundation/hardhat-toolbox')
module.exports = {
  solidity: { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 500 }, viaIR: true } },
  paths: { sources: './contracts', tests: './test/contracts', cache: './cache', artifacts: './artifacts' },
  networks: { robinhood: { url: process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com', chainId: 4663, accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [] } },
  etherscan: { apiKey: { robinhood: 'empty' }, customChains: [{ network: 'robinhood', chainId: 4663, urls: { apiURL: 'https://robinhoodchain.blockscout.com/api', browserURL: 'https://robinhoodchain.blockscout.com/' } }] },
}