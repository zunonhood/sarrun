import test from 'node:test'
import assert from 'node:assert/strict'
import deployment from '../../deployments/solana-mainnet.json' with { type: 'json' }
import { createPaymentAddress } from '../../sdk/payment.js'
import { getProtocolConfig } from '../../src/protocol.js'

test('uses a single fail-closed Solana mainnet deployment manifest', () => {
  assert.equal(deployment.cluster, 'mainnet-beta')
  assert.equal(deployment.chain, 'solana:mainnet')
  assert.equal(deployment.nativeSymbol, 'SOL')
  assert.equal(getProtocolConfig().configured, false)
})

test('creates Solana-scoped private receiver records', async () => {
  const receiver = await createPaymentAddress()
  assert.match(receiver.address, /^sarrun:sol:1:/)
  assert.equal(receiver.recovery.cluster, 'mainnet-beta')
  assert.equal(receiver.recovery.chain, 'solana:mainnet')
})
