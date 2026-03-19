import { ethers } from "ethers";

export const RISK_REGISTRY_ABI = [
  "event RiskSubmitted(address indexed contractAddr,uint256 score,string level)",
  "function submitRisk(address contractAddr,uint256 score,string level,string summary)",
  "function getRisk(address contractAddr) view returns (tuple(uint256 score,string level,string summary,uint256 timestamp))",
];

export function getRiskRegistryAddress() {
  return process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS || "";
}

export async function getBrowserProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is required for wallet interactions.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider;
}

function getReadProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }

  if (process.env.NEXT_PUBLIC_RPC_URL) {
    return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  }

  throw new Error("Wallet or NEXT_PUBLIC_RPC_URL is required.");
}

export async function submitRiskOnchain({ contractAddress, score, level, summary }) {
  const registryAddress = getRiskRegistryAddress();
  if (!registryAddress) {
    throw new Error("Missing NEXT_PUBLIC_RISK_REGISTRY_ADDRESS");
  }

  const provider = await getBrowserProvider();
  const signer = await provider.getSigner();
  const registry = new ethers.Contract(registryAddress, RISK_REGISTRY_ABI, signer);

  const tx = await registry.submitRisk(contractAddress, score, level, summary);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getRiskOnchain(contractAddress) {
  const registryAddress = getRiskRegistryAddress();
  if (!registryAddress) {
    throw new Error("Missing NEXT_PUBLIC_RISK_REGISTRY_ADDRESS");
  }

  const provider = getReadProvider();
  const registry = new ethers.Contract(registryAddress, RISK_REGISTRY_ABI, provider);
  const risk = await registry.getRisk(contractAddress);

  return {
    score: Number(risk.score),
    level: risk.level,
    summary: risk.summary,
    timestamp: Number(risk.timestamp),
  };
}

export async function fetchRecentHighRiskFlags({ limit = 10, fromBlock = -10000 } = {}) {
  const registryAddress = getRiskRegistryAddress();
  if (!registryAddress) {
    throw new Error("Missing NEXT_PUBLIC_RISK_REGISTRY_ADDRESS");
  }

  const provider = getReadProvider();
  const registry = new ethers.Contract(registryAddress, RISK_REGISTRY_ABI, provider);

  const latestBlock = await provider.getBlockNumber();
  const startBlock = fromBlock < 0 ? Math.max(0, latestBlock + fromBlock) : fromBlock;

  const filter = registry.filters.RiskSubmitted();
  const events = await registry.queryFilter(filter, startBlock, latestBlock);

  const enriched = await Promise.all(
    events.map(async (event) => {
      const block = await provider.getBlock(event.blockNumber);
      return {
        contractAddr: event.args.contractAddr,
        score: Number(event.args.score),
        level: event.args.level,
        timestamp: Number(block?.timestamp || 0),
        blockNumber: event.blockNumber,
      };
    })
  );

  return enriched
    .filter((item) => item.score > 70)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}


export async function fetchSafestContracts({ limit = 10, fromBlock = -10000 } = {}) {
  const registryAddress = getRiskRegistryAddress();
  if (!registryAddress) {
    throw new Error("Missing NEXT_PUBLIC_RISK_REGISTRY_ADDRESS");
  }

  const provider = getReadProvider();
  const registry = new ethers.Contract(registryAddress, RISK_REGISTRY_ABI, provider);

  const latestBlock = await provider.getBlockNumber();
  const startBlock = fromBlock < 0 ? Math.max(0, latestBlock + fromBlock) : fromBlock;

  const events = await registry.queryFilter(registry.filters.RiskSubmitted(), startBlock, latestBlock);
  const uniqueAddresses = [...new Set(events.map((event) => event.args.contractAddr.toLowerCase()))];

  const risks = await Promise.all(
    uniqueAddresses.map(async (addr) => {
      const risk = await registry.getRisk(addr);
      return {
        contractAddr: addr,
        score: Number(risk.score),
        level: risk.level,
      };
    })
  );

  return risks
    .filter((item) => item.score < 30)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
