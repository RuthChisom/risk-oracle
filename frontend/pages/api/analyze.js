const { ethers } = require("ethers");
const { OpenAI } = require("openai");
const { analyzeContract, RISK_ANALYZER_PROMPT_TEMPLATE } = require("../../../analyzer/analyzeContract");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});

// Demo Data Mapping
const DEMO_RISK_PROFILES = {
  risky: {
    score: 85,
    level: "HIGH",
    summary: "DEMO: This contract contains direct minting functions and blacklist capabilities controlled by a single owner. High rug-pull risk detected.",
    method: "DEMO_MODE"
  },
  medium: {
    score: 45,
    level: "MEDIUM",
    summary: "DEMO: Contract has an owner with administrative privileges but no direct minting or blacklist logic found. Exercise caution.",
    method: "DEMO_MODE"
  },
  safe: {
    score: 10,
    level: "LOW",
    summary: "DEMO: No owner or administrative privileges detected. Functions appear standard and decentralized.",
    method: "DEMO_MODE"
  }
};

async function fetchSourceFromEtherscan(address) {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "1" && data.result[0].SourceCode) return data.result[0].SourceCode;
  } catch (err) {
    console.error("Etherscan fetch failed:", err);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { contractAddress, contractInput } = req.body || {};

  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return res.status(400).json({ error: "A valid contractAddress is required." });
  }

  // --- DEMO MODE LOGIC ---
  const addrLower = contractAddress.toLowerCase();
  const inputLower = (contractInput || "").toLowerCase();

  // Trigger demo if keywords are found or for specific mock patterns
  let demoKey = null;
  if (inputLower.includes("mint") && inputLower.includes("blacklist")) demoKey = "risky";
  else if (inputLower.includes("owner")) demoKey = "medium";
  else if (inputLower.includes("safe") || addrLower.endsWith("abc")) demoKey = "safe"; 
  
  // Also check for explicit demo triggers in the address input
  if (addrLower.includes("666")) demoKey = "risky"; // Example: any address with 666 is 'risky'
  if (addrLower.includes("111")) demoKey = "safe";  // Example: any address with 111 is 'safe'

  if (demoKey && DEMO_RISK_PROFILES[demoKey]) {
    return res.status(200).json(DEMO_RISK_PROFILES[demoKey]);
  }
  // ------------------------

  try {
    let analysisTarget = contractInput && contractInput.trim() ? contractInput : null;
    let fetchMethod = "MANUAL_INPUT";

    if (!analysisTarget) {
      const fetchedSource = await fetchSourceFromEtherscan(contractAddress);
      if (fetchedSource) {
        analysisTarget = fetchedSource;
        fetchMethod = "ETHERSCAN_FETCH";
      } else {
        analysisTarget = contractAddress;
        fetchMethod = "ADDRESS_ONLY_FALLBACK";
      }
    }

    const heuristicResult = analyzeContract(analysisTarget);

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-...") {
      try {
        const prompt = RISK_ANALYZER_PROMPT_TEMPLATE.replace("{{CONTRACT_INPUT}}", analysisTarget);
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        const aiResult = JSON.parse(completion.choices[0].message.content);
        return res.status(200).json({
          ...aiResult,
          method: `AI-ENHANCED (${fetchMethod})`,
          heuristicScore: heuristicResult.score
        });
      } catch (aiError) {
        console.error("AI Analysis failed:", aiError);
      }
    }

    // Default Fallback
    return res.status(200).json({
      ...heuristicResult,
      method: `HEURISTIC (${fetchMethod})`,
      summary: fetchMethod === "ADDRESS_ONLY_FALLBACK" && heuristicResult.score === 0
        ? "No source code provided/found. Please paste Source Code in the box above for a real scan."
        : heuristicResult.summary
    });

  } catch (error) {
    return res.status(500).json({ error: "Analysis failed", details: error.message });
  }
}
