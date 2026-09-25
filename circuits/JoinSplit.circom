pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

template MerkleRoot(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output root;
    signal hashes[depth + 1];
    signal left[depth];
    signal right[depth];
    component hashers[depth];
    hashes[0] <== leaf;
    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
        left[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        right[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        hashes[i + 1] <== hashers[i].out;
    }
    root <== hashes[depth];
}

template NoteCommitment() {
    signal input assetId;
    signal input value;
    signal input ownerPublicKey;
    signal input rho;
    signal input randomness;
    signal output commitment;
    component h = Poseidon(5);
    h.inputs[0] <== assetId;
    h.inputs[1] <== value;
    h.inputs[2] <== ownerPublicKey;
    h.inputs[3] <== rho;
    h.inputs[4] <== randomness;
    commitment <== h.out;
}

template JoinSplit(depth) {
    // This declaration order is the eight-field verifier ABI consumed by the Solana program.
    signal output rootOut;
    signal output nullifier0;
    signal output nullifier1;
    signal output outputCommitment0;
    signal output outputCommitment1;
    signal output publicAmountOut;
    signal output recipientOut;
    signal output assetIdOut;

    signal input root;
    signal input assetId;
    signal input publicAmount;
    signal input recipient;
    signal input inputEnabled[2];
    signal input inputValue[2];
    signal input inputOwnerSecret[2];
    signal input inputRho[2];
    signal input inputRandomness[2];
    signal input inputPathElements[2][depth];
    signal input inputPathIndices[2][depth];
    signal input outputValue[2];
    signal input outputOwnerPublicKey[2];
    signal input outputRho[2];
    signal input outputRandomness[2];

    component assetRange = Num2Bits(32);
    component publicAmountRange = Num2Bits(128);
    component recipientRange = Num2Bits(160);
    assetRange.in <== assetId;
    publicAmountRange.in <== publicAmount;
    recipientRange.in <== recipient;

    component ownerKeys[2];
    component inputNotes[2];
    component inputRanges[2];
    component paths[2];
    component nullifierHashes[2];
    signal nullifiers[2];
    for (var i = 0; i < 2; i++) {
        inputEnabled[i] * (inputEnabled[i] - 1) === 0;
        inputValue[i] * (1 - inputEnabled[i]) === 0;
        inputRanges[i] = Num2Bits(128);
        inputRanges[i].in <== inputValue[i];
        ownerKeys[i] = Poseidon(1);
        ownerKeys[i].inputs[0] <== inputOwnerSecret[i];
        inputNotes[i] = NoteCommitment();
        inputNotes[i].assetId <== assetId;
        inputNotes[i].value <== inputValue[i];
        inputNotes[i].ownerPublicKey <== ownerKeys[i].out;
        inputNotes[i].rho <== inputRho[i];
        inputNotes[i].randomness <== inputRandomness[i];
        paths[i] = MerkleRoot(depth);
        paths[i].leaf <== inputNotes[i].commitment;
        for (var j = 0; j < depth; j++) {
            paths[i].pathElements[j] <== inputPathElements[i][j];
            paths[i].pathIndices[j] <== inputPathIndices[i][j];
        }
        (paths[i].root - root) * inputEnabled[i] === 0;
        nullifierHashes[i] = Poseidon(2);
        nullifierHashes[i].inputs[0] <== inputNotes[i].commitment;
        nullifierHashes[i].inputs[1] <== inputOwnerSecret[i];
        nullifiers[i] <== nullifierHashes[i].out * inputEnabled[i];
    }

    component outputNotes[2];
    component outputRanges[2];
    for (var k = 0; k < 2; k++) {
        outputRanges[k] = Num2Bits(128);
        outputRanges[k].in <== outputValue[k];
        outputNotes[k] = NoteCommitment();
        outputNotes[k].assetId <== assetId;
        outputNotes[k].value <== outputValue[k];
        outputNotes[k].ownerPublicKey <== outputOwnerPublicKey[k];
        outputNotes[k].rho <== outputRho[k];
        outputNotes[k].randomness <== outputRandomness[k];
    }

    inputValue[0] + inputValue[1] === outputValue[0] + outputValue[1] + publicAmount;
    rootOut <== root;
    nullifier0 <== nullifiers[0];
    nullifier1 <== nullifiers[1];
    outputCommitment0 <== outputNotes[0].commitment;
    outputCommitment1 <== outputNotes[1].commitment;
    publicAmountOut <== publicAmount;
    recipientOut <== recipient;
    assetIdOut <== assetId;
}

component main = JoinSplit(20);