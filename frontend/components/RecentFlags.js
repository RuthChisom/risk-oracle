import { useEffect, useState } from "react";
import { fetchRecentHighRiskFlags } from "../lib/riskRegistry";

export default function RecentFlags() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRecentFlags() {
      setLoading(true);
      setError("");
      try {
        const records = await fetchRecentHighRiskFlags({ limit: 10 });
        if (active) setItems(records);
      } catch (err) {
        if (active) setError(err.message || "Failed to fetch recent flags.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecentFlags();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="onchainBox">
      <h3>Recently Flagged Contracts</h3>
      {loading && <p className="muted">Loading recent flags...</p>}
      {error && <p className="status">{error}</p>}
      {!loading && !error && !items.length && <p className="muted">No high-risk events found.</p>}

      {!!items.length && (
        <div className="flagsList">
          {items.map((item) => (
            <div className="flagCard" key={`${item.contractAddr}-${item.timestamp}-${item.blockNumber}`}>
              <p><strong>Contract:</strong> {item.contractAddr}</p>
              <p><strong>Risk Score:</strong> {item.score}</p>
              <p><strong>Timestamp:</strong> {new Date(item.timestamp * 1000).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
