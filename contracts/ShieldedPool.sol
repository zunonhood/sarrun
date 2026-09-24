// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IGroth16Verifier} from "./interfaces/IGroth16Verifier.sol";
import {IPoseidonT3} from "./interfaces/IPoseidonT3.sol";
import {IPoseidonT6} from "./interfaces/IPoseidonT6.sol";

/// @title Sarrun Shielded Pool
/// @notice Native-asset shielded state with an append-only Poseidon tree.
contract ShieldedPool is ReentrancyGuard {
    uint32 public constant TREE_DEPTH = 20;
    uint32 public constant ROOT_HISTORY_SIZE = 64;
    uint32 public constant MAX_ENCRYPTED_OUTPUT_BYTES = 768;
    uint256 public constant MAX_NOTE_VALUE = type(uint128).max;
    uint256 public constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    IGroth16Verifier public immutable verifier;
    IPoseidonT3 public immutable hasher;
    IPoseidonT6 public immutable noteHasher;
    uint32 public nextLeafIndex;
    uint32 public currentRootIndex;
    uint256[TREE_DEPTH] public zeros;
    uint256[TREE_DEPTH] public filledSubtrees;
    uint256[ROOT_HISTORY_SIZE] public roots;
    mapping(uint256 => bool) public nullifierSpent;
    mapping(uint256 => bool) public commitmentInserted;

    error InvalidCommitment();
    error CommitmentAlreadyInserted();
    error TreeFull();
    error UnknownRoot();
    error NullifierAlreadySpent();
    error InvalidProof();
    error InvalidRecipient();
    error UnsupportedAsset();
    error TransferFailed();
    error FieldOverflow();
    error EncryptedOutputTooLarge();

    event Shielded(uint256 indexed commitment, uint32 indexed leafIndex, uint256 amount, uint256 root);
    event PrivateTransaction(uint256 indexed nullifier0, uint256 indexed nullifier1, uint256 outputCommitment0, uint256 outputCommitment1, uint32 outputLeafIndex0, uint32 outputLeafIndex1, uint256 publicAmount, address recipient, uint256 root, bytes encryptedOutput0, bytes encryptedOutput1);

    constructor(address verifier_, address hasher_, address noteHasher_, uint256 zeroValue_) {
        if (verifier_ == address(0) || hasher_ == address(0) || noteHasher_ == address(0)) revert InvalidRecipient();
        if (zeroValue_ >= SNARK_SCALAR_FIELD) revert FieldOverflow();
        verifier = IGroth16Verifier(verifier_);
        hasher = IPoseidonT3(hasher_);
        noteHasher = IPoseidonT6(noteHasher_);
        uint256 currentZero = zeroValue_;
        for (uint32 i; i < TREE_DEPTH; ++i) {
            zeros[i] = currentZero;
            filledSubtrees[i] = currentZero;
            currentZero = _hashLeftRight(currentZero, currentZero);
        }
        roots[0] = currentZero;
    }

    function shield(uint256 ownerPublicKey, uint256 rho, uint256 randomness) external payable nonReentrant returns (uint32 leafIndex) {
        if (msg.value == 0) revert InvalidCommitment();
        if (msg.value > MAX_NOTE_VALUE) revert FieldOverflow();
        if (ownerPublicKey >= SNARK_SCALAR_FIELD || rho >= SNARK_SCALAR_FIELD || randomness >= SNARK_SCALAR_FIELD) revert FieldOverflow();
        uint256 commitment = _noteCommitment(0, msg.value, ownerPublicKey, rho, randomness);
        leafIndex = _insert(commitment);
        emit Shielded(commitment, leafIndex, msg.value, roots[currentRootIndex]);
    }

    /// Public signals: root, two nullifiers, two output commitments, public amount, recipient, asset id.
    function transact(uint256[2] calldata a, uint256[2][2] calldata b, uint256[2] calldata c, uint256[8] calldata publicSignals, bytes calldata encryptedOutput0, bytes calldata encryptedOutput1) external nonReentrant {
        if (encryptedOutput0.length > MAX_ENCRYPTED_OUTPUT_BYTES || encryptedOutput1.length > MAX_ENCRYPTED_OUTPUT_BYTES) revert EncryptedOutputTooLarge();
        uint256 root = publicSignals[0];
        uint256 nullifier0 = publicSignals[1];
        uint256 nullifier1 = publicSignals[2];
        uint256 output0 = publicSignals[3];
        uint256 output1 = publicSignals[4];
        uint256 publicAmount = publicSignals[5];
        uint256 recipientSignal = publicSignals[6];
        uint256 assetId = publicSignals[7];
        for (uint256 i; i < publicSignals.length; ++i) if (publicSignals[i] >= SNARK_SCALAR_FIELD) revert FieldOverflow();
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (assetId != 0) revert UnsupportedAsset();
        if (nullifier0 == 0 && nullifier1 == 0) revert InvalidProof();
        if (nullifier0 != 0 && nullifierSpent[nullifier0]) revert NullifierAlreadySpent();
        if (nullifier1 != 0 && nullifierSpent[nullifier1]) revert NullifierAlreadySpent();
        if (nullifier0 != 0 && nullifier0 == nullifier1) revert NullifierAlreadySpent();
        if (!verifier.verifyProof(a, b, c, publicSignals)) revert InvalidProof();
        if (nullifier0 != 0) nullifierSpent[nullifier0] = true;
        if (nullifier1 != 0) nullifierSpent[nullifier1] = true;
        uint32 outputLeafIndex0 = _insert(output0);
        uint32 outputLeafIndex1 = _insert(output1);
        address recipient = address(uint160(recipientSignal));
        if (publicAmount != 0) {
            if (recipient == address(0) || recipientSignal != uint256(uint160(recipient))) revert InvalidRecipient();
            (bool ok,) = recipient.call{value: publicAmount}("");
            if (!ok) revert TransferFailed();
        }
        emit PrivateTransaction(nullifier0, nullifier1, output0, output1, outputLeafIndex0, outputLeafIndex1, publicAmount, recipient, roots[currentRootIndex], encryptedOutput0, encryptedOutput1);
    }

    function currentRoot() external view returns (uint256) { return roots[currentRootIndex]; }

    function isKnownRoot(uint256 root) public view returns (bool) {
        if (root == 0) return false;
        uint32 index = currentRootIndex;
        for (uint32 i; i < ROOT_HISTORY_SIZE; ++i) {
            if (roots[index] == root) return true;
            if (index == 0) index = ROOT_HISTORY_SIZE - 1;
            else { unchecked { --index; } }
        }
        return false;
    }

    function _insert(uint256 commitment) internal returns (uint32 leafIndex) {
        if (commitment == 0 || commitment >= SNARK_SCALAR_FIELD) revert InvalidCommitment();
        if (commitmentInserted[commitment]) revert CommitmentAlreadyInserted();
        leafIndex = nextLeafIndex;
        if (leafIndex >= uint32(1 << TREE_DEPTH)) revert TreeFull();
        uint256 currentHash = commitment;
        uint32 index = leafIndex;
        for (uint32 level; level < TREE_DEPTH; ++level) {
            if (index & 1 == 0) {
                filledSubtrees[level] = currentHash;
                currentHash = _hashLeftRight(currentHash, zeros[level]);
            } else {
                currentHash = _hashLeftRight(filledSubtrees[level], currentHash);
            }
            index >>= 1;
        }
        commitmentInserted[commitment] = true;
        nextLeafIndex = leafIndex + 1;
        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = currentHash;
    }

    function _noteCommitment(uint256 assetId, uint256 value, uint256 ownerPublicKey, uint256 rho, uint256 randomness) internal view returns (uint256) {
        return noteHasher.poseidon([assetId, value, ownerPublicKey, rho, randomness]);

    }

    function _hashLeftRight(uint256 left, uint256 right) internal view returns (uint256) { return hasher.poseidon([left, right]); }
}