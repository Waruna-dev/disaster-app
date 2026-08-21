const fs = require("fs");
const path = require("path");
const Report = require("../models/Report");

// 1. Wrap async controller functions so errors are forwarded to the Express error middleware.
/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 2. Build a public URL for uploaded files so the frontend can access them.
function buildFileUrl(req, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
}

/**
 * POST /api/reports
 * Creates a new incident report. Accepts multipart/form-data so citizens can
 * attach photos/videos ("media", up to 6) and a single voice memo ("voiceNote").
 */
// 3. Create a new disaster report from form-data submitted by the user.
const createReport = asyncHandler(async (req, res) => {
  // 4. Extract the main report values from the request body.
  const { incidentType, waterLevel, details } = req.body;

  // 5. Store GPS coordinates if both latitude and longitude were sent.
  let location;
  if (req.body.lat !== undefined && req.body.lng !== undefined && req.body.lat !== "") {
    location = { lat: Number(req.body.lat), lng: Number(req.body.lng) };
  }

  // 6. Convert uploaded image/video files into stored metadata objects.
  const media = (req.files?.media || []).map((file) => ({
    url: buildFileUrl(req, file.filename),
    type: file.mimetype.startsWith("video/") ? "video" : "image",
    originalName: file.originalname,
  }));

  // 7. Save the optional voice note as a single file record.
  const voiceFile = req.files?.voiceNote?.[0];
  const voiceNote = voiceFile
    ? { url: buildFileUrl(req, voiceFile.filename), originalName: voiceFile.originalname }
    : undefined;

  // 8. Save the report to MongoDB with validation rules applied by the schema.
  const report = await Report.create({
    incidentType,
    waterLevel: incidentType === "flood" ? waterLevel : undefined,
    location,
    details,
    media,
    voiceNote,
  });

  // 9. Return the created report data to the client as JSON.
  res.status(201).json({ success: true, data: report });
});

/**
 * GET /api/reports
 * Lists reports, newest first. Supports optional ?incidentType=, ?status=,
 * ?page= and ?limit= query params.
 */
// 10. Fetch all reports with optional filtering and pagination.
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
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
};
