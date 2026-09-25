export async function proveJoinSplit(input, { wasmPath, zkeyPath }) {
  const snarkjs = await import('snarkjs')
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)
  return { proof, publicSignals: publicSignals.map(BigInt) }
}
