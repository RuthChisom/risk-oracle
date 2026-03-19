import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { ethers } from "ethers";
import RiskHistoryChart, { RISK_HISTORY_EXAMPLE_DATA } from "../components/RiskHistoryChart";
import WarningModal from "../components/WarningModal";
import RecentFlags from "../components/RecentFlags";
import SafeLeaderboard from "../components/SafeLeaderboard";
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
  return { hash: digest, payload: txPayload, simulated: true };
}

export default function Home() {
  const [contractAddress, setContractAddress] = useState("");
  const [contractInput, setContractInput] = useState("");
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
        body: JSON.stringify({ contractAddress, contractInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed.");
      setAnalysis(data);
      appendHistory(contractAddress, {
        score: data.score,
        level: data.level,
        source: "analysis",
        timestamp: Math.floor(Date.now() / 1000),
      });
      setRiskHistory(getHistoryByContract(contractAddress));
      setMessage(`Scan complete. Method: ${data.method || 'Unknown'}`);
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
    try {
      await runProtectedTransaction("submitRisk", async () => {
        const result = await submitRiskOnchain({
          contractAddress,
          score: analysis.score,
          level: analysis.level,
          summary: analysis.summary,
        });
        appendHistory(contractAddress, {
          score: analysis.score,
          level: analysis.level,
          source: "storeOnchain",
          timestamp: Math.floor(Date.now() / 1000),
        });
        setRiskHistory(getHistoryByContract(contractAddress));
        setMessage(`Stored onchain. Tx: ${result.txHash.slice(0, 10)}...`);
      });
    } catch (error) {
      setMessage(error.message || "Onchain store failed.");
    } finally {
      setLoading(false);
    }
  }

  async function simulateTransaction() {
    setLoading(true);
    try {
      await runProtectedTransaction("Simulated transfer", async () => {
        const simulatedTx = createSimulatedTxResult();
        setMessage(`Simulated transaction allowed. Hash: ${simulatedTx.hash.slice(0, 10)}...`);
      });
    } catch (error) {
      setMessage(error.message || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function checkOnchain() {
    setLoading(true);
    try {
      if (!ethers.isAddress(contractAddress)) throw new Error("Enter a valid address.");
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
    <div className="dashboard">
      <Head>
        <title>RiskOracle Dashboard</title>
        <link rel="icon" href="/branding/riskoracle-combined.png" />
      </Head>

      <header className="header">
        <div className="logo-wrap">
          <img src="/branding/riskoracle-combined.png" alt="Logo" className="logo-image" />
          <span className="logo-text">RiskOracle</span>
        </div>
        <div className="autoBlockRow">
          <span className="autoBlockLabel">Auto-Block</span>
          <label className="switch">
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
      </header>

      <aside className="left-col">
        <section className="card scanner-box">
          <h3>🔍 Contract Scanner</h3>
          <div className="formRow">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value.trim())}
              placeholder="0x... contract address"
              className="addressInput"
            />
          </div>
          <textarea
            value={contractInput}
            onChange={(e) => setContractInput(e.target.value)}
            placeholder="Optional: Paste Source Code or ABI here..."
            style={{ width: '100%', height: '80px', marginBottom: '1rem', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
          />
          <button onClick={scanContract} disabled={loading} style={{ width: '100%' }}>Scan Contract</button>

          {analysis && (
            <div className="analysisWrap" style={{ marginTop: '1.5rem' }}>
              <div className="ring" style={riskRingStyle(analysis.score)}>
                <div className="ringInner">{analysis.score}</div>
              </div>
              <div className="analysisText">
                <div className="pill" style={{ backgroundColor: levelColor }}>
                  {analysis.level} RISK
                </div>
                <p style={{fontSize: '0.85rem'}}><strong>Summary:</strong> {analysis.summary}</p>
                <div className="actions">
                  <button onClick={storeOnchain} disabled={loading}>Store</button>
                  <button onClick={checkOnchain} disabled={loading} className="secondary">Check</button>
                  <button onClick={simulateTransaction} disabled={loading} className="secondary">Simulate</button>
                </div>
              </div>
            </div>
          )}
          {message && <p className="status">{message}</p>}
        </section>

        <section className="card">
          <h3>📈 Risk History</h3>
          <RiskHistoryChart history={riskHistory.length ? riskHistory : RISK_HISTORY_EXAMPLE_DATA} />
        </section>

        {onchainRisk && (
          <section className="card">
            <h3>🔗 Onchain Verification</h3>
            <div className="onchainBox">
              <p><strong>Score:</strong> {onchainRisk.score} | <strong>Level:</strong> {onchainRisk.level || "N/A"}</p>
              <p><strong>Summary:</strong> {onchainRisk.summary || "N/A"}</p>
              <p style={{fontSize: '0.75rem', marginTop: '0.5rem'}} className="muted">
                Last updated: {onchainRisk.timestamp ? new Date(onchainRisk.timestamp * 1000).toLocaleString() : "N/A"}
              </p>
            </div>
          </section>
        )}
      </aside>

      <main className="right-col">
        <section className="card">
          <RecentFlags />
        </section>
        <section className="card">
          <SafeLeaderboard />
        </section>
      </main>

      <WarningModal
        open={isWarningOpen}
        message={BLOCKED_WARNING_TEXT}
        onClose={() => setIsWarningOpen(false)}
      />
    </div>
  );
}
