// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title RiskRegistry
/// @notice On-chain registry for AI-generated rug pull risk assessments.
/// @dev SCANNER_ROLE can submit scores, owner can pause/unpause, and AccessControl admins can manage scanner permissions.
contract RiskRegistry is AccessControl, Ownable, Pausable {
    bytes32 public constant SCANNER_ROLE = keccak256("SCANNER_ROLE");

    struct RiskData {
        uint256 score; // 0 - 100
        string level; // "LOW", "MEDIUM", "HIGH"
        string summary; // short explanation of risks
        uint256 timestamp;
    }

    /// @notice Latest risk data keyed by smart contract address.
    mapping(address => RiskData) public risks;

    event RiskSubmitted(address indexed contractAddr, uint256 score, string level);

    constructor() Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SCANNER_ROLE, msg.sender);
    }

    /// @notice Submit or update risk data for a contract address.
    /// @param contractAddr Target contract being scored.
    /// @param score Risk score from 0 to 100 (inclusive).
    /// @param level Risk level: LOW, MEDIUM, or HIGH.
    /// @param summary Short explanation of identified risk factors.
    function submitRisk(
        address contractAddr,
        uint256 score,
        string calldata level,
        string calldata summary
    ) external onlyRole(SCANNER_ROLE) whenNotPaused {
        require(contractAddr != address(0), "RiskRegistry: zero contract address");
        require(score <= 100, "RiskRegistry: score out of range");
        require(_isValidLevel(level), "RiskRegistry: invalid risk level");
        require(bytes(summary).length > 0, "RiskRegistry: empty summary");

        risks[contractAddr] = RiskData({
            score: score,
            level: level,
            summary: summary,
            timestamp: block.timestamp
        });

        emit RiskSubmitted(contractAddr, score, level);
    }

    /// @notice Read the latest risk data for a contract address.
    /// @param contractAddr Target contract address.
    function getRisk(address contractAddr) external view returns (RiskData memory) {
        return risks[contractAddr];
    }

    /// @notice Pause risk submissions.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume risk submissions.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Validates accepted categorical risk levels.
    function _isValidLevel(string calldata level) internal pure returns (bool) {
        bytes32 levelHash = keccak256(bytes(level));
        return
            levelHash == keccak256(bytes("LOW")) ||
            levelHash == keccak256(bytes("MEDIUM")) ||
            levelHash == keccak256(bytes("HIGH"));
    }
}
