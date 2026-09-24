const { expect } = require('chai')
const { ethers } = require('hardhat')
const { poseidonContract } = require('circomlibjs')

describe('ShieldedPool', function () {
  async function deploy() {
    const [owner, recipient] = await ethers.getSigners()
    const Poseidon = new ethers.ContractFactory(poseidonContract.generateABI(2), poseidonContract.createCode(2), owner)
    const poseidon = await Poseidon.deploy()
    const NotePoseidon = new ethers.ContractFactory(poseidonContract.generateABI(5), poseidonContract.createCode(5), owner)
    const notePoseidon = await NotePoseidon.deploy()
    const Verifier = await ethers.getContractFactory('MockVerifier')
    const verifier = await Verifier.deploy()
    const Pool = await ethers.getContractFactory('ShieldedPool')
    const pool = await Pool.deploy(await verifier.getAddress(), await poseidon.getAddress(), await notePoseidon.getAddress(), 0)
    return { recipient, verifier, pool }
  }
  const blankProof = { a: [0, 0], b: [[0, 0], [0, 0]], c: [0, 0] }

  it('shields ETH and records a new known root', async function () {
    const { pool } = await deploy()
    const oldRoot = await pool.currentRoot()
    await expect(pool.shield(123n, 456n, 789n, { value: ethers.parseEther('1') })).to.emit(pool, 'Shielded')
    expect(await pool.nextLeafIndex()).to.equal(1)
    expect(await pool.currentRoot()).not.to.equal(oldRoot)
    expect(await pool.isKnownRoot(oldRoot)).to.equal(true)
  })

  it('rejects duplicate commitments', async function () {
    const { pool } = await deploy()
    await pool.shield(123n, 456n, 789n, { value: 1 })
    await expect(pool.shield(123n, 456n, 789n, { value: 1 })).to.be.revertedWithCustomError(pool, 'CommitmentAlreadyInserted')
  })

  it('marks nullifiers, inserts outputs and exits native value', async function () {
    const { pool, recipient } = await deploy()
    await pool.shield(111n, 456n, 789n, { value: 1000n })
    const before = await ethers.provider.getBalance(recipient.address)
    const signals = [await pool.currentRoot(), 501n, 0n, 601n, 602n, 400n, BigInt(recipient.address), 0n]
    await pool.transact(blankProof.a, blankProof.b, blankProof.c, signals, '0x', '0x')
    expect(await pool.nullifierSpent(501n)).to.equal(true)
    expect(await pool.nextLeafIndex()).to.equal(3)
    expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + 400n)
    await expect(pool.transact(blankProof.a, blankProof.b, blankProof.c, signals, '0x', '0x')).to.be.revertedWithCustomError(pool, 'NullifierAlreadySpent')
  })

  it('publishes bounded encrypted output payloads', async function () {
    const { pool, recipient } = await deploy()
    await pool.shield(111n, 456n, 789n, { value: 1000n })
    const signals = [await pool.currentRoot(), 701n, 0n, 801n, 802n, 0n, BigInt(recipient.address), 0n]
    const payload = ethers.toUtf8Bytes('sarrun-note:1:encrypted')
    const receipt = await (await pool.transact(blankProof.a, blankProof.b, blankProof.c, signals, payload, '0x')).wait()
    const event = receipt.logs.map(log => { try { return pool.interface.parseLog(log) } catch { return null } }).find(log => log?.name === 'PrivateTransaction')
    expect(ethers.toUtf8String(event.args.encryptedOutput0)).to.equal('sarrun-note:1:encrypted')
    expect(event.args.encryptedOutput1).to.equal('0x')
  })

  it('rejects oversized encrypted output payloads', async function () {
    const { pool, recipient } = await deploy()
    await pool.shield(111n, 456n, 789n, { value: 1000n })
    const signals = [await pool.currentRoot(), 901n, 0n, 902n, 903n, 0n, BigInt(recipient.address), 0n]
    await expect(pool.transact(blankProof.a, blankProof.b, blankProof.c, signals, new Uint8Array(769), '0x'))
      .to.be.revertedWithCustomError(pool, 'EncryptedOutputTooLarge')
  })

  it('rejects a proof when the verifier rejects it', async function () {
    const { pool, verifier, recipient } = await deploy()
    await pool.shield(111n, 456n, 789n, { value: 1000n })
    await verifier.setResult(false)
    const signals = [await pool.currentRoot(), 9n, 0n, 10n, 11n, 0n, BigInt(recipient.address), 0n]
    await expect(pool.transact(blankProof.a, blankProof.b, blankProof.c, signals, '0x', '0x')).to.be.revertedWithCustomError(pool, 'InvalidProof')
  })

  it('rejects an empty state transition', async function () {
    const { pool, recipient } = await deploy()
    const signals = [await pool.currentRoot(), 0n, 0n, 10n, 11n, 0n, BigInt(recipient.address), 0n]
    await expect(pool.transact(blankProof.a, blankProof.b, blankProof.c, signals, '0x', '0x'))
      .to.be.revertedWithCustomError(pool, 'InvalidProof')
  })})