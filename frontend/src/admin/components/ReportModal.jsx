import { useState } from "react";
import { DISASTER_LABELS } from "./ReportCard";

export default function ReportModal({ report, onClose, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!report) return null;

  const reportId = `RPT${report._id.slice(-6).toUpperCase()}`;

  const handleApprove = async () => {
    setBusy(true);
    setError("");
    try {
      await onApprove(report._id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to approve report");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for rejecting this report.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onReject(report._id, reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || "Failed to reject report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-on-surface-variant font-label-md">{reportId}</p>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              {DISASTER_LABELS[report.incidentType] || report.incidentType} Report
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {report.media?.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {report.media.map((m, i) =>
                m.type === "video" ? (
                  <video key={i} src={m.url} controls className="w-full h-40 object-cover rounded-lg" />
                ) : (
                  <img key={i} src={m.url} alt={`evidence-${i}`} className="w-full h-40 object-cover rounded-lg" />
                )
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Location" value={report.locationName || "Not specified"} />
            <Detail label="Reported On" value={new Date(report.createdAt).toLocaleString()} />
            <Detail label="Reported By" value={report.reportedByName || "Anonymous Resident"} />
            <Detail label="Severity" value={(report.severity || "medium").toUpperCase()} />
            {report.waterLevel && <Detail label="Water Level" value={report.waterLevel.toUpperCase()} />}
            <Detail
              label="Current Status"
              value={report.approvalStatus === "pending" ? "Pending Review" : report.approvalStatus === "approved" ? "Approved" : "Rejected"}
            />
          </div>

          <div>
            <p className="text-xs uppercase font-label-md text-on-surface-variant mb-1">Description</p>
            <p className="text-sm text-on-surface bg-surface-container-low rounded-lg p-3">
              {report.details || "No additional description provided."}
            </p>
          </div>

          {report.approvalStatus === "rejected" && report.rejectReason && (
            <div className="bg-error-container/40 border border-error/30 rounded-lg p-3">
              <p className="text-xs uppercase font-label-md text-error mb-1">Rejection Reason</p>
              <p className="text-sm text-on-surface">{report.rejectReason}</p>
            </div>
          )}

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">{error}</div>
          )}

          {rejecting ? (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-on-surface">Reason for rejection</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this report is being rejected (e.g. duplicate, insufficient evidence, false report)..."
                className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejecting(false)}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-lg bg-error text-white hover:opacity-90 transition-opacity font-label-md disabled:opacity-60"
                >
                  {busy ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setRejecting(true)}
                disabled={report.approvalStatus === "rejected"}
                className="flex-1 py-3 rounded-lg border border-error text-error hover:bg-error hover:text-white transition-colors font-label-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-error"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                {report.approvalStatus === "rejected" ? "Already Rejected" : "Reject"}
              </button>
              <button
                onClick={handleApprove}
                disabled={busy || report.approvalStatus === "approved"}
                className="flex-1 py-3 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity font-label-md flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                {report.approvalStatus === "approved" ? "Already Approved" : busy ? "Approving..." : "Approve"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase font-label-md text-on-surface-variant">{label}</p>
      <p className="text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
