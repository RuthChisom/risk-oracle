import { useEffect, useState } from "react";
import { fetchSafestContracts } from "../lib/riskRegistry";

export default function SafeLeaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchSafestContracts({ limit: 10 });
        if (active) setRows(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to fetch safest contracts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="onchainBox">
      <h3>Safest Contracts Leaderboard</h3>
      {loading && <p className="muted">Loading leaderboard...</p>}
      {error && <p className="status">{error}</p>}
      {!loading && !error && !rows.length && <p className="muted">No LOW-risk contracts found.</p>}

      {!!rows.length && (
        <div className="leaderboardList">
          <div className="leaderboardHeader">
            <span>Rank</span>
            <span>Contract</span>
            <span>Score</span>
          </div>
          {rows.map((row) => (
            <div className="leaderboardRow" key={`${row.contractAddr}-${row.rank}`}>
              <span>#{row.rank}</span>
              <span>{row.contractAddr}</span>
              <span>{row.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
