export default function AnnouncementCard({ announcement, onEdit, onDelete }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.05)] flex flex-col">
      <div className="h-36 bg-surface-container-high overflow-hidden">
        {announcement.imageUrl ? (
          <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[36px]">campaign</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-1">{announcement.title}</h3>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
              announcement.status === "published"
                ? "bg-[#d2f8d2] text-[#005000]"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {announcement.status}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant line-clamp-2">{announcement.messageEn}</p>
        {announcement.provinces?.length > 0 && (
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {announcement.provinces.join(", ")}
          </p>
        )}
        <p className="text-xs text-outline">{new Date(announcement.createdAt).toLocaleString()}</p>
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={() => onEdit(announcement)}
            className="flex-1 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface text-xs font-label-md flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Update
          </button>
          <button
            onClick={() => onDelete(announcement._id)}
            className="flex-1 py-2 rounded-lg border border-error text-error hover:bg-error hover:text-white transition-colors text-xs font-label-md flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
