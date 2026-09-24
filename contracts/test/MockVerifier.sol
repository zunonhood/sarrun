// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {IGroth16Verifier} from "../interfaces/IGroth16Verifier.sol";
contract MockVerifier is IGroth16Verifier {
    bool public result = true;
    function setResult(bool result_) external { result = result_; }
    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[8] calldata) external view returns (bool) { return result; }
}