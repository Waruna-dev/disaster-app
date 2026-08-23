const express = require("express");
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  approveReport,
  rejectReport,
  getAdminSummary,
  reverseGeocode,
} = require("../controllers/reportController");
const { uploadReportFiles } = require("../middleware/upload");
const { protectAdmin } = require("../middleware/adminAuth");

const router = express.Router();

router.route("/").post(uploadReportFiles, createReport).get(getReports);
router.get("/location", reverseGeocode);

// Admin dashboard endpoints (verification workflow). Mounted before "/:id"
// is fine since Express matches "/admin/summary" literally, not as an :id param.
router.get("/admin/summary", protectAdmin, getAdminSummary);
router.patch("/:id/approve", protectAdmin, approveReport);
router.patch("/:id/reject", protectAdmin, rejectReport);

router.route("/:id").get(getReportById).delete(deleteReport);

router.patch("/:id/status", updateReportStatus);

module.exports = router;
