const hre = require('hardhat')
const { readFileSync } = require('node:fs')
const manifest = JSON.parse(readFileSync('deployments/robinhood-mainnet.json', 'utf8'))
async function verify(address, constructorArguments = []) {
  try { await hre.run('verify:verify', { address, constructorArguments }) }
  catch (error) {
    if (/already verified/i.test(error?.message || '')) console.log(`${address} is already verified.`)
    else throw error
  }
}
async function main() {
  await verify(manifest.contracts.joinSplitVerifier)
  await verify(manifest.contracts.shieldedPool, [manifest.contracts.joinSplitVerifier, manifest.contracts.poseidonT3, manifest.contracts.poseidonT6, 0])
  console.log('Verifier and ShieldedPool source verification completed.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })