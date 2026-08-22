const Announcement = require("../models/Announcement");
const { translateAnnouncement } = require("../utils/translate");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function buildFileUrl(req, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
}

function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(",").map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

// @desc    Best-effort offline auto-translation preview (Sinhala + Tamil)
// @route   POST /api/announcements/translate
// @access  Private (admin)
exports.previewTranslation = (req, res) => {
  const { messageEn } = req.body;
  if (!messageEn || !messageEn.trim()) {
    return res.status(400).json({ success: false, message: "messageEn is required" });
  }
  res.status(200).json({ success: true, data: translateAnnouncement(messageEn) });
};

// @desc    Create + publish (or save as draft) an announcement
// @route   POST /api/announcements
// @access  Private (admin)
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { title, messageEn, status } = req.body;
  const provinces = parseArrayField(req.body.provinces);
  const districts = parseArrayField(req.body.districts);

  let { messageSi, messageTa } = req.body;
  if (!messageSi || !messageTa) {
    const auto = translateAnnouncement(messageEn);
    messageSi = messageSi || auto.si;
    messageTa = messageTa || auto.ta;
  }

  const imageUrl = req.file ? buildFileUrl(req, req.file.filename) : req.body.imageUrl || "";

  const announcement = await Announcement.create({
    title,
    messageEn,
    messageSi,
    messageTa,
    provinces,
    districts,
    imageUrl,
    status: status === "draft" ? "draft" : "published",
  });

  res.status(201).json({ success: true, data: announcement });
});

// @desc    List announcements, newest first
// @route   GET /api/announcements
// @access  Public (published only, unless ?all=true is used by the admin dashboard)
exports.getAnnouncements = asyncHandler(async (req, res) => {
  const filter = req.query.all === "true" ? {} : { status: "published" };
  const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: announcements.length, data: announcements });
});

// @desc    Get a single announcement
// @route   GET /api/announcements/:id
exports.getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    return res.status(404).json({ success: false, message: "Announcement not found" });
  }
  res.status(200).json({ success: true, data: announcement });
});

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (admin)
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const { title, messageEn, messageSi, messageTa, status } = req.body;
  const update = {};
  if (title !== undefined) update.title = title;
  if (messageEn !== undefined) update.messageEn = messageEn;
  if (messageSi !== undefined) update.messageSi = messageSi;
  if (messageTa !== undefined) update.messageTa = messageTa;
  if (status !== undefined) update.status = status;
  if (req.body.provinces !== undefined) update.provinces = parseArrayField(req.body.provinces);
  if (req.body.districts !== undefined) update.districts = parseArrayField(req.body.districts);
  if (req.file) update.imageUrl = buildFileUrl(req, req.file.filename);
  else if (req.body.imageUrl !== undefined) update.imageUrl = req.body.imageUrl;

  const announcement = await Announcement.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!announcement) {
    return res.status(404).json({ success: false, message: "Announcement not found" });
  }
  res.status(200).json({ success: true, data: announcement });
});

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (admin)
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) {
    return res.status(404).json({ success: false, message: "Announcement not found" });
  }
  res.status(200).json({ success: true, data: {} });
});
