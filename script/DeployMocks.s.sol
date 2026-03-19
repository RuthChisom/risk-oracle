// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SafeContract} from "../src/mocks/SafeContract.sol";
import {MediumContract} from "../src/mocks/MediumContract.sol";
import {RiskyContract} from "../src/mocks/RiskyContract.sol";

contract DeployMocks is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        SafeContract safe = new SafeContract();
        console.log("SafeContract deployed to:", address(safe));

        MediumContract medium = new MediumContract();
        console.log("MediumContract deployed to:", address(medium));

        RiskyContract risky = new RiskyContract();
        console.log("RiskyContract deployed to:", address(risky));

        vm.stopBroadcast();
    }
}
