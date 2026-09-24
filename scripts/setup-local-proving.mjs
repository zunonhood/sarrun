import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const build = path.resolve('circuits/build')
const zkey = path.join(build, 'JoinSplit.local.zkey')
const verifier = path.resolve('contracts/JoinSplitVerifier.local.sol')
if (fs.existsSync(zkey) && fs.existsSync(verifier)) {
  console.log('Local proving artifacts already exist.')
  process.exit(0)
}
fs.mkdirSync(path.join(build, 'setup'), { recursive: true })
const snarkjs = process.platform === 'win32' ? path.resolve('node_modules/.bin/snarkjs.cmd') : path.resolve('node_modules/.bin/snarkjs')
const run = args => execFileSync(snarkjs, args, { stdio: 'inherit' })
const pot0 = path.join(build, 'setup', 'pot15_0000.ptau')
const potFinal = path.join(build, 'setup', 'pot15_final.ptau')
run(['powersoftau', 'new', 'bn128', '15', pot0])
run(['powersoftau', 'prepare', 'phase2', pot0, potFinal])
run(['groth16', 'setup', path.join(build, 'JoinSplit.r1cs'), potFinal, zkey])
const temporaryVerifier = path.join(build, 'JoinSplitVerifier.generated.sol')
run(['zkey', 'export', 'solidityverifier', zkey, temporaryVerifier])
const source = fs.readFileSync(temporaryVerifier, 'utf8').replace('contract Groth16Verifier', 'contract LocalGroth16Verifier').replace(/[ \\t]+$/gm, '')
fs.writeFileSync(verifier, source)
fs.rmSync(temporaryVerifier, { force: true })
console.log('Generated local-only proving key and verifier for tests.')