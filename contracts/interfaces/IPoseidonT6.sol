// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
interface IPoseidonT6 { function poseidon(uint256[5] memory input) external pure returns (uint256); }