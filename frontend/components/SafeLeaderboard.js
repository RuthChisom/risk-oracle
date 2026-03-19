import { useEffect, useState } from "react";
import { fetchSafestContracts } from "../lib/riskRegistry";

export default function SafeLeaderboard() {
  const [safest, setSafest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchSafestContracts({ limit: 10 });
        setSafest(data);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="onchainBox muted italic">Loading Safest Contracts...</div>;
  if (!safest.length) return null;

  return (
    <div className="onchainBox">
      <h3 style={{ color: "#198754" }}>🛡️ Safest Contracts Leaderboard</h3>
      <div className="leaderboardContainer">
        <table className="leaderboardTable">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Contract Address</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {safest.map((item, index) => (
              <tr key={item.contractAddr}>
                <td><strong>#{index + 1}</strong></td>
                <td className="addr">{item.contractAddr}</td>
                <td className="score green">{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .leaderboardContainer {
          overflow-x: auto;
          margin-top: 1rem;
        }
        .leaderboardTable {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th, td {
          padding: 0.75rem;
          border-bottom: 1px solid #eee;
        }
        th {
          font-size: 0.85rem;
          text-transform: uppercase;
          color: #666;
        }
        .addr {
          font-family: monospace;
          font-size: 0.9rem;
          color: #555;
        }
        .score.green {
          color: #198754;
          font-weight: bold;
        }
        .italic { font-style: italic; }
      `}</style>
    </div>
  );
}
