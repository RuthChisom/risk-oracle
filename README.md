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

## Foundry test and deployment files

- Tests: `test/RiskRegistry.t.sol`
- Deploy script: `script/DeployRiskRegistry.s.sol`
- Foundry config: `foundry.toml`

## Deploy with Foundry

1. Initialize Foundry in this repo (skip if already initialized):

```bash
forge init --no-commit .
```

2. Install dependencies:

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

3. Run tests:

```bash
forge test
```

4. Build the contracts:

```bash
forge build
```

5. Set environment variables:

```bash
export PRIVATE_KEY=<your_private_key>
export RPC_URL=<your_rpc_url>
```

6. Deploy with script:

```bash
forge script script/DeployRiskRegistry.s.sol:DeployRiskRegistry \
  --rpc-url $RPC_URL \
  --broadcast
```

7. (Optional) Verify contract after deployment:

```bash
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  src/RiskRegistry.sol:RiskRegistry \
  --chain-id <CHAIN_ID> \
  --etherscan-api-key <ETHERSCAN_API_KEY>
```
### Deployed to 0x81AeC0B87CAa631365B0AC0B628A84afdf6f1Fe9 on Polkadot