import { ethers } from 'ethers'
import deployment from '../deployments/robinhood-mainnet.json'
import {
  SarrunMerkleTree,
  createNote,
  createPaymentAddress,
  decryptNoteEnvelope,
  encryptNoteForAddress,
  noteCommitment,
  noteNullifier,
  ownerPublicKey,
  parseNote,
  parsePaymentAddress,
  proveJoinSplit,
  randomField,
  serializeNote,
  solidityCalldata,
} from '../sdk/index.js'

export const POOL_ABI = [
  'function shield(uint256 ownerPublicKey,uint256 rho,uint256 randomness) payable returns (uint32)',
  'function transact(uint256[2] a,uint256[2][2] b,uint256[2] c,uint256[8] publicSignals,bytes encryptedOutput0,bytes encryptedOutput1)',
  'function currentRoot() view returns (uint256)',
  'function nextLeafIndex() view returns (uint32)',
  'function nullifierSpent(uint256) view returns (bool)',
  'event Shielded(uint256 indexed commitment,uint32 indexed leafIndex,uint256 amount,uint256 root)',
  'event PrivateTransaction(uint256 indexed nullifier0,uint256 indexed nullifier1,uint256 outputCommitment0,uint256 outputCommitment1,uint32 outputLeafIndex0,uint32 outputLeafIndex1,uint256 publicAmount,address recipient,uint256 root,bytes encryptedOutput0,bytes encryptedOutput1)',
]

const EMPTY_PATH = Array(20).fill(0n)
const QUERY_BLOCK_SPAN = 40_000
let verifiedArtifactsPromise

export function getProtocolConfig() {
  const address = deployment.contracts.shieldedPool
  const wasmPath = deployment.artifacts.joinSplitWasm
  const zkeyPath = deployment.artifacts.joinSplitZkey
  return {
    ...deployment,
    address,
    wasmPath,
    zkeyPath,
    configured: ethers.isAddress(address || ''),
    provingReady: Boolean(wasmPath && zkeyPath),
  }
}

function requireDeployment({ proving = false } = {}) {
  const config = getProtocolConfig()
  if (!config.configured || config.deploymentBlock == null) throw new Error('The verified Robinhood Chain deployment is not configured.')
  if (proving && !config.provingReady) throw new Error('The verified production proving artifacts are not configured.')
  return config
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function verifiedProvingArtifacts(config) {
  verifiedArtifactsPromise ||= Promise.all([
    ['joinSplitWasm', config.wasmPath],
    ['joinSplitZkey', config.zkeyPath],
  ].map(async ([name, url]) => {
    const expected = config.artifactHashes?.[name]
    if (!/^[0-9a-f]{64}$/i.test(expected || '')) throw new Error(`Missing verified hash for ${name}.`)
    const resolvedUrl = /^https?:\/\//i.test(url) ? url : `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`
    const response = await fetch(resolvedUrl, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Could not download ${name}.`)
    const bytes = await response.arrayBuffer()
    if (await sha256Hex(bytes) !== expected.toLowerCase()) throw new Error(`Integrity check failed for ${name}.`)
    return URL.createObjectURL(new Blob([bytes]))
  }))
  const [wasmPath, zkeyPath] = await verifiedArtifactsPromise
  return { wasmPath, zkeyPath }
}

function providerFor(ethereum) {
  if (!ethereum) throw new Error('No browser wallet found.')
  return new ethers.BrowserProvider(ethereum)
}

function normalizeRecovery(record, config) {
  if (record?.version !== 1 || record?.kind !== 'sarrun-note' || !record?.note || !record?.ownerSecret) throw new Error('A valid Sarrun note recovery record is required.')
  if (Number(record.chainId) !== Number(config.chainId)) throw new Error('This recovery record belongs to a different chain.')
  if (String(record.pool).toLowerCase() !== String(config.address).toLowerCase()) throw new Error('This recovery record belongs to a different pool.')
  return record
}

async function queryInChunks(contract, filter, fromBlock, toBlock) {
  const events = []
  for (let start = Number(fromBlock); start <= Number(toBlock); start += QUERY_BLOCK_SPAN) {
    const end = Math.min(start + QUERY_BLOCK_SPAN - 1, Number(toBlock))
    events.push(...await contract.queryFilter(filter, start, end))
  }
  return events
}

export async function loadPoolState({ ethereum }) {
  const config = requireDeployment()
  const provider = providerFor(ethereum)
  const pool = new ethers.Contract(config.address, POOL_ABI, provider)
  const latest = await provider.getBlockNumber()
  const [shields, transactions] = await Promise.all([
    queryInChunks(pool, pool.filters.Shielded(), config.deploymentBlock, latest),
    queryInChunks(pool, pool.filters.PrivateTransaction(), config.deploymentBlock, latest),
  ])
  const leaves = []
  for (const event of shields) leaves[Number(event.args.leafIndex)] = BigInt(event.args.commitment)
  for (const event of transactions) {
    leaves[Number(event.args.outputLeafIndex0)] = BigInt(event.args.outputCommitment0)
    leaves[Number(event.args.outputLeafIndex1)] = BigInt(event.args.outputCommitment1)
  }
  if (leaves.some(value => value == null)) throw new Error('The onchain commitment tree could not be reconstructed.')
  const tree = new SarrunMerkleTree()
  for (const leaf of leaves) tree.append(leaf)
  return { config, provider, pool, tree, shields, transactions, latest }
}

async function prepareInput({ ethereum, recovery }) {
  const state = await loadPoolState({ ethereum })
  const record = normalizeRecovery(recovery, state.config)
  const note = parseNote(record.note)
  const commitment = await noteCommitment(note)
  if (commitment !== BigInt(note.commitment)) throw new Error('The recovery note commitment is invalid.')
  const expectedOwner = await ownerPublicKey(BigInt(record.ownerSecret))
  if (expectedOwner !== BigInt(note.ownerPublicKey)) throw new Error('The recovery spending key does not control this note.')
  const leafIndex = state.tree.leaves.findIndex(value => value === commitment)
  if (leafIndex < 0) throw new Error('This note was not found in the deployed pool.')
  const nullifier = await noteNullifier(note, BigInt(record.ownerSecret))
  if (await state.pool.nullifierSpent(nullifier)) throw new Error('This note has already been spent.')
  const membership = await state.tree.proof(leafIndex)
  const onchainRoot = await state.pool.currentRoot()
  if (membership.root !== onchainRoot) throw new Error('The reconstructed commitment root does not match the contract.')
  return { ...state, record, note, commitment, nullifier, membership }
}

function proofInput({ input, output0, output1, publicAmount = 0n, recipient = 0n }) {
  return {
    root: input.membership.root,
    assetId: 0n,
    publicAmount,
    recipient,
    inputEnabled: [1n, 0n],
    inputValue: [input.note.value, 0n],
    inputOwnerSecret: [BigInt(input.record.ownerSecret), 0n],
    inputRho: [input.note.rho, 0n],
    inputRandomness: [input.note.randomness, 0n],
    inputPathElements: [input.membership.pathElements, EMPTY_PATH],
    inputPathIndices: [input.membership.pathIndices, Array(20).fill(0)],
    outputValue: [output0.value, output1.value],
    outputOwnerPublicKey: [output0.ownerPublicKey, output1.ownerPublicKey],
    outputRho: [output0.rho, output1.rho],
    outputRandomness: [output0.randomness, output1.randomness],
  }
}

function noteRecord(config, note, ownerSecret, extra = {}) {
  return {
    version: 1,
    kind: 'sarrun-note',
    chainId: config.chainId,
    pool: config.address,
    transactionHash: null,
    ownerSecret: BigInt(ownerSecret).toString(),
    note: serializeNote(note),
    ...extra,
  }
}

async function submitTransition({ ethereum, input, output0, output1, publicAmount, recipient, encryptedOutput0 = '', encryptedOutput1 = '', onProof, onPrepared }) {
  const config = requireDeployment({ proving: true })
  onProof?.('proving')
  const artifacts = await verifiedProvingArtifacts(config)
  const proof = await proveJoinSplit(proofInput({ input, output0, output1, publicAmount, recipient }), artifacts)
  const calldata = solidityCalldata(proof.proof, proof.publicSignals)
  onProof?.('signing')
  onPrepared?.()
  const signer = await input.provider.getSigner()
  const pool = input.pool.connect(signer)
  const transaction = await pool.transact(
    calldata.a,
    calldata.b,
    calldata.c,
    calldata.publicSignals,
    encryptedOutput0 ? ethers.hexlify(ethers.toUtf8Bytes(encryptedOutput0)) : '0x',
    encryptedOutput1 ? ethers.hexlify(ethers.toUtf8Bytes(encryptedOutput1)) : '0x',
  )
  onProof?.('confirming')
  const receipt = await transaction.wait()
  return { transaction, receipt, proof }
}

export async function shieldNative({ ethereum, amount, onPrepared }) {
  const config = requireDeployment({ proving: true })
  const value = ethers.parseEther(String(amount))
  if (value <= 0n) throw new Error('Enter an amount greater than zero.')
  const provider = providerFor(ethereum)
  const signer = await provider.getSigner()
  const ownerSecret = randomField()
  const note = await createNote({ value, ownerSecret })
  const pool = new ethers.Contract(config.address, POOL_ABI, signer)
  const record = noteRecord(config, note, ownerSecret)
  onPrepared?.(record)
  const transaction = await pool.shield(note.ownerPublicKey, note.rho, note.randomness, { value })
  record.transactionHash = transaction.hash
  const receipt = await transaction.wait()
  record.transactionHash = receipt.hash
  const event = receipt.logs.map(log => { try { return pool.interface.parseLog(log) } catch { return null } }).find(log => log?.name === 'Shielded')
  if (event) record.leafIndex = Number(event.args.leafIndex)
  return { transaction, receipt, record, note }
}

export async function transferPrivate({ ethereum, recovery, amount, paymentAddress, onProof, onPrepared }) {
  const input = await prepareInput({ ethereum, recovery })
  const value = ethers.parseEther(String(amount))
  if (value <= 0n) throw new Error('Enter an amount greater than zero.')
  if (value > input.note.value) throw new Error('The transfer exceeds the private note value.')
  const recipient = parsePaymentAddress(paymentAddress)
  const recipientNote = await createNote({ value, ownerPublicKey: recipient.ownerPublicKey })
  const changeValue = input.note.value - value
  const changeSecret = randomField()
  const changeNote = await createNote({ value: changeValue, ownerSecret: changeSecret })
  const recipientEnvelope = await encryptNoteForAddress(serializeNote(recipientNote), paymentAddress)
  const changeRecord = changeValue > 0n ? noteRecord(input.config, changeNote, changeSecret, { source: 'change' }) : null
  const result = await submitTransition({
    ethereum, input, output0: recipientNote, output1: changeNote, publicAmount: 0n, recipient: 0n,
    encryptedOutput0: recipientEnvelope,
    onProof,
    onPrepared: () => onPrepared?.(changeRecord),
  })
  if (changeRecord) changeRecord.transactionHash = result.receipt.hash
  return { ...result, changeRecord, sentValue: value }
}

export async function exitPrivate({ ethereum, recovery, amount, recipientAddress, onProof, onPrepared }) {
  const input = await prepareInput({ ethereum, recovery })
  if (!ethers.isAddress(recipientAddress)) throw new Error('Enter a valid public recipient address.')
  const value = ethers.parseEther(String(amount))
  if (value <= 0n) throw new Error('Enter an amount greater than zero.')
  if (value > input.note.value) throw new Error('The exit exceeds the private note value.')
  const changeValue = input.note.value - value
  const changeSecret = randomField()
  const changeNote = await createNote({ value: changeValue, ownerSecret: changeSecret })
  const dummySecret = randomField()
  const dummyNote = await createNote({ value: 0n, ownerSecret: dummySecret })
  const changeRecord = changeValue > 0n ? noteRecord(input.config, changeNote, changeSecret, { source: 'change' }) : null
  const result = await submitTransition({
    ethereum, input, output0: changeNote, output1: dummyNote, publicAmount: value, recipient: BigInt(recipientAddress),
    onProof,
    onPrepared: () => onPrepared?.(changeRecord),
  })
  if (changeRecord) changeRecord.transactionHash = result.receipt.hash
  return { ...result, changeRecord, exitedValue: value }
}

export async function scanReceivedNotes({ ethereum, receiverRecovery }) {
  const state = await loadPoolState({ ethereum })
  if (receiverRecovery?.kind !== 'sarrun-receiver' || Number(receiverRecovery.chainId) !== Number(state.config.chainId)) throw new Error('A valid Robinhood Chain receiver record is required.')
  const notes = []
  for (const event of state.transactions) {
    const envelopes = [event.args.encryptedOutput0, event.args.encryptedOutput1]
    const commitments = [event.args.outputCommitment0, event.args.outputCommitment1]
    const leafIndices = [event.args.outputLeafIndex0, event.args.outputLeafIndex1]
    for (let i = 0; i < 2; i++) {
      if (!envelopes[i] || envelopes[i] === '0x') continue
      try {
        const encoded = ethers.toUtf8String(envelopes[i])
        const serialized = await decryptNoteEnvelope(encoded, receiverRecovery)
        const note = parseNote(serialized)
        if (await noteCommitment(note) !== BigInt(commitments[i])) continue
        const record = noteRecord(state.config, note, BigInt(receiverRecovery.ownerSecret), {
          transactionHash: event.transactionHash,
          leafIndex: Number(leafIndices[i]),
          source: 'received',
        })
        const nullifier = await noteNullifier(note, BigInt(receiverRecovery.ownerSecret))
        notes.push({ record, note, spent: await state.pool.nullifierSpent(nullifier) })
      } catch {
        // Envelopes for other receivers are intentionally indistinguishable and ignored.
      }
    }
  }
  return notes
}

export { createPaymentAddress }

export function downloadRecoveryRecord(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sarrun-${record.kind === 'sarrun-receiver' ? 'receiver' : 'recovery'}-${record.transactionHash ? record.transactionHash.slice(2, 10) : Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}