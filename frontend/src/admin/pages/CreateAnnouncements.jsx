import { useEffect, useState } from "react";
import ImageDropBox from "../components/ImageDropBox";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import AnnouncementCard from "../components/AnnouncementCard";
import { PROVINCES, districtsForProvinces } from "../data/sriLanka";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  previewTranslation,
} from "../api/adminApi";

const EMPTY_FORM = {
  id: null,
  title: "",
  messageEn: "",
  messageSi: "",
  messageTa: "",
  provinces: [],
  districts: [],
  imageFile: null,
  imagePreview: "",
};

export default function CreateAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAnnouncements(true);
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  const availableDistricts = districtsForProvinces(form.provinces);

  const handleProvincesChange = (provinces) => {
    setForm((f) => ({
      ...f,
      provinces,
      districts: f.districts.filter((d) => districtsForProvinces(provinces).includes(d)),
    }));
  };

  const handleAutoTranslate = async () => {
    if (!form.messageEn.trim()) {
      setError("Write the English message first, then auto-translate.");
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const res = await previewTranslation(form.messageEn);
      setForm((f) => ({ ...f, messageSi: res.data.si, messageTa: res.data.ta }));
    } catch (err) {
      setError(err.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const resetForm = () => setForm(EMPTY_FORM);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.messageEn.trim()) {
      setError("Title and English message are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("messageEn", form.messageEn);
      fd.append("messageSi", form.messageSi);
      fd.append("messageTa", form.messageTa);
      fd.append("provinces", JSON.stringify(form.provinces));
      fd.append("districts", JSON.stringify(form.districts));
      fd.append("status", "published");
      if (form.imageFile) fd.append("image", form.imageFile);

      if (form.id) {
        await updateAnnouncement(form.id, fd);
      } else {
        await createAnnouncement(fd);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Failed to publish announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement) => {
    setForm({
      id: announcement._id,
      title: announcement.title,
      messageEn: announcement.messageEn,
      messageSi: announcement.messageSi,
      messageTa: announcement.messageTa,
      provinces: announcement.provinces || [],
      districts: announcement.districts || [],
      imageFile: null,
      imagePreview: announcement.imageUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement? This cannot be undone.")) return;
    setError("");
    try {
      await deleteAnnouncement(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete announcement");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Create Announcement</h1>
        <p className="text-on-surface-variant">Broadcast verified safety updates to residents by province and district</p>
      </div>

      {error && (
        <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">{error}</div>
      )}

      {/* Form */}
      <form onSubmit={handlePublish} className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.05)] flex flex-col gap-5">
        {form.id && (
          <div className="flex items-center gap-2 text-sm text-primary font-semibold">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editing announcement
          </div>
        )}

        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-unit">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Flood Warning - Kelaniya River Basin"
            className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm min-h-[48px]"
          />
        </div>

        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-unit">Image</label>
          <ImageDropBox
            preview={form.imageFile ? URL.createObjectURL(form.imageFile) : form.imagePreview}
            onFileSelected={(file) => setForm((f) => ({ ...f, imageFile: file, imagePreview: "" }))}
          />
        </div>

        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-unit">Message (English)</label>
          <textarea
            value={form.messageEn}
            onChange={(e) => setForm((f) => ({ ...f, messageEn: e.target.value }))}
            rows={4}
            placeholder="Write the announcement message in English..."
            className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={translating}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary-container/20 transition-colors text-xs font-label-md disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">translate</span>
            {translating ? "Translating..." : "Auto-translate to Sinhala & Tamil"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-unit">Message (Sinhala)</label>
            <textarea
              value={form.messageSi}
              onChange={(e) => setForm((f) => ({ ...f, messageSi: e.target.value }))}
              rows={3}
              placeholder="සිංහල පණිවිඩය මෙහි දිස්වේ..."
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-unit">Message (Tamil)</label>
            <textarea
              value={form.messageTa}
              onChange={(e) => setForm((f) => ({ ...f, messageTa: e.target.value }))}
              rows={3}
              placeholder="தமிழ் செய்தி இங்கே தோன்றும்..."
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-on-surface-variant -mt-3">
          Sinhala/Tamil drafts are auto-generated offline from a disaster-vocabulary dictionary — please review and
          correct wording before publishing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelectDropdown
            label="Target Provinces"
            options={PROVINCES}
            selected={form.provinces}
            onChange={handleProvincesChange}
            placeholder="Select provinces..."
          />
          <MultiSelectDropdown
            label="Target Districts"
            options={availableDistricts}
            selected={form.districts}
            onChange={(districts) => setForm((f) => ({ ...f, districts }))}
            placeholder={form.provinces.length ? "Select districts..." : "Select provinces first"}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={resetForm}
            className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity font-label-md flex items-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
            {saving ? "Publishing..." : form.id ? "Save Changes" : "Publish"}
          </button>
        </div>
      </form>

      {/* Announcement list */}
      <div>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">All Announcements</h2>
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
            No announcements published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((a) => (
              <AnnouncementCard key={a._id} announcement={a} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
