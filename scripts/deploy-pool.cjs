const hre = require('hardhat')
const { poseidonContract } = require('circomlibjs')
const { readFileSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { execFileSync } = require('node:child_process')

async function main() {
  execFileSync(process.execPath, ['scripts/release-check.mjs', '--predeploy'], { stdio: 'inherit' })
  const [deployer] = await hre.ethers.getSigners()
  const balance = await hre.ethers.provider.getBalance(deployer.address)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`)

  let verifierAddress = process.env.JOIN_SPLIT_VERIFIER
  if (verifierAddress) {
    if (!hre.ethers.isAddress(verifierAddress)) throw new Error('JOIN_SPLIT_VERIFIER is not a valid address.')
    if (await hre.ethers.provider.getCode(verifierAddress) === '0x') throw new Error('No verifier bytecode exists at JOIN_SPLIT_VERIFIER.')
  } else {
    const Verifier = await hre.ethers.getContractFactory('contracts/JoinSplitVerifier.production.sol:Groth16Verifier')
    const verifier = await Verifier.deploy()
    await verifier.waitForDeployment()
    verifierAddress = await verifier.getAddress()
    console.log(`Verifier: ${verifierAddress}`)
  }

  const Poseidon2 = new hre.ethers.ContractFactory(poseidonContract.generateABI(2), poseidonContract.createCode(2), deployer)
  const Poseidon5 = new hre.ethers.ContractFactory(poseidonContract.generateABI(5), poseidonContract.createCode(5), deployer)
  const treeHasher = await Poseidon2.deploy()
  await treeHasher.waitForDeployment()
  const noteHasher = await Poseidon5.deploy()
  await noteHasher.waitForDeployment()
  const Pool = await hre.ethers.getContractFactory('ShieldedPool')
  const pool = await Pool.deploy(verifierAddress, await treeHasher.getAddress(), await noteHasher.getAddress(), 0)
  await pool.waitForDeployment()
  const receipt = await pool.deploymentTransaction().wait()

  const addresses = {
    poseidonT3: await treeHasher.getAddress(),
    poseidonT6: await noteHasher.getAddress(),
    joinSplitVerifier: verifierAddress,
    shieldedPool: await pool.getAddress(),
  }
  const runtimeCodeHashes = {}
  for (const [name, address] of Object.entries(addresses)) runtimeCodeHashes[name] = hre.ethers.keccak256(await hre.ethers.provider.getCode(address))
  const manifestPath = resolve('deployments/robinhood-mainnet.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.deploymentBlock = receipt.blockNumber
  manifest.contracts = addresses
  manifest.runtimeCodeHashes = runtimeCodeHashes
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`
  writeFileSync(manifestPath, rendered)
  writeFileSync(resolve('public/deployments/robinhood-mainnet.json'), rendered)
  console.log(JSON.stringify(manifest, null, 2))
  console.log('Run npm run release:check, verify sources on Blockscout, then build the public client.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })