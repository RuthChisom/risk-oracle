# RugPull Guard Frontend

Simple Next.js frontend for:
- scanning a contract with the backend analyzer
- storing risk via `submitRisk`
- checking stored risk via `getRisk`
- tracking risk history locally and displaying a line chart

## Run

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Risk history chart

`RiskHistoryChart` is implemented at `components/RiskHistoryChart.js` using Chart.js.

It expects data in this shape:

```js
[
  { timestamp: 1710000000, score: 22 },
  { timestamp: 1710500000, score: 47 },
  { timestamp: 1711000000, score: 68 }
]
```

- X-axis: timestamp (`toLocaleString()` rendering)
- Y-axis: risk score (`0-100`)
- Tooltip: `Score + Date`


## Auto-Block Mode

The scanner page includes an **Auto-Block ON/OFF** toggle.

Transaction interception logic:
- Before transaction actions (`submitRisk` and simulated transaction), the app checks current risk score.
- If `score > 70` and Auto-Block is ON, transaction is blocked and a warning modal appears:
  - `⚠️ This contract is high risk. Transaction blocked.`
- If Auto-Block is OFF, the same transaction is allowed (override).

Modal UI component: `components/WarningModal.js`.

## Contract integration example (Ethers.js)

```js
import { ethers } from "ethers";

const abi = [
  "function submitRisk(address contractAddr,uint256 score,string level,string summary)",
  "function getRisk(address contractAddr) view returns (tuple(uint256 score,string level,string summary,uint256 timestamp))"
];

const registryAddress = process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS;

// Write (requires SCANNER_ROLE)
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = await provider.getSigner();
const registryWithSigner = new ethers.Contract(registryAddress, abi, signer);
await registryWithSigner.submitRisk(targetContract, 82, "HIGH", "Owner and mint controls detected");

// Read
const registryRead = new ethers.Contract(registryAddress, abi, provider);
const risk = await registryRead.getRisk(targetContract);
console.log(risk.score, risk.level, risk.summary, Number(risk.timestamp));
```


## Smart contract event query example (RiskSubmitted)

```js
import { ethers } from "ethers";

const abi = [
  "event RiskSubmitted(address indexed contractAddr,uint256 score,string level)"
];

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
const registry = new ethers.Contract(process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS, abi, provider);

const latestBlock = await provider.getBlockNumber();
const events = await registry.queryFilter(registry.filters.RiskSubmitted(), latestBlock - 200000, latestBlock);

const highRisk = events
  .map((e) => ({
    contractAddr: e.args.contractAddr,
    score: Number(e.args.score),
    level: e.args.level,
    blockNumber: e.blockNumber,
  }))
  .filter((item) => item.score > 70)
  .slice(0, 10);

console.log(highRisk);
```

## Notes
- `submitRisk` will revert unless your connected wallet has `SCANNER_ROLE` in `RiskRegistry`.
- Analyzer API endpoint is `POST /api/analyze`.
