import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const build = path.resolve('circuits/build')
const zkey = path.join(build, 'JoinSplit.local.zkey')
const verifier = path.resolve('contracts/JoinSplitVerifier.local.sol')
const force = process.argv.includes('--force')
if (!force && fs.existsSync(zkey) && fs.existsSync(verifier)) {
  console.log('Local proving artifacts already exist.')
  process.exit(0)
}
fs.mkdirSync(path.join(build, 'setup'), { recursive: true })
const snarkjs = path.resolve('node_modules/snarkjs/cli.js')
const run = args => execFileSync(process.execPath, [snarkjs, ...args], { stdio: 'inherit' })
const pot0 = path.join(build, 'setup', 'pot15_0000.ptau')
const pot1 = path.join(build, 'setup', 'pot15_0001.ptau')
const potFinal = path.join(build, 'setup', 'pot15_final.ptau')
run(['powersoftau', 'new', 'bn128', '15', pot0])
run(['powersoftau', 'contribute', pot0, pot1, '--name=Sarrun local integration tests', '-e=sarrun-local-powers-of-tau-not-for-production'])
run(['powersoftau', 'prepare', 'phase2', pot1, potFinal])
const initialZkey = path.join(build, 'setup', 'JoinSplit_0000.zkey')
run(['groth16', 'setup', path.join(build, 'JoinSplit.r1cs'), potFinal, initialZkey])
run(['zkey', 'contribute', initialZkey, zkey, '--name=Sarrun local integration tests', '-e=sarrun-local-tests-not-for-production'])
const temporaryVerifier = path.join(build, 'JoinSplitVerifier.generated.sol')
run(['zkey', 'export', 'solidityverifier', zkey, temporaryVerifier])
const source = fs.readFileSync(temporaryVerifier, 'utf8').replace('contract Groth16Verifier', 'contract LocalGroth16Verifier').replace(/[ \\t]+$/gm, '')
fs.writeFileSync(verifier, source)
fs.rmSync(temporaryVerifier, { force: true })
console.log('Generated local-only proving key and verifier for tests.')