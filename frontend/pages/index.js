import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import RiskHistoryChart, { RISK_HISTORY_EXAMPLE_DATA } from "../components/RiskHistoryChart";
import WarningModal from "../components/WarningModal";
import RecentFlags from "../components/RecentFlags";
import SafeLeaderboard from "../components/SafeLeaderboard";
import AppLogo from "../components/AppLogo";
import { getRiskOnchain, submitRiskOnchain } from "../lib/riskRegistry";

const levelColors = {
  LOW: "#198754",
  MEDIUM: "#fd7e14",
  HIGH: "#dc3545",
};

const RISK_HISTORY_STORAGE_KEY = "rugpull-guard-history";
const HIGH_RISK_THRESHOLD = 70;
const BLOCKED_WARNING_TEXT = "⚠️ This contract is high risk. Transaction blocked.";

function riskRingStyle(score) {
  const color = score >= 70 ? levelColors.HIGH : score >= 35 ? levelColors.MEDIUM : levelColors.LOW;
  return {
    background: `conic-gradient(${color} ${score * 3.6}deg, #e9ecef 0deg)`,
  };
}

function readAllHistory() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RISK_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function appendHistory(contractAddress, entry) {
  if (typeof window === "undefined") return;
  const all = readAllHistory();
  const key = contractAddress.toLowerCase();
  const existing = Array.isArray(all[key]) ? all[key] : [];
  all[key] = [...existing, entry];
  window.localStorage.setItem(RISK_HISTORY_STORAGE_KEY, JSON.stringify(all));
}

function getHistoryByContract(contractAddress) {
  if (!contractAddress || typeof window === "undefined") return [];
  const all = readAllHistory();
  return all[contractAddress.toLowerCase()] || [];
}

function createSimulatedTxResult() {
  const txPayload = {
    to: ethers.ZeroAddress,
    value: 0,
    data: "0x",
    nonce: Math.floor(Date.now() / 1000),
  };

  const digest = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(txPayload)));
  return {
    hash: digest,
    payload: txPayload,
    simulated: true,
  };
}

export default function Home() {
  const [contractAddress, setContractAddress] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [onchainRisk, setOnchainRisk] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [autoBlockEnabled, setAutoBlockEnabled] = useState(true);
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  useEffect(() => {
    if (ethers.isAddress(contractAddress)) {
      setRiskHistory(getHistoryByContract(contractAddress));
    } else {
      setRiskHistory([]);
    }
  }, [contractAddress]);

  const levelColor = useMemo(() => {
    if (!analysis?.level) return "#6c757d";
    return levelColors[analysis.level] || "#6c757d";
  }, [analysis]);

  const currentRiskScore = useMemo(() => {
    if (typeof analysis?.score === "number") return analysis.score;
    if (typeof onchainRisk?.score === "number") return onchainRisk.score;
    return null;
  }, [analysis, onchainRisk]);

  async function runProtectedTransaction(txName, txAction) {
    if (!ethers.isAddress(contractAddress)) {
      setMessage("Please enter a valid contract address.");
      return;
    }

    const riskScore = currentRiskScore;
    if (autoBlockEnabled && typeof riskScore === "number" && riskScore > HIGH_RISK_THRESHOLD) {
      setIsWarningOpen(true);
      setMessage(`${txName} blocked by Auto-Block Mode (score ${riskScore}).`);
      return;
    }

    await txAction();
  }

  async function scanContract() {
    setMessage("");
    setOnchainRisk(null);

    if (!ethers.isAddress(contractAddress)) {
      setMessage("Please enter a valid contract address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Scan failed.");
      }

      setAnalysis(data);
      const historyEntry = {
        score: data.score,
        level: data.level,
        source: "analysis",
        timestamp: Math.floor(Date.now() / 1000),
      };
      appendHistory(contractAddress, historyEntry);
      setRiskHistory(getHistoryByContract(contractAddress));
      setMessage("Scan complete.");
    } catch (error) {
      setMessage(error.message || "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  async function storeOnchain() {
    if (!analysis) {
      setMessage("Run a scan first.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await runProtectedTransaction("submitRisk", async () => {
        const result = await submitRiskOnchain({
          contractAddress,
          score: analysis.score,
          level: analysis.level,
          summary: analysis.summary,
        });

        const historyEntry = {
          score: analysis.score,
          level: analysis.level,
          source: "storeOnchain",
          timestamp: Math.floor(Date.now() / 1000),
        };
        appendHistory(contractAddress, historyEntry);
        setRiskHistory(getHistoryByContract(contractAddress));
        setMessage(`Stored onchain. Tx: ${result.txHash}`);
      });
    } catch (error) {
      setMessage(error.message || "Onchain store failed.");
    } finally {
      setLoading(false);
    }
  }

  async function simulateTransaction() {
    setLoading(true);
    setMessage("");
    try {
      await runProtectedTransaction("Simulated transfer", async () => {
        const simulatedTx = createSimulatedTxResult();
        setMessage(`Simulated transaction allowed. Hash: ${simulatedTx.hash}`);
      });
    } catch (error) {
      setMessage(error.message || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function checkOnchain() {
    setLoading(true);
    setMessage("");
    try {
      if (!ethers.isAddress(contractAddress)) {
        throw new Error("Please enter a valid contract address.");
      }
      const risk = await getRiskOnchain(contractAddress);
      setOnchainRisk(risk);
      appendHistory(contractAddress, {
        score: risk.score,
        level: risk.level,
        source: "checkOnchain",
        timestamp: risk.timestamp || Math.floor(Date.now() / 1000),
      });
      setRiskHistory(getHistoryByContract(contractAddress));
      setMessage("Fetched onchain risk.");
    } catch (error) {
      setMessage(error.message || "Onchain fetch failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card">
        <div className="brandHeader">
          <AppLogo variant="icon" />
          <div>
            <h1>RugPull Guard</h1>
            <p className="muted">Scan contracts with AI, then persist risk results onchain.</p>
          </div>
        </div>
        <AppLogo variant="full" />

        <div className="autoBlockRow">
          <span className="autoBlockLabel">Auto-Block Mode</span>
          <label className="switch" aria-label="Toggle auto block mode">
            <input
              type="checkbox"
              checked={autoBlockEnabled}
              onChange={(e) => setAutoBlockEnabled(e.target.checked)}
            />
            <span className="slider" />
          </label>
          <span className={autoBlockEnabled ? "toggleState on" : "toggleState off"}>
            {autoBlockEnabled ? "ON" : "OFF"}
          </span>
        </div>

        <div className="formRow">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value.trim())}
            placeholder="0x... contract address"
            className="addressInput"
          />
          <button onClick={scanContract} disabled={loading}>Scan Contract</button>
        </div>

        {analysis && (
          <div className="analysisWrap">
            <div className="ring" style={riskRingStyle(analysis.score)}>
              <div className="ringInner">{analysis.score}</div>
            </div>

            <div className="analysisText">
              <div className="pill" style={{ backgroundColor: levelColor }}>
                {analysis.level} RISK
              </div>
              <p><strong>Summary:</strong> {analysis.summary}</p>
              <div className="actions">
                <button onClick={storeOnchain} disabled={loading}>Store Onchain</button>
                <button onClick={checkOnchain} disabled={loading} className="secondary">Check Onchain</button>
                <button onClick={simulateTransaction} disabled={loading} className="secondary">Simulate Tx</button>
              </div>
            </div>
          </div>
        )}

        {onchainRisk && (
          <div className="onchainBox">
            <h3>Onchain Risk Data</h3>
            <p><strong>Score:</strong> {onchainRisk.score}</p>
            <p><strong>Level:</strong> {onchainRisk.level || "N/A"}</p>
            <p><strong>Summary:</strong> {onchainRisk.summary || "N/A"}</p>
            <p><strong>Timestamp:</strong> {onchainRisk.timestamp ? new Date(onchainRisk.timestamp * 1000).toLocaleString() : "N/A"}</p>
          </div>
        )}

        <RiskHistoryChart history={riskHistory.length ? riskHistory : RISK_HISTORY_EXAMPLE_DATA} />

        <RecentFlags />

        <SafeLeaderboard />

        {message && <p className="status">{message}</p>}
      </section>

      <WarningModal
        open={isWarningOpen}
        message={BLOCKED_WARNING_TEXT}
        onClose={() => setIsWarningOpen(false)}
      />
    </main>
  );
}
