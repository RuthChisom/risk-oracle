import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function RiskHistoryChart({ history = [] }) {
  if (!history.length) {
    return (
      <div className="onchainBox">
        <h3>Risk History</h3>
        <p className="muted">No history yet. Scan/store/check to build timeline.</p>
      </div>
    );
  }

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  const data = {
    labels: sorted.map((item) => new Date(item.timestamp * 1000).toLocaleString()),
    datasets: [
      {
        label: "Risk Score",
        data: sorted.map((item) => item.score),
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13, 110, 253, 0.2)",
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top" },
      tooltip: {
        callbacks: {
          label(context) {
            const score = context.parsed.y;
            const label = context.label;
            return `Score: ${score} | Date: ${label}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Timestamp" },
      },
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: "Risk Score" },
        ticks: { stepSize: 10 },
      },
    },
  };

  return (
    <div className="onchainBox chartBox">
      <h3>Risk History</h3>
      <Line data={data} options={options} />
    </div>
  );
}

export const RISK_HISTORY_EXAMPLE_DATA = [
  { timestamp: 1710000000, score: 22 },
  { timestamp: 1710500000, score: 47 },
  { timestamp: 1711000000, score: 68 },
  { timestamp: 1711500000, score: 51 },
];
