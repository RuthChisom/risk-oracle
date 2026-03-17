// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RiskRegistry} from "src/RiskRegistry.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RiskRegistryTest is Test {
    RiskRegistry internal registry;

    address internal owner = address(this);
    address internal scanner = makeAddr("scanner");
    address internal outsider = makeAddr("outsider");
    address internal target = makeAddr("target");

    function setUp() external {
        registry = new RiskRegistry();
        registry.grantRole(registry.SCANNER_ROLE(), scanner);
    }

    function testConstructorGrantsAdminAndScannerRoleToOwner() external view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(registry.hasRole(registry.SCANNER_ROLE(), owner));
    }

    function testSubmitRiskByScannerStoresDataAndEmitsEvent() external {
        vm.expectEmit(true, false, false, true);
        emit RiskRegistry.RiskSubmitted(target, 78, "MEDIUM");

        vm.prank(scanner);
        registry.submitRisk(target, 78, "MEDIUM", "Liquidity lock ends soon");

        (uint256 score, string memory level, string memory summary, uint256 timestamp) = registry.getRisk(target);

        assertEq(score, 78);
        assertEq(level, "MEDIUM");
        assertEq(summary, "Liquidity lock ends soon");
        assertEq(timestamp, block.timestamp);
    }

    function testSubmitRiskRevertsForNonScanner() external {
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(
                AccessControl.AccessControlUnauthorizedAccount.selector,
                outsider,
                registry.SCANNER_ROLE()
            )
        );
        registry.submitRisk(target, 30, "LOW", "No material concerns");
    }

    function testSubmitRiskRevertsForInvalidScore() external {
        vm.prank(scanner);
        vm.expectRevert("RiskRegistry: score out of range");
        registry.submitRisk(target, 101, "HIGH", "Score above max");
    }

    function testSubmitRiskRevertsForInvalidLevel() external {
        vm.prank(scanner);
        vm.expectRevert("RiskRegistry: invalid risk level");
        registry.submitRisk(target, 50, "CRITICAL", "Unknown level");
    }

    function testSubmitRiskRevertsForEmptySummary() external {
        vm.prank(scanner);
        vm.expectRevert("RiskRegistry: empty summary");
        registry.submitRisk(target, 50, "LOW", "");
    }

    function testSubmitRiskRevertsForZeroTarget() external {
        vm.prank(scanner);
        vm.expectRevert("RiskRegistry: zero contract address");
        registry.submitRisk(address(0), 50, "LOW", "Invalid target");
    }

    function testPauseAndUnpauseByOwner() external {
        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
    }

    function testPauseAndUnpauseRevertForNonOwner() external {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, outsider));
        registry.pause();

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, outsider));
        registry.unpause();
    }

    function testSubmitRiskRevertsWhenPaused() external {
        registry.pause();

        vm.prank(scanner);
        vm.expectRevert(); // OZ Pausable custom error depends on version
        registry.submitRisk(target, 60, "MEDIUM", "Trading tax is mutable");
    }
}
