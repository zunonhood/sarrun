import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { ethers } from 'ethers'
const predeploy = process.argv.includes('--predeploy')
const manifest = JSON.parse(await fs.readFile(new URL('../deployments/robinhood-mainnet.json', import.meta.url), 'utf8'))
const failures = []
const addressKeys = ['poseidonT3', 'poseidonT6', 'joinSplitVerifier', 'shieldedPool']
const artifactKeys = ['joinSplitWasm', 'joinSplitZkey', 'verificationKey']
for (const key of artifactKeys) {
  if (!manifest.artifacts?.[key]) failures.push(`Missing artifact URL: ${key}`)
  if (!/^[0-9a-f]{64}$/i.test(manifest.artifactHashes?.[key] || '')) failures.push(`Missing artifact SHA-256: ${key}`)
  if (manifest.artifacts?.[key]?.startsWith('/')) {
    try {
      const bytes = await fs.readFile(path.resolve('public', manifest.artifacts[key].slice(1)))
      const actual = crypto.createHash('sha256').update(bytes).digest('hex')
      if (actual !== manifest.artifactHashes[key]) failures.push(`Published artifact hash mismatch: ${key}`)
    } catch { failures.push(`Published artifact file is missing: ${key}`) }
  }
}
if (!manifest.ceremony?.transcriptUrl || !manifest.ceremony?.finalZkeySha256) failures.push('Missing public ceremony transcript metadata.')
else if (manifest.ceremony.finalZkeySha256 !== manifest.artifactHashes?.joinSplitZkey) failures.push('Ceremony final ZKey hash mismatch.')
if (!Array.isArray(manifest.audits) || !manifest.audits.some(audit => audit.reportUrl)) failures.push('Missing independent audit report.')
if (!/^[0-9a-f]{7,64}$/i.test(manifest.release?.sourceCommit || '')) failures.push('Missing reviewed source commit.')
try { await fs.access(new URL('../contracts/JoinSplitVerifier.production.sol', import.meta.url)) } catch { failures.push('Missing production verifier source.') }
if (!predeploy) {
  if (manifest.deploymentBlock == null) failures.push('Missing deployment block.')
  for (const key of addressKeys) if (!ethers.isAddress(manifest.contracts?.[key] || '')) failures.push(`Missing deployed contract: ${key}`)
  if (!failures.length) {
    const provider = new ethers.JsonRpcProvider(manifest.rpcUrl, Number(manifest.chainId))
    const network = await provider.getNetwork()
    if (Number(network.chainId) !== Number(manifest.chainId)) failures.push('RPC chain ID mismatch.')
    for (const key of addressKeys) { const code = await provider.getCode(manifest.contracts[key]); if (code === '0x') failures.push(`No bytecode at ${key}.`); else if (ethers.keccak256(code) !== manifest.runtimeCodeHashes?.[key]) failures.push(`Runtime bytecode hash mismatch: ${key}.`) }
    const pool = new ethers.Contract(manifest.contracts.shieldedPool, ['function verifier() view returns(address)','function hasher() view returns(address)','function noteHasher() view returns(address)','function currentRoot() view returns(uint256)'], provider)
    if ((await pool.verifier()).toLowerCase() !== manifest.contracts.joinSplitVerifier.toLowerCase()) failures.push('Pool verifier linkage mismatch.')
    if ((await pool.hasher()).toLowerCase() !== manifest.contracts.poseidonT3.toLowerCase()) failures.push('Pool tree hasher linkage mismatch.')
    if ((await pool.noteHasher()).toLowerCase() !== manifest.contracts.poseidonT6.toLowerCase()) failures.push('Pool note hasher linkage mismatch.')
  }
}
if (failures.length) { console.error(`Release gate failed:\n- ${failures.join('\n- ')}`); process.exit(1) }
console.log(predeploy ? 'Pre-deployment release gate passed.' : 'Production release gate passed.')