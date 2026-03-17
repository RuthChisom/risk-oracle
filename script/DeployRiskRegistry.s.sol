// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {RiskRegistry} from "src/RiskRegistry.sol";

contract DeployRiskRegistry is Script {
    function run() external returns (RiskRegistry deployed) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        deployed = new RiskRegistry();
        vm.stopBroadcast();
    }
}
