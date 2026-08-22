import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import StatCard from "../components/StatCard";
import { fetchAdminSummary } from "../api/adminApi";

const PIE_COLORS = ["#2e7d32", "#ba1a1a"];

export default function SummaryDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdminSummary();
      setSummary(res.data);
    } catch (err) {
      setError(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }

  const pieData = summary
    ? [
        { name: "Approved", value: summary.approvedReports },
        { name: "Rejected", value: summary.rejectedReports },
      ]
    : [];

  const barData = pieData;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Summary Dashboard</h1>
          <p className="text-on-surface-variant">Live overview of FloodGuard disaster response activity</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-on-surface-variant">Loading summary…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="crisis_alert" label="Active Disasters" value={summary?.activeDisasters ?? 0} tone="error" />
            <StatCard icon="groups" label="Affected Residents" value="—" tone="neutral" />
            <StatCard icon="volunteer_activism" label="Available Volunteers" value="—" tone="neutral" />
            <StatCard icon="pending_actions" label="Pending Reports" value={summary?.pendingReports ?? 0} tone="warning" />
            <StatCard icon="task_alt" label="Approved Reports" value={summary?.approvedReports ?? 0} tone="success" />
            <StatCard icon="cancel" label="Rejected Reports" value={summary?.rejectedReports ?? 0} tone="error" />
            <StatCard icon="checklist" label="Active Tasks" value="—" tone="neutral" />
            <StatCard icon="summarize" label="Total Reports" value={summary?.totalReports ?? 0} tone="primary" />
          </div>
          <p className="text-xs text-on-surface-variant -mt-2">
            "Affected Residents", "Available Volunteers" and "Active Tasks" will populate once the Volunteer &amp; Task
            Management modules are connected.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">
                Approved vs Rejected Reports
              </h2>
              {pieData.every((d) => d.value === 0) ? (
                <p className="text-on-surface-variant text-sm py-10 text-center">No reviewed reports yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">Report Type Counts</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
