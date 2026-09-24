import test from 'node:test'
import assert from 'node:assert/strict'
import { createNote, noteCommitment, noteNullifier, ownerPublicKey, parseNote, serializeNote, SarrunMerkleTree } from '../../sdk/index.js'
import { poseidon1 } from 'poseidon-lite/poseidon1'
import { poseidon5 } from 'poseidon-lite/poseidon5'

test('creates, commits and serializes a Sarrun note deterministically', async () => {
  const secret = 123456789n
  const note = await createNote({ value: 42n, ownerSecret: secret })
  assert.equal(note.ownerPublicKey, await ownerPublicKey(secret))
  assert.equal(note.commitment, await noteCommitment(note))
  assert.notEqual(await noteNullifier(note, secret), 0n)
  assert.deepEqual(parseNote(serializeNote(note)), note)
})

test('different randomness produces unlinkable commitments', async () => {
  const ownerSecret = 99n
  const one = await createNote({ value: 10n, ownerSecret })
  const two = await createNote({ value: 10n, ownerSecret })
  assert.notEqual(one.commitment, two.commitment)
})

test('builds Merkle paths that resolve to the published root', async () => {
  const tree = new SarrunMerkleTree({ depth: 4 })
  tree.append(11n); tree.append(22n); tree.append(33n)
  const proof = await tree.proof(1)
  assert.equal(proof.pathIndices.length, 4)
  assert.equal(proof.pathElements.length, 4)
  assert.equal(proof.root, await tree.root())
})
test('browser Poseidon matches the circuit SDK', async () => {
  const secret = 777n
  const note = await createNote({ value: 123n, ownerSecret: secret, rho: 456n, randomness: 789n })
  assert.equal(poseidon1([secret]), note.ownerPublicKey)
  assert.equal(poseidon5([note.assetId, note.value, note.ownerPublicKey, note.rho, note.randomness]), note.commitment)
})