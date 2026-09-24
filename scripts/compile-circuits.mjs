import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
const root = process.cwd()
const circuits = path.join(root, 'circuits')
const build = path.join(circuits, 'build')
const source = path.join(circuits, 'JoinSplit.circom')
const outputs = [path.join(build, 'JoinSplit.r1cs'), path.join(build, 'JoinSplit.sym'), path.join(build, 'JoinSplit.wasm')]
const stamp = path.join(build, 'JoinSplit.source.sha256')
await mkdir(build, { recursive: true })
const sourceHash = createHash('sha256').update(await readFile(source)).digest('hex')
const stampedHash = await readFile(stamp, 'utf8').catch(() => '')
const outputsExist = await Promise.all(outputs.map(file => readFile(file).then(() => true).catch(() => false)))
if (stampedHash.trim() === sourceHash && outputsExist.every(Boolean)) {
  console.log('Circuit build is current.')
  process.exit(0)
}
const circom = path.join(root, 'node_modules', 'circom2', 'cli.js')
execFileSync(process.execPath, [circom, 'JoinSplit.circom', '--r1cs', '--wasm', '--sym', '-l', path.join(root, 'node_modules')], { cwd: circuits, stdio: 'inherit' })
await Promise.all([
  copyFile(path.join(circuits, 'JoinSplit.r1cs'), outputs[0]),
  copyFile(path.join(circuits, 'JoinSplit.sym'), outputs[1]),
  copyFile(path.join(circuits, 'JoinSplit_js', 'JoinSplit.wasm'), outputs[2]),
])
await writeFile(stamp, `${sourceHash}\n`)
console.log('Circuit artifacts copied to circuits/build.')