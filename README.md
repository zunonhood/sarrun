# Sarrun

Website: https://zunonhood.github.io/sarrun/

Sarrun is a non-custodial shielded account protocol for Robinhood Chain. The repository contains the public website, application shell, Solidity settlement contracts, Circom JoinSplit circuit, JavaScript SDK, deployment registry and end-to-end tests.

## Protocol

A public ETH deposit is bound onchain to a Poseidon commitment:

```text
commitment = Poseidon(assetId, value, ownerPublicKey, rho, randomness)
```

Private transitions consume up to two notes, create two notes and optionally expose a public exit. The Groth16 statement publishes exactly:

```text
root, nullifier0, nullifier1, outputCommitment0, outputCommitment1,
publicAmount, recipient, assetId
```

Private witnesses include note values, spending secrets, randomness and 20-level Merkle paths. Values are range constrained to 128 bits and the circuit enforces input conservation.

## Repository map

- `contracts/ShieldedPool.sol` — deposit binding, Poseidon tree, root history, nullifiers and native exits.
- `circuits/JoinSplit.circom` — two-input/two-output zero-knowledge transition.
- `sdk/` — notes, one-time receiving addresses, encrypted delivery, Merkle paths and proof generation.
- `src/protocol.js` — browser Shield, Transfer, Exit, chain reconstruction, scanning and recovery client.
- `deployments/robinhood-mainnet.json` — the only address registry consumed by the client.
- `test/` — contract, SDK, circuit and full proof integration checks.
- `SECURITY.md` — security and release boundaries.

## Commands

```bash
npm install
npm run protocol:test
npm run circuits:compile
npm run contracts:compile
npm run build
npm run dev
```

The generated local zkey and verifier carry `.local` in their names and exist only for integration tests. A Robinhood Chain deployment must use a verifier produced from a public ceremony and independently reviewed artifacts.

## Robinhood Chain deployment

Production activation is gated. A final non-local ZKey must verify against the reviewed R1CS and PTAU transcript; ceremony, audit and source-commit metadata must be present before deployment:

```bash
set SARRUN_FINAL_ZKEY=C:\secure\JoinSplit.production.zkey
set SARRUN_FINAL_PTAU=C:\secure\powersOfTau.final.ptau
set SARRUN_CEREMONY_URL=https://...
set SARRUN_AUDIT_URL=https://...
set SARRUN_SOURCE_COMMIT=<reviewed commit>
npm run release:prepare
npm run release:predeploy
set DEPLOYER_PRIVATE_KEY=0x...
npm run deploy:robinhood
npm run release:check
```

Never commit, upload or paste a deployer private key. Set it only in the local deployment environment. After deployment, the script writes the Poseidon, verifier and pool addresses to both the source manifest and the public manifest used by Docs.

## Security

Do not treat passing tests as an audit. Review the circuit, contracts, client-side key lifecycle, ceremony transcript, bytecode and deployment manifest before placing assets at risk. See `SECURITY.md`.