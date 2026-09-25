import { poseidon2 } from 'poseidon-lite/poseidon2'
import { TREE_DEPTH } from './constants.js'
export class MurvenMerkleTree {
  constructor({ depth = TREE_DEPTH, zero = 0n } = {}) { this.depth = depth; this.zero = BigInt(zero); this.leaves = [] }
  async _hash(left, right) { return poseidon2([BigInt(left), BigInt(right)]) }
  async zeroes() { const levels = [this.zero]; for (let i = 1; i <= this.depth; i++) levels.push(await this._hash(levels[i - 1], levels[i - 1])); return levels }
  append(commitment) { if (this.leaves.length >= 2 ** this.depth) throw new Error('Murven tree is full'); this.leaves.push(BigInt(commitment)); return this.leaves.length - 1 }
  async layers() { const zeroes = await this.zeroes(); const layers = [this.leaves.slice()]; for (let level = 0; level < this.depth; level++) { const source = layers[level]; const next = []; const width = Math.max(1, Math.ceil(source.length / 2)); for (let i = 0; i < width; i++) next.push(await this._hash(source[i * 2] ?? zeroes[level], source[i * 2 + 1] ?? zeroes[level])); layers.push(next) } return { layers, zeroes } }
  async root() { const { layers, zeroes } = await this.layers(); return layers[this.depth][0] ?? zeroes[this.depth] }
  async proof(index) { if (!Number.isInteger(index) || index < 0 || index >= this.leaves.length) throw new Error('Unknown leaf index'); const { layers, zeroes } = await this.layers(); const pathElements = []; const pathIndices = []; let cursor = index; for (let level = 0; level < this.depth; level++) { const sibling = cursor ^ 1; pathElements.push(layers[level][sibling] ?? zeroes[level]); pathIndices.push(cursor & 1); cursor >>= 1 } return { pathElements, pathIndices, root: layers[this.depth][0] ?? zeroes[this.depth] } }
}