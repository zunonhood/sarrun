import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink } from 'node:fs/promises'
import * as snarkjs from 'snarkjs'
import { createNote, noteNullifier, ownerPublicKey, MurvenMerkleTree } from '../../sdk/index.js'

const wasmPath = join(process.cwd(), 'circuits', 'build', 'JoinSplit.wasm')

async function fixture() {
  const ownerSecret = 12345n
  const input = await createNote({ value: 100n, ownerSecret, rho: 111n, randomness: 222n })
  const tree = new MurvenMerkleTree()
  tree.append(input.commitment)
  const membership = await tree.proof(0)
  const recipient = 0n
  const outputOwner = await ownerPublicKey(67890n)
  const output0 = await createNote({ value: 60n, ownerPublicKey: outputOwner, rho: 333n, randomness: 444n })
  const output1 = await createNote({ value: 40n, ownerPublicKey: outputOwner, rho: 555n, randomness: 666n })
  const circuitInput = {
    root: membership.root,
    assetId: 0n,
    publicAmount: 0n,
    recipient,
    inputEnabled: [1n, 0n],
    inputValue: [input.value, 0n],
    inputOwnerSecret: [ownerSecret, 0n],
    inputRho: [input.rho, 0n],
    inputRandomness: [input.randomness, 0n],
    inputPathElements: [membership.pathElements, Array(20).fill(0n)],
    inputPathIndices: [membership.pathIndices, Array(20).fill(0)],
    outputValue: [output0.value, output1.value],
    outputOwnerPublicKey: [output0.ownerPublicKey, output1.ownerPublicKey],
    outputRho: [output0.rho, output1.rho],
    outputRandomness: [output0.randomness, output1.randomness],
  }
  const expected = [membership.root, await noteNullifier(input, ownerSecret), 0n, output0.commitment, output1.commitment, 0n, recipient, 0n]
  return { circuitInput, expected }
}

test('JoinSplit witness exposes the documented eight-field verifier ABI', async () => {
  const { circuitInput, expected } = await fixture()
  const output = join(tmpdir(), `murven-${Date.now()}.wtns`)
  try {
    await snarkjs.wtns.calculate(circuitInput, wasmPath, output)
    const witness = await snarkjs.wtns.exportJson(output)
    assert.deepEqual(witness.slice(1, 9).map(BigInt), expected)
  } finally {
    await unlink(output).catch(() => {})
  }
})

test('JoinSplit rejects value creation', async () => {
  const { circuitInput } = await fixture()
  circuitInput.outputValue = [61n, 40n]
  const output = join(tmpdir(), `murven-invalid-${Date.now()}.wtns`)
  await assert.rejects(snarkjs.wtns.calculate(circuitInput, wasmPath, output))
  await unlink(output).catch(() => {})
})