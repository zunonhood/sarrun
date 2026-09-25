import { poseidon1 } from 'poseidon-lite/poseidon1'
import { poseidon2 } from 'poseidon-lite/poseidon2'
import { poseidon5 } from 'poseidon-lite/poseidon5'
import { SNARK_SCALAR_FIELD } from './constants.js'

function bytesToBigInt(bytes) {
  return BigInt(`0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`)
}
function toBase64Url(text) {
  if (typeof Buffer !== 'undefined') return Buffer.from(text, 'utf8').toString('base64url')
  return btoa(unescape(encodeURIComponent(text))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
function fromBase64Url(text) {
  if (typeof Buffer !== 'undefined') return Buffer.from(text, 'base64url').toString('utf8')
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
  return decodeURIComponent(escape(atob(base64)))
}
export function randomField() {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return bytesToBigInt(bytes) % SNARK_SCALAR_FIELD
}
export async function ownerPublicKey(ownerSecret) { return poseidon1([BigInt(ownerSecret)]) }
export async function noteCommitment(note) { return poseidon5([note.assetId, note.value, note.ownerPublicKey, note.rho, note.randomness].map(BigInt)) }
export async function noteNullifier(note, ownerSecret) { return poseidon2([await noteCommitment(note), BigInt(ownerSecret)]) }
export async function createNote({ value, assetId = 0n, ownerSecret, ownerPublicKey: suppliedKey, rho, randomness }) {
  const publicKey = suppliedKey == null ? await ownerPublicKey(ownerSecret) : BigInt(suppliedKey)
  const note = { version: 1, assetId: BigInt(assetId), value: BigInt(value), ownerPublicKey: publicKey, rho: rho == null ? randomField() : BigInt(rho), randomness: randomness == null ? randomField() : BigInt(randomness) }
  return { ...note, commitment: await noteCommitment(note) }
}
export function serializeNote(note) {
  const body = Object.fromEntries(Object.entries(note).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value]))
  return `murven1:${toBase64Url(JSON.stringify(body))}`
}
export function parseNote(encoded) {
  if (!encoded.startsWith('murven1:')) throw new Error('Unsupported Murven note')
  const body = JSON.parse(fromBase64Url(encoded.slice(8)))
  for (const key of ['assetId', 'value', 'ownerPublicKey', 'rho', 'randomness', 'commitment']) body[key] = BigInt(body[key])
  return body
}