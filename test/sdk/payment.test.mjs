import test from 'node:test'
import assert from 'node:assert/strict'
import { createNote, serializeNote, parseNote, noteCommitment } from '../../sdk/note.js'
import { createPaymentAddress, parsePaymentAddress, encryptNoteForAddress, decryptNoteEnvelope } from '../../sdk/payment.js'

test('creates a one-time Murven payment address and recovery record', async () => {
  const receiver = await createPaymentAddress()
  const parsed = parsePaymentAddress(receiver.address)
  assert.equal(parsed.ownerPublicKey, receiver.public.ownerPublicKey)
  assert.equal(parsed.viewingPublicKey.length, 32)
  assert.equal(receiver.recovery.kind, 'murven-receiver')
})

test('encrypts a note that only the receiver record can open', async () => {
  const receiver = await createPaymentAddress()
  const note = await createNote({ value: 42n, ownerPublicKey: receiver.public.ownerPublicKey })
  const serialized = serializeNote(note)
  const envelope = await encryptNoteForAddress(serialized, receiver.address)
  const opened = parseNote(await decryptNoteEnvelope(envelope, receiver.recovery))
  assert.equal(opened.value, 42n)
  assert.equal(await noteCommitment(opened), note.commitment)

  const stranger = await createPaymentAddress()
  await assert.rejects(decryptNoteEnvelope(envelope, stranger.recovery), /does not belong/)
})