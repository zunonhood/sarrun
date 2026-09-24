# Sarrun security policy

Do not use unaudited deployments with assets of value. Report suspected vulnerabilities privately to the maintainers before public disclosure.

The protocol separates spending keys from viewing/disclosure keys. It targets onchain graph unlinkability inside the shielded state; it does not hide RPC, device, timing, amount-pattern, endpoint, or compromised-wallet metadata by itself.

Production activation requires reproducible circuit artifacts, a publicly verifiable Groth16 ceremony, independent reviews of circuits/contracts/client cryptography, and a published deployment manifest whose bytecode matches the reviewed release.