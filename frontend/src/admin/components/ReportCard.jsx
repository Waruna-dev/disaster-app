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

export default function ReportCard({ report, onClick }) {
  const media = report.media?.[0];
  const severity = report.severity || "medium";

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
          {report.locationName || "Location not specified"}
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
