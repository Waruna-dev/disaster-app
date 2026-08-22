import { useEffect, useState } from "react";
import { fetchPublishedAnnouncements } from "../admin/api/adminApi";

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublishedAnnouncements()
      .then((res) => setAnnouncements((res.data || []).slice(0, 6)))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && announcements.length === 0) return null;

  return (
    <section className="py-stack-lg lg:py-24 bg-surface-container-low">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="flex items-center justify-between mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              campaign
            </span>
            Latest Announcements
          </h2>
        </div>

        {loading ? (
          <p className="text-on-surface-variant">Loading announcements…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {announcements.map((a) => (
              <div
                key={a._id}
                className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col h-full hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <div className="h-40 bg-surface-container-high overflow-hidden">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined text-[36px]">campaign</span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{a.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant flex-grow mb-4 line-clamp-3">
                    {a.messageEn}
                  </p>
                  {a.provinces?.length > 0 && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {a.provinces.join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-outline mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
