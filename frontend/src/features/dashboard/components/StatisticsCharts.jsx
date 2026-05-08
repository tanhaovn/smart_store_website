import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
);

const chartDefaultOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      labels: {
        color: "#475569",
        font: { size: 12, weight: "500" },
        usePointStyle: true,
        padding: 15,
      },
    },
  },
};

export function UserActivityChart({ users = [], orders = [], payments = [] }) {
  const data = {
    labels: ["Tổng User", "Đơn hàng", "Thanh toán"],
    datasets: [
      {
        label: "Số lượng",
        data: [users.length, orders.length, payments.length],
        borderColor: "#14b8a6",
        backgroundColor: "rgba(20, 184, 166, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: "#14b8a6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: "#0d9488",
      },
    ],
  };

  const options = {
    ...chartDefaultOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "#e2e8f0" },
        ticks: { color: "#64748b" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#64748b" },
      },
    },
  };

  return (
    <div style={{ position: "relative", height: "300px", padding: "1rem" }}>
      <Line data={data} options={options} />
    </div>
  );
}

export function PendingProductsChart({ pendingProducts = [], users = [] }) {
  const data = {
    labels: ["Chờ duyệt", "Người dùng"],
    datasets: [
      {
        label: "Số lượng",
        data: [pendingProducts.length, users.length],
        backgroundColor: ["#f97316", "#14b8a6"],
        borderColor: ["#ea580c", "#0d9488"],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: ["#fb923c", "#2dd4bf"],
      },
    ],
  };

  const options = {
    ...chartDefaultOptions,
    indexAxis: "y",
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#e2e8f0" },
        ticks: { color: "#64748b" },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#64748b" },
      },
    },
  };

  return (
    <div style={{ position: "relative", height: "250px", padding: "1rem" }}>
      <Bar data={data} options={options} />
    </div>
  );
}

export function OrderStatusChart({ orders = [] }) {
  const statusCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const data = {
    labels: ["Chờ xử lý", "Đang xử lý", "Hoàn thành", "Hủy"],
    datasets: [
      {
        data: [
          statusCounts.pending,
          statusCounts.processing,
          statusCounts.completed,
          statusCounts.cancelled,
        ],
        backgroundColor: ["#fbbf24", "#60a5fa", "#10b981", "#ef4444"],
        borderColor: ["#f59e0b", "#3b82f6", "#059669", "#dc2626"],
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    ...chartDefaultOptions,
    plugins: {
      ...chartDefaultOptions.plugins,
      legend: {
        ...chartDefaultOptions.plugins.legend,
        position: "bottom",
      },
    },
  };

  return (
    <div style={{ position: "relative", height: "300px", padding: "1rem" }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}

export function PaymentStatsChart({ payments = [] }) {
  const paymentMethods = {};
  payments.forEach((p) => {
    const method = p.payment_method || "Unknown";
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });

  const colors = [
    { bg: "#14b8a6", border: "#0d9488" },
    { bg: "#06b6d4", border: "#0891b2" },
    { bg: "#8b5cf6", border: "#7c3aed" },
    { bg: "#ec4899", border: "#db2777" },
    { bg: "#f59e0b", border: "#d97706" },
  ];

  const data = {
    labels: Object.keys(paymentMethods),
    datasets: [
      {
        label: "Giao dịch",
        data: Object.values(paymentMethods),
        backgroundColor: Object.keys(paymentMethods).map(
          (_, idx) => colors[idx % colors.length].bg,
        ),
        borderColor: Object.keys(paymentMethods).map(
          (_, idx) => colors[idx % colors.length].border,
        ),
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: Object.keys(paymentMethods).map(
          (_, idx) => colors[idx % colors.length].border,
        ),
      },
    ],
  };

  const options = {
    ...chartDefaultOptions,
    indexAxis: "y",
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#e2e8f0" },
        ticks: { color: "#64748b" },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#64748b" },
      },
    },
  };

  return (
    <div style={{ position: "relative", height: "250px", padding: "1rem" }}>
      <Bar data={data} options={options} />
    </div>
  );
}
