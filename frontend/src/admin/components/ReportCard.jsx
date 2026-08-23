import { useEffect, useState } from "react";

const DISASTER_LABELS = {
  flood: "Flood",
  landslide: "Landslide",
  "heavy-rain": "Heavy Rain",
  fire: "Fire",
  "road-block": "Road Block",
  medical: "Medical",
  "power-outage": "Power Outage",
  other: "Other",
};

const SEVERITY_STYLES = {
  high: "bg-error-container text-on-error-container",
  medium: "bg-[#ffeed2] text-[#8c5000]",
  low: "bg-[#d2f8d2] text-[#005000]",
};

function prettifyLocationValue(value) {
  if (!value || !value.trim()) return "";
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function reverseGeocodeLocation(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const address = data.address || {};
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
    return locationParts.length ? locationParts.join(", ") : "Location";
  } catch {
    return null;
  }
}

function formatLocation(report) {
  const namedLocation = report.locationName?.trim();
  if (namedLocation) return namedLocation;

  const lat = Number(report.location?.lat);
  const lng = Number(report.location?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  return "Location not specified";
}

export default function ReportCard({ report, onClick }) {
  const [displayLocation, setDisplayLocation] = useState(() => formatLocation(report));
  const media = report.media?.[0];
  const severity = report.severity || "medium";

  useEffect(() => {
    const namedLocation = report.locationName?.trim();
    const lat = Number(report.location?.lat);
    const lng = Number(report.location?.lng);

    if (namedLocation && !/^[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?$/.test(namedLocation)) {
      setDisplayLocation(namedLocation);
      return;
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      reverseGeocodeLocation(lat, lng).then((resolved) => {
        setDisplayLocation(resolved || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });
      return;
    }

    setDisplayLocation(formatLocation(report));
  }, [report]);

  return (
    <button
      onClick={onClick}
      className="text-left bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all flex flex-col"
    >
      <div className="h-40 bg-surface-container-high relative overflow-hidden">
        {media ? (
          media.type === "video" ? (
            <video src={media.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={media.url} alt={report.details} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[40px]">image_not_supported</span>
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${SEVERITY_STYLES[severity]}`}>
          {severity}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="font-headline-md text-base font-bold text-on-surface">
          {DISASTER_LABELS[report.incidentType] || report.incidentType}
        </h3>
        <p className="text-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          {displayLocation}
        </p>
        <p className="text-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          {new Date(report.createdAt).toLocaleString()}
        </p>
        <p className="text-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">person</span>
          {report.reportedByName || "Anonymous Resident"}
        </p>
      </div>
    </button>
  );
}

export { DISASTER_LABELS };
