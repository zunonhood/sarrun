# Murven security policy

Do not use unaudited programs or proving artifacts with assets of value. Report suspected vulnerabilities privately to the maintainers before public disclosure.

Murven separates spending keys from viewing/disclosure keys. It targets graph unlinkability inside shielded state; it does not hide RPC provider, browser, device, timing, amount-pattern, public entry, public exit, or compromised-wallet metadata.

Solana mainnet activation requires a reviewed Rust/sBPF program, an embedded Groth16 verification key produced from the published Circom circuit and final ceremony, deterministic program and artifact hashes, independent reviews, a verified program ID and PDA set, deployment slot, and source commit in `deployments/solana-mainnet.json`.

The browser must fail closed when any deployment field or artifact hash is absent. Never commit a program authority, fee-payer keypair, wallet secret, recovery record, or trusted-setup toxic waste.
