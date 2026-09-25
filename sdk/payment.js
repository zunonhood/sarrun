import { x25519 } from '@noble/curves/ed25519'
import { ownerPublicKey, randomField } from './note.js'
import { SNARK_SCALAR_FIELD } from './constants.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ADDRESS_PREFIX = 'murven:sol:1:'
const ENVELOPE_PREFIX = 'murven-note:1:'

function bytesToBase64Url(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64url')
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlToBytes(text) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(text, 'base64url'))
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

function encodeObject(prefix, value) {
  return prefix + bytesToBase64Url(encoder.encode(JSON.stringify(value)))
}

function decodeObject(prefix, encoded) {
  if (typeof encoded !== 'string' || !encoded.startsWith(prefix)) throw new Error('Unsupported Murven encoding.')
  return JSON.parse(decoder.decode(base64UrlToBytes(encoded.slice(prefix.length))))
}

function concatBytes(...parts) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}

async function envelopeKey(sharedSecret, ephemeralPublicKey, recipientPublicKey) {
  const material = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: encoder.encode('Murven encrypted note v1'),
    info: concatBytes(ephemeralPublicKey, recipientPublicKey),
  }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function createPaymentAddress() {
  const ownerSecret = randomField()
  const viewingPrivateKey = x25519.utils.randomPrivateKey()
  const viewingPublicKey = x25519.getPublicKey(viewingPrivateKey)
  const spendPublicKey = await ownerPublicKey(ownerSecret)
  const address = encodeObject(ADDRESS_PREFIX, {
    s: spendPublicKey.toString(),
    v: bytesToBase64Url(viewingPublicKey),
  })
  return {
    address,
    public: { ownerPublicKey: spendPublicKey, viewingPublicKey },
    recovery: {
      version: 1,
      kind: 'murven-receiver',
      cluster: 'mainnet-beta',
      chain: 'solana:mainnet',
      address,
      ownerSecret: ownerSecret.toString(),
      viewingPrivateKey: bytesToBase64Url(viewingPrivateKey),
    },
  }
}

export function parsePaymentAddress(address) {
  const decoded = decodeObject(ADDRESS_PREFIX, address)
  const ownerKey = BigInt(decoded.s)
  const viewingKey = base64UrlToBytes(decoded.v)
  if (ownerKey <= 0n || ownerKey >= SNARK_SCALAR_FIELD || viewingKey.length !== 32) throw new Error('Invalid Murven payment address.')
  return { ownerPublicKey: ownerKey, viewingPublicKey: viewingKey }
}

export async function encryptNoteForAddress(serializedNote, address) {
  const recipient = parsePaymentAddress(address)
  const ephemeralPrivateKey = x25519.utils.randomPrivateKey()
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey)
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivateKey, recipient.viewingPublicKey)
  const key = await envelopeKey(sharedSecret, ephemeralPublicKey, recipient.viewingPublicKey)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoder.encode(serializedNote)))
  return encodeObject(ENVELOPE_PREFIX, {
    e: bytesToBase64Url(ephemeralPublicKey),
    n: bytesToBase64Url(nonce),
    c: bytesToBase64Url(ciphertext),
  })
}

export async function decryptNoteEnvelope(envelope, receiverRecovery) {
  if (receiverRecovery?.kind !== 'murven-receiver' || !receiverRecovery?.viewingPrivateKey || !receiverRecovery?.ownerSecret) {
    throw new Error('A valid Murven receiver recovery record is required.')
  }
  const decoded = decodeObject(ENVELOPE_PREFIX, envelope)
  const ephemeralPublicKey = base64UrlToBytes(decoded.e)
  const nonce = base64UrlToBytes(decoded.n)
  const ciphertext = base64UrlToBytes(decoded.c)
  const viewingPrivateKey = base64UrlToBytes(receiverRecovery.viewingPrivateKey)
  if (ephemeralPublicKey.length !== 32 || viewingPrivateKey.length !== 32 || nonce.length !== 12) throw new Error('Invalid encrypted note envelope.')
  const recipientPublicKey = x25519.getPublicKey(viewingPrivateKey)
  const sharedSecret = x25519.getSharedSecret(viewingPrivateKey, ephemeralPublicKey)
  const key = await envelopeKey(sharedSecret, ephemeralPublicKey, recipientPublicKey)
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext)
    const note = decoder.decode(plaintext)
    const expectedOwner = await ownerPublicKey(BigInt(receiverRecovery.ownerSecret))
    const addressOwner = parsePaymentAddress(receiverRecovery.address).ownerPublicKey
    if (expectedOwner !== addressOwner) throw new Error('Receiver recovery record does not match its payment address.')
    return note
  } catch (error) {
    if (error?.message?.includes('does not match')) throw error
    throw new Error('This encrypted note does not belong to this receiver record.')
  }
}

export const paymentEncoding = Object.freeze({ ADDRESS_PREFIX, ENVELOPE_PREFIX })