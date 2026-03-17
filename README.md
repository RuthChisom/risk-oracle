# risk-oracle

An onchain AI-powered risk oracle that detects and prevents rug pulls before they happen.

## RiskRegistry contract

`RiskRegistry` is a Solidity contract that stores AI-generated rug-pull risk assessments for target contracts.

### Features
- Uses OpenZeppelin `AccessControl`, `Ownable`, and `Pausable`
- Defines `SCANNER_ROLE` for approved risk scanners
- Stores risk results in `mapping(address => RiskData) public risks`
- Restricts `submitRisk` to scanners and only while unpaused
- Restricts `pause` / `unpause` to owner

### Contract source
- `src/RiskRegistry.sol`

## Deploy with Foundry

> Assumes you have Foundry installed (`foundryup`).

1. Initialize Foundry in this repo (skip if already initialized):

```bash
forge init --no-commit .
```

2. Install OpenZeppelin Contracts:

```bash
forge install OpenZeppelin/openzeppelin-contracts
```

3. Build the contracts:

```bash
forge build
```

4. Set environment variables:

```bash
export PRIVATE_KEY=<your_private_key>
export RPC_URL=<your_rpc_url>
```

5. Deploy `RiskRegistry`:

```bash
forge create src/RiskRegistry.sol:RiskRegistry \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

6. (Optional) Verify contract after deploy (example for Etherscan-compatible explorers):

```bash
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  src/RiskRegistry.sol:RiskRegistry \
  --chain-id <CHAIN_ID> \
  --etherscan-api-key <ETHERSCAN_API_KEY>
```
