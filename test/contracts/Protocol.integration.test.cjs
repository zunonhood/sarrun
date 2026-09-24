const { expect } = require('chai')
const { ethers } = require('hardhat')
const { poseidonContract } = require('circomlibjs')
const path = require('node:path')

describe('Sarrun proof integration', function () {
  this.timeout(120000)

  it('shields, proves a JoinSplit, verifies onchain and exits value', async function () {
    const { createNote, ownerPublicKey, SarrunMerkleTree, proveJoinSplit, solidityCalldata } = await import('../../sdk/index.js')
    const [sender, recipient] = await ethers.getSigners()
    const Poseidon2 = new ethers.ContractFactory(poseidonContract.generateABI(2), poseidonContract.createCode(2), sender)
    const Poseidon5 = new ethers.ContractFactory(poseidonContract.generateABI(5), poseidonContract.createCode(5), sender)
    const treeHasher = await Poseidon2.deploy()
    const noteHasher = await Poseidon5.deploy()
    const Verifier = await ethers.getContractFactory('LocalGroth16Verifier')
    const verifier = await Verifier.deploy()
    const Pool = await ethers.getContractFactory('ShieldedPool')
    const pool = await Pool.deploy(await verifier.getAddress(), await treeHasher.getAddress(), await noteHasher.getAddress(), 0)

    const ownerSecret = 12345n
    const inputNote = await createNote({ value: 1000n, ownerSecret, rho: 111n, randomness: 222n })
    await pool.shield(inputNote.ownerPublicKey, inputNote.rho, inputNote.randomness, { value: inputNote.value })

    const tree = new SarrunMerkleTree()
    tree.append(inputNote.commitment)
    const membership = await tree.proof(0)
    expect(await pool.currentRoot()).to.equal(membership.root)

    const outputKey = await ownerPublicKey(67890n)
    const output0 = await createNote({ value: 600n, ownerPublicKey: outputKey, rho: 333n, randomness: 444n })
    const output1 = await createNote({ value: 0n, ownerPublicKey: outputKey, rho: 555n, randomness: 666n })
    const circuitInput = {
      root: membership.root,
      assetId: 0n,
      publicAmount: 400n,
      recipient: BigInt(recipient.address),
      inputEnabled: [1n, 0n],
      inputValue: [inputNote.value, 0n],
      inputOwnerSecret: [ownerSecret, 0n],
      inputRho: [inputNote.rho, 0n],
      inputRandomness: [inputNote.randomness, 0n],
      inputPathElements: [membership.pathElements, Array(20).fill(0n)],
      inputPathIndices: [membership.pathIndices, Array(20).fill(0)],
      outputValue: [output0.value, output1.value],
      outputOwnerPublicKey: [output0.ownerPublicKey, output1.ownerPublicKey],
      outputRho: [output0.rho, output1.rho],
      outputRandomness: [output0.randomness, output1.randomness],
    }
    const result = await proveJoinSplit(circuitInput, {
      wasmPath: path.join(process.cwd(), 'circuits', 'build', 'JoinSplit.wasm'),
      zkeyPath: path.join(process.cwd(), 'circuits', 'build', 'JoinSplit.local.zkey'),
    })
    const calldata = solidityCalldata(result.proof, result.publicSignals)
    const before = await ethers.provider.getBalance(recipient.address)
    await expect(pool.transact(calldata.a, calldata.b, calldata.c, calldata.publicSignals, '0x', '0x')).to.emit(pool, 'PrivateTransaction')
    expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + 400n)
    expect(await pool.nextLeafIndex()).to.equal(3)
  })
})