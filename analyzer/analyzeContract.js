/**
 * Simple heuristic rug-pull analyzer.
 *
 * Input can be:
 *  - Solidity source code string
 *  - ABI array
 *  - ABI JSON string
 *
 * Output shape:
 * {
 *   score: number (0-100),
 *   level: "LOW" | "MEDIUM" | "HIGH",
 *   summary: string
 * }
 */
function analyzeContract(input) {
  const normalized = normalizeInput(input);

  const flags = {
    ownerPrivileges: hasOwnerPrivileges(normalized),
    mintFunctions: hasMintCapabilities(normalized),
    blacklistCapability: hasBlacklistCapability(normalized),
    pausableTransfers: hasPausableTransfers(normalized),
    upgradeability: hasUpgradeability(normalized),
  };

  // Weighted, simple heuristics.
  let score = 0;
  if (flags.ownerPrivileges) score += 25;
  if (flags.mintFunctions) score += 25;
  if (flags.blacklistCapability) score += 20;
  if (flags.pausableTransfers) score += 15;
  if (flags.upgradeability) score += 15;

  // Clamp score to [0,100].
  score = Math.max(0, Math.min(100, score));

  const level = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

  const positives = [];
  if (flags.ownerPrivileges) positives.push("owner privileges detected");
  if (flags.mintFunctions) positives.push("mint capability detected");
  if (flags.blacklistCapability) positives.push("blacklist capability detected");
  if (flags.pausableTransfers) positives.push("pausable transfer controls detected");
  if (flags.upgradeability) positives.push("upgradeability/proxy pattern detected");

  const summary = positives.length
    ? `Risk signals: ${positives.join(", ")}.`
    : "No major rug-pull keywords detected by heuristic scan.";

  return {
    score,
    level,
    summary,
  };
}

/**
 * Prompt template for LLM-enhanced analysis.
 */
const RISK_ANALYZER_PROMPT_TEMPLATE = `You are an AI smart contract risk analyzer.

Task:
Analyze the provided Solidity code or ABI for rug-pull risks using these categories:
1) owner privileges
2) mint functions
3) blacklist capability
4) pausable transfers
5) upgradeability (proxy patterns)

Instructions:
- Use simple keyword and function-pattern evidence.
- Keep output concise and factual.
- Return strict JSON only in this shape:
{
  "score": number,
  "level": "LOW" | "MEDIUM" | "HIGH",
  "summary": "short human-readable explanation"
}

Input:
{{CONTRACT_INPUT}}
`;

function normalizeInput(input) {
  if (Array.isArray(input)) {
    // ABI array
    return abiToSearchText(input);
  }

  if (typeof input !== "string") {
    throw new TypeError("analyzeContract(input) expects Solidity code string, ABI JSON string, or ABI array");
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Input is empty");
  }

  // If string is JSON ABI, parse and normalize.
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return abiToSearchText(parsed);
    }
  } catch {
    // Treat as Solidity text
  }

  return trimmed.toLowerCase();
}

function abiToSearchText(abi) {
  return abi
    .map((item) => {
      const name = (item && item.name ? item.name : "").toLowerCase();
      const type = (item && item.type ? item.type : "").toLowerCase();
      const stateMutability = (item && item.stateMutability ? item.stateMutability : "").toLowerCase();
      return `${type} ${name} ${stateMutability}`;
    })
    .join(" ");
}

function hasOwnerPrivileges(text) {
  return matchesAny(text, [
    /onlyowner/,
    /owner\(/,
    /transferownership/,
    /renounceownership/,
    /accesscontrol/,
    /default_admin_role/,
    /grantrole/,
  ]);
}

function hasMintCapabilities(text) {
  return matchesAny(text, [/\bmint\b/, /_mint\(/, /mintto/, /minttokens/]);
}

function hasBlacklistCapability(text) {
  return matchesAny(text, [
    /blacklist/,
    /isblacklisted/,
    /setblacklist/,
    /blocklist/,
    /banaddress/,
    /denylist/,
  ]);
}

function hasPausableTransfers(text) {
  return matchesAny(text, [
    /pausable/,
    /whennotpaused/,
    /whenpaused/,
    /pause\(/,
    /unpause\(/,
    /_pause\(/,
  ]);
}

function hasUpgradeability(text) {
  return matchesAny(text, [
    /proxy/,
    /upgrade/,
    /upgradeto/,
    /uups/,
    /transparentupgradeableproxy/,
    /beaconproxy/,
    /delegatecall/,
    /implementation/,
    /initializer/,
  ]);
}

function matchesAny(text, regexList) {
  return regexList.some((rx) => rx.test(text));
}

module.exports = {
  analyzeContract,
  RISK_ANALYZER_PROMPT_TEMPLATE,
};
