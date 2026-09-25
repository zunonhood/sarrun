# Murven Solana program boundary

Murven targets Solana mainnet-beta as a native SOL shielded-account protocol.

## Accounts

- `PoolState` PDA: current Poseidon root, recent-root ring, next leaf index, and filled subtrees.
- `Vault` PDA: program-owned SOL liquidity backing every live private note.
- `NullifierRecord` PDA: derived from `['nullifier', nullifier]`; account creation is the double-spend lock.
- `OutputRecord` accounts: commitments and encrypted receiver payloads used by clients to reconstruct the tree.

## Instructions

1. `initialize_pool` creates the state and vault PDAs and pins the reviewed verifier identity.
2. `shield` transfers lamports into the vault and appends a value-bound commitment.
3. `transact` verifies a Groth16 BN254 proof, creates nullifier PDAs, appends two commitments, and optionally releases public SOL.

## Proof boundary

The existing Circom `JoinSplit` statement remains eight ordered field elements:

`root, nullifier0, nullifier1, outputCommitment0, outputCommitment1, publicAmount, recipient, assetId`

The Solana verifier adapter must use the runtime `alt_bn128` syscalls through a reviewed verifier library. The final verification key is embedded at build time and tied to the public ceremony transcript. Proof bytes and each public input are fixed-width and validated before the state transition.

## Release gate

A mainnet program ID must not enter `deployments/solana-mainnet.json` until the Rust program, generated verifier key, Circom artifacts, client instruction encoder, binary hash, independent review, and deployment slot all refer to the same source commit. The web application deliberately rejects Shield, Transfer, and Exit while any field is missing.
