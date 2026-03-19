import { ethers } from "ethers";

export const RISK_REGISTRY_ABI = [
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

  let provider;
  if (typeof window !== "undefined" && window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else if (process.env.NEXT_PUBLIC_RPC_URL) {
    provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  } else {
    throw new Error("Wallet or NEXT_PUBLIC_RPC_URL is required.");
  }

  const registry = new ethers.Contract(registryAddress, RISK_REGISTRY_ABI, provider);
  const risk = await registry.getRisk(contractAddress);

  return {
    score: Number(risk.score),
    level: risk.level,
    summary: risk.summary,
    timestamp: Number(risk.timestamp),
  };
}
