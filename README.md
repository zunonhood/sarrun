# Sarrun

Website: https://sarrun.fun/

Sarrun is a non-custodial shielded-account protocol designed for Solana. The browser connects through Wallet Standard, reads SOL state from mainnet-beta, creates one-time private receiving addresses locally, and consumes a single reviewed deployment manifest.

## Protocol

A public SOL deposit is bound to a Poseidon note commitment:

```text
commitment = Poseidon(assetId, valueLamports, ownerPublicKey, rho, randomness)
```

Private transitions consume up to two notes, create two fresh notes, and may expose a public SOL exit. The Groth16 statement publishes exactly:

```text
root, nullifier0, nullifier1, outputCommitment0, outputCommitment1,
publicAmount, recipient, assetId
```

Private witnesses include note values, spending secrets, randomness, output owners, and 20-level Merkle paths. The circuit range-checks values and enforces conservation.

## Solana architecture

- `programs/sarrun/ARCHITECTURE.md` — PDA, vault, nullifier, instruction, verifier, and release boundaries.
- `circuits/JoinSplit.circom` — two-input/two-output value-conserving JoinSplit.
- `sdk/` — Poseidon notes, encrypted delivery, Merkle paths, and browser proof generation.
- `src/solana-client.js` — official Solana Kit client using Wallet Standard and mainnet RPC.
- `src/protocol.js` — deployment-gated browser protocol boundary.
- `deployments/solana-mainnet.json` — the only program/account/artifact registry consumed by the client.
- `test/` — SDK and circuit constraint tests.
- `SECURITY.md` — threat model and mainnet release gate.

Solana programs are stateless; mutable protocol state lives in PDAs. The pool state stores the commitment-tree frontier and recent roots, a program-owned vault backs live SOL notes, and nullifier PDAs make a second spend fail at account creation. Groth16 BN254 verification maps to Solana's `alt_bn128` runtime syscalls.

## Commands

```bash
npm install
npm run sdk:test
npm run circuits:test
npm run build
npm run dev
```

## Mainnet activation

The checked-in manifest intentionally keeps `programId` and artifact locations null until one reviewed release binds all of the following: Rust program binary, embedded verification key, final ceremony artifacts, client encoder, audit references, deployment slot, and source commit. The app connects to Solana mainnet today but will not create value-moving instructions until that registry is complete.

Never commit a program authority or wallet secret. Do not treat passing tests as an audit.
