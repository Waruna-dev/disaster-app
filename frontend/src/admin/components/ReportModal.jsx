import { useEffect, useState } from "react";
import { DISASTER_LABELS } from "./ReportCard";

function prettifyLocationValue(value) {
  if (!value || !value.trim()) return "";
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function reverseGeocodeLocation(lat, lng) {
  try {
    const url = `http://localhost:5000/api/reports/location?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && data.data?.locationName) return data.data.locationName;
    return null;
    /* const address = data.address || {};
    const placeName = prettifyLocationValue(
      address.village ||
      address.town ||
      address.city ||
      address.municipality ||
      address.county ||
      address.state_district ||
      address.suburb ||
      "Unknown area"
    );

    const district = prettifyLocationValue(
      address.county ||
      address.state_district ||
      address.city_district ||
      ""
    );

    const province = prettifyLocationValue(address.state || address.region || "");
    const locationParts = [placeName, district, province].filter(Boolean);
    return locationParts.length ? locationParts.join(", ") : "Location"; */
  } catch {
    return null;
  }
}

function looksLikeCoordinateString(value) {
  return /^[-+]?\d{1,3}(?:\.\d+)?\s*,\s*[-+]?\d{1,3}(?:\.\d+)?(?:\s*\(.*\))?$/.test(String(value).trim());
}

function parseCoordinateString(value) {
  const normalized = String(value).trim();
  const match = normalized.match(/^([-+]?\d{1,3}(?:\.\d+)?)\s*,\s*([-+]?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const latText = match[1];
  const lngText = match[2];
  const lat = Number(latText);
  const lng = Number(lngText);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function formatCoordinateLocation(lat, lng) {
  const latitude = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  const area = lat >= 6.85 && lat <= 7.1 && lng >= 79.75 && lng <= 80.1
    ? " (Colombo, Western Province)"
    : "";
  return `${latitude}, ${longitude}${area}`;
}

function extractReadableLocationLabel(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const parentheticalMatch = trimmed.match(/^[-+]?\d{1,3}(?:\.\d+)?\s*,\s*[-+]?\d{1,3}(?:\.\d+)?\s*\((.*)\)$/);
  if (parentheticalMatch?.[1]) {
    return parentheticalMatch[1].trim();
  }

  return trimmed;
}

function formatLocation(report) {
  const namedLocation = report.locationName?.trim();
  if (namedLocation) {
    const readableLabel = extractReadableLocationLabel(namedLocation);
    if (readableLabel && readableLabel !== namedLocation) {
      return readableLabel;
    }
    if (looksLikeCoordinateString(namedLocation)) {
      const coords = parseCoordinateString(namedLocation);
      if (coords) return formatCoordinateLocation(coords.lat, coords.lng);
    }
    return namedLocation;
  }

  const lat = Number(report.location?.lat);
  const lng = Number(report.location?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return formatCoordinateLocation(lat, lng);
  }

  return "Not specified";
}

export default function ReportModal({ report, onClose, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [displayLocation, setDisplayLocation] = useState(() => formatLocation(report));

  useEffect(() => {
    const namedLocation = report.locationName?.trim();

    const readableLabel = namedLocation ? extractReadableLocationLabel(namedLocation) : "";
    if (readableLabel && readableLabel !== namedLocation) {
      setDisplayLocation(readableLabel);
      return;
    }

    if (namedLocation && looksLikeCoordinateString(namedLocation)) {
      const coords = parseCoordinateString(namedLocation);
      if (coords) {
        reverseGeocodeLocation(coords.lat, coords.lng).then((resolved) => {
          setDisplayLocation(resolved || formatCoordinateLocation(coords.lat, coords.lng));
        });
        return;
      }
    }

    if (namedLocation) {
      setDisplayLocation(namedLocation);
      return;
    }

    const lat = Number(report.location?.lat);
    const lng = Number(report.location?.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      reverseGeocodeLocation(lat, lng).then((resolved) => {
        setDisplayLocation(resolved || formatCoordinateLocation(lat, lng));
      });
      return;
    }

    setDisplayLocation(formatLocation(report));
  }, [report]);

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
            <Detail label="Location" value={displayLocation} />
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
