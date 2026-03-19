// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RiskyContract is Ownable {
    mapping(address => uint256) public balances;
    mapping(address => bool) public isBlacklisted;

    constructor() Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        balances[to] += amount;
    }

    function setBlacklist(address account, bool value) external onlyOwner {
        isBlacklisted[account] = value;
    }

    function transfer(address to, uint256 amount) external {
        require(!isBlacklisted[msg.sender], "Sender is blacklisted");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
