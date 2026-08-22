export default function StatCard({ icon, label, value, tone = "primary" }) {
  const tones = {
    primary: "bg-primary-container text-on-primary-container",
    error: "bg-error-container text-on-error-container",
    success: "bg-[#d2f8d2] text-[#005000]",
    warning: "bg-[#ffeed2] text-[#8c5000]",
    neutral: "bg-surface-container-high text-on-surface",
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tones[tone]}`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-on-surface leading-none mb-1">{value}</p>
        <p className="text-sm text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
