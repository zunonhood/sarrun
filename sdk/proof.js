export async function proveJoinSplit(input, { wasmPath, zkeyPath }) {
  const snarkjs = await import('snarkjs')
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)
  return { proof, publicSignals: publicSignals.map(BigInt) }
}
export function solidityCalldata(proof, publicSignals) {
  return { a: [proof.pi_a[0], proof.pi_a[1]], b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]], c: [proof.pi_c[0], proof.pi_c[1]], publicSignals: publicSignals.map(String) }
}