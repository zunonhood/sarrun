import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import * as snarkjs from 'snarkjs'

const required = ['SARRUN_FINAL_ZKEY', 'SARRUN_FINAL_PTAU', 'SARRUN_CEREMONY_URL', 'SARRUN_AUDIT_URL', 'SARRUN_SOURCE_COMMIT']
for (const name of required) if (!process.env[name]) throw new Error(`Set ${name} before preparing a production release.`)
const zkey = path.resolve(process.env.SARRUN_FINAL_ZKEY)
const ptau = path.resolve(process.env.SARRUN_FINAL_PTAU)
if (/local/i.test(zkey) || /local/i.test(ptau)) throw new Error('Local test artifacts cannot be published as production artifacts.')
const r1cs = path.resolve('circuits/build/JoinSplit.r1cs')
if (!await snarkjs.zKey.verifyFromR1cs(r1cs, ptau, zkey)) throw new Error('The final ZKey does not verify against the reviewed R1CS and PTAU transcript.')
const out = path.resolve('public/proving')
await fs.mkdir(out, { recursive: true })
const wasmOut = path.join(out, 'JoinSplit.wasm')
const zkeyOut = path.join(out, 'JoinSplit.production.zkey')
const vkeyOut = path.join(out, 'verification_key.production.json')
await fs.copyFile(path.resolve('circuits/build/JoinSplit.wasm'), wasmOut)
await fs.copyFile(zkey, zkeyOut)
const verificationKey = await snarkjs.zKey.exportVerificationKey(zkey)
await fs.writeFile(vkeyOut, `${JSON.stringify(verificationKey, null, 2)}\n`)
const template = await fs.readFile(path.resolve('node_modules/snarkjs/templates/verifier_groth16.sol.ejs'), 'utf8')
const verifier = await snarkjs.zKey.exportSolidityVerifier(zkey, { groth16: template })
await fs.writeFile(path.resolve('contracts/JoinSplitVerifier.production.sol'), verifier)
const digest = async file => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
const manifestPath = path.resolve('deployments/robinhood-mainnet.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
manifest.artifacts = { joinSplitWasm: '/proving/JoinSplit.wasm', joinSplitZkey: '/proving/JoinSplit.production.zkey', verificationKey: '/proving/verification_key.production.json' }
manifest.artifactHashes = { joinSplitWasm: await digest(wasmOut), joinSplitZkey: await digest(zkeyOut), verificationKey: await digest(vkeyOut) }
manifest.ceremony = { transcriptUrl: process.env.SARRUN_CEREMONY_URL, finalZkeySha256: manifest.artifactHashes.joinSplitZkey }
manifest.audits = [{ reportUrl: process.env.SARRUN_AUDIT_URL, scope: 'contracts-circuit-client' }]
manifest.release = { sourceCommit: process.env.SARRUN_SOURCE_COMMIT }
const rendered = `${JSON.stringify(manifest, null, 2)}\n`
await fs.writeFile(manifestPath, rendered)
await fs.writeFile(path.resolve('public/deployments/robinhood-mainnet.json'), rendered)
console.log('Production proving artifacts verified and staged. The contracts are not deployed yet.')