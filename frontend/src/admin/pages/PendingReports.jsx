import { useContext, useEffect, useMemo, useState } from "react";
import ReportCard, { DISASTER_LABELS } from "../components/ReportCard";
import ReportModal from "../components/ReportModal";
import { fetchAllReports, approveReport, rejectReport, fetchAdminSummary } from "../api/adminApi";
import { generateAdminReportPdf } from "../utils/reportPdf";
import { AdminAuthContext } from "../context/AdminAuthContext";

const SEVERITY_TABS = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

export default function PendingReports() {
  const { admin } = useContext(AdminAuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityTab, setSeverityTab] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAllReports();
      setReports(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  const pending = useMemo(() => {
    const list = reports.filter((r) => r.approvalStatus === "pending");
    if (severityTab === "all") return list;
    return list.filter((r) => (r.severity || "medium") === severityTab);
  }, [reports, severityTab]);

  const reviewed = useMemo(
    () => reports.filter((r) => r.approvalStatus === "approved" || r.approvalStatus === "rejected"),
    [reports]
  );

  const handleApprove = async (id) => {
    await approveReport(id);
    await load();
  };

  const handleReject = async (id, reason) => {
    await rejectReport(id, reason);
    await load();
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError("");
    try {
      const summaryRes = await fetchAdminSummary();
      await generateAdminReportPdf({
        adminEmail: admin?.email,
        summary: summaryRes.data,
        reviewedReports: reviewed,
      });
    } catch (err) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Pending Reports</h1>
          <p className="text-on-surface-variant">Review resident-submitted disaster reports and verify their accuracy</p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity font-label-md disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          {generating ? "Generating..." : "Report Generate"}
        </button>
      </div>

      {error && (
        <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">{error}</div>
      )}

      {/* Severity filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {SEVERITY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSeverityTab(tab.key)}
            className={`px-4 py-2 rounded-full font-label-md text-sm transition-colors ${
              severityTab === tab.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-on-surface-variant">Loading reports…</div>
      ) : pending.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
          No pending reports in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pending.map((report) => (
            <ReportCard key={report._id} report={report} onClick={() => setSelectedReport(report)} />
          ))}
        </div>
      )}

      {/* Approved & Rejected table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.05)] overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Approve / Reject Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-high text-on-surface-variant text-left">
              <tr>
                {["Report ID", "Disaster", "Location", "Time", "Reported By", "Severity", "Description", "Status", "Update"].map((h) => (
                  <th key={h} className="px-4 py-3 font-label-md whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviewed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                    No reports have been approved or rejected yet.
                  </td>
                </tr>
              ) : (
                reviewed.map((r) => (
                  <tr key={r._id} className="border-t border-outline-variant hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">RPT{r._id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{DISASTER_LABELS[r.incidentType] || r.incidentType}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate">{r.locationName || "N/A"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.reportedByName || "Anonymous"}</td>
                    <td className="px-4 py-3 capitalize">{r.severity || "medium"}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate">{r.details || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.approvalStatus === "approved"
                            ? "bg-[#d2f8d2] text-[#005000]"
                            : "bg-error-container text-on-error-container"
                        }`}
                      >
                        {r.approvalStatus === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface text-xs font-label-md"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
