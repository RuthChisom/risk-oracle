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

## Notes
- `submitRisk` will revert unless your connected wallet has `SCANNER_ROLE` in `RiskRegistry`.
- Analyzer API endpoint is `POST /api/analyze`.
