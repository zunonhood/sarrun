import { isAddress } from '@solana/kit'
import deployment from '../deployments/solana-mainnet.json' with { type: 'json' }
import { createPaymentAddress } from '../sdk/index.js'

export function getProtocolConfig() {
  const programId = deployment.programId
  return {
    ...deployment,
    address: programId,
    configured: Boolean(programId && isAddress(programId)),
    provingReady: Boolean(deployment.artifacts.joinSplitWasm && deployment.artifacts.joinSplitZkey),
  }
}

function requireDeployment() {
  const config = getProtocolConfig()
  if (!config.configured) throw new Error('The verified Sarrun Solana program is not published in the deployment manifest.')
  if (!config.provingReady) throw new Error('The verified production proving artifacts are not published.')
  throw new Error('The Solana instruction client will activate only after the reviewed program ID and verifier artifacts are published together.')
}

export async function shieldNative() {
  return requireDeployment()
}

export async function transferPrivate() {
  return requireDeployment()
}

export async function exitPrivate() {
  return requireDeployment()
}

export async function scanReceivedNotes() {
  return requireDeployment()
}

export { createPaymentAddress }

export function downloadRecoveryRecord(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const suffix = record.signature ? record.signature.slice(0, 8) : Date.now()
  link.download = `sarrun-${record.kind === 'sarrun-receiver' ? 'receiver' : 'recovery'}-${suffix}.json`
  link.click()
  URL.revokeObjectURL(url)
}
