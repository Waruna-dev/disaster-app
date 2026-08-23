const fs = require("fs");
const path = require("path");
const Report = require("../models/Report");

/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function buildFileUrl(req, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
}

/** GET /api/reports/location?lat=6.94&lng=79.86 */
const reverseGeocode = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
  }

  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("localityLanguage", "en");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    return res.status(502).json({ success: false, message: "Location service unavailable" });
  }

  const data = await response.json();
  const place = data.city || data.locality;
  const province = data.principalSubdivision;
  const district = data.localityInfo?.administrative?.find(
    (item) => item.description?.toLowerCase().includes("district")
  )?.name;
  const parts = [place, district, province]
    .filter(Boolean)
    .map((part) => part.trim())
    .filter((part, index, values) => values.indexOf(part) === index);

  res.status(200).json({
    success: true,
    data: { locationName: parts.length ? parts.join(", ") : data.display_name || "Unknown location" },
  });
});

/**
 * POST /api/reports
 * Creates a new incident report. Accepts multipart/form-data so citizens can
 * attach photos/videos ("media", up to 6) and a single voice memo ("voiceNote").
 */
const createReport = asyncHandler(async (req, res) => {
  const { incidentType, waterLevel, details, locationName, reportedByName, severity } = req.body;

  let location;
  if (req.body.lat !== undefined && req.body.lng !== undefined && req.body.lat !== "") {
    location = { lat: Number(req.body.lat), lng: Number(req.body.lng) };
  }

  const media = (req.files?.media || []).map((file) => ({
    url: buildFileUrl(req, file.filename),
    type: file.mimetype.startsWith("video/") ? "video" : "image",
    originalName: file.originalname,
  }));

  const voiceFile = req.files?.voiceNote?.[0];
  const voiceNote = voiceFile
    ? { url: buildFileUrl(req, voiceFile.filename), originalName: voiceFile.originalname }
    : undefined;

  const report = await Report.create({
    incidentType,
    waterLevel: incidentType === "flood" ? waterLevel : undefined,
    location,
    details,
    media,
    voiceNote,
    ...(locationName ? { locationName } : {}),
    ...(reportedByName ? { reportedByName } : {}),
    ...(severity ? { severity } : {}),
  });

  res.status(201).json({ success: true, data: report });
});

/**
 * PATCH /api/reports/:id/approve
 * Admin action: marks a report as verified/approved.
 */
const approveReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { approvalStatus: "approved", rejectReason: "", reviewedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  res.status(200).json({ success: true, data: report });
});

/**
 * PATCH /api/reports/:id/reject
 * Admin action: marks a report as rejected. Body: { reason: string }
 */
const rejectReport = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: "A rejection reason is required" });
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { approvalStatus: "rejected", rejectReason: reason.trim(), reviewedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  res.status(200).json({ success: true, data: report });
});

/**
 * GET /api/reports/admin/summary
 * Aggregated counters used by the admin Summary dashboard.
 */
const getAdminSummary = asyncHandler(async (req, res) => {
  const [
    activeDisasters,
    pendingReports,
    approvedReports,
    rejectedReports,
    totalReports,
  ] = await Promise.all([
    Report.countDocuments({ approvalStatus: "approved", status: { $ne: "resolved" } }),
    Report.countDocuments({ approvalStatus: "pending" }),
    Report.countDocuments({ approvalStatus: "approved" }),
    Report.countDocuments({ approvalStatus: "rejected" }),
    Report.countDocuments({}),
  ]);

  // Daily approve vs reject counts for the last 7 days (used by the report generator).
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyRaw = await Report.aggregate([
    { $match: { reviewedAt: { $gte: sevenDaysAgo }, approvalStatus: { $in: ["approved", "rejected"] } } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$reviewedAt" } },
          status: "$approvalStatus",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const dailyMap = {};
  dailyRaw.forEach((row) => {
    const day = row._id.day;
    if (!dailyMap[day]) dailyMap[day] = { date: day, approved: 0, rejected: 0 };
    dailyMap[day][row._id.status === "approved" ? "approved" : "rejected"] = row.count;
  });
  const dailyAnalysis = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  res.status(200).json({
    success: true,
    data: {
      activeDisasters,
      pendingReports,
      approvedReports,
      rejectedReports,
      totalReports,
      dailyAnalysis,
    },
  });
});

/**
 * GET /api/reports
 * Lists reports, newest first. Supports optional ?incidentType=, ?status=,
 * ?page= and ?limit= query params.
 */
const getReports = asyncHandler(async (req, res) => {
  const { incidentType, status } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  const filter = {};
  if (incidentType) filter.incidentType = incidentType;
  if (status) filter.status = status;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Report.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: reports.length,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    data: reports,
  });
});

/** GET /api/reports/:id */
const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  res.status(200).json({ success: true, data: report });
});

/** PATCH /api/reports/:id/status  Body: { status: "pending" | "in-progress" | "resolved" } */
const updateReportStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }

  res.status(200).json({ success: true, data: report });
});

/** DELETE /api/reports/:id — also removes any uploaded files from disk. */
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }

  const filesToRemove = [
    ...report.media.map((m) => m.url),
    ...(report.voiceNote ? [report.voiceNote.url] : []),
  ];

  filesToRemove.forEach((url) => {
    const filename = url.split("/uploads/")[1];
    if (!filename) return;
    const filePath = path.join(__dirname, "..", "uploads", filename);
    fs.unlink(filePath, () => {}); // best-effort cleanup, ignore errors
  });

  await report.deleteOne();

  res.status(200).json({ success: true, data: {} });
});

module.exports = {
  createReport,
  reverseGeocode,
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  approveReport,
  rejectReport,
  getAdminSummary,
};
