const { ethers } = require("ethers");
const { analyzeContract } = require("../../../analyzer/analyzeContract");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contractAddress, contractInput } = req.body || {};

  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return res.status(400).json({ error: "A valid contractAddress is required." });
  }

  try {
    const analysisTarget = contractInput && typeof contractInput === "string"
      ? contractInput
      : contractAddress;

    const result = analyzeContract(analysisTarget);

    return res.status(200).json({
      ...result,
      summary:
        contractInput && contractInput.trim()
          ? result.summary
          : `${result.summary} (Tip: send ABI/source as contractInput for a richer scan.)`,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to analyze contract.",
      details: error.message,
    });
  }
}
