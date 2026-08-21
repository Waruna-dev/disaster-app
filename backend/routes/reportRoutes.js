const express = require("express");
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
} = require("../controllers/reportController");
const { uploadReportFiles } = require("../middleware/upload");

// 1. Create the Express router used for report API endpoints.
const router = express.Router();

// 2. Main report collection route for creating new reports and listing all reports.
router.route("/").post(uploadReportFiles, createReport).get(getReports);

// 3. Single report route for fetching and deleting one report by ID.
router.route("/:id").get(getReportById).delete(deleteReport);

// 4. Update only the report status for a specific incident.
router.patch("/:id/status", updateReportStatus);

// 5. Export the router so the app can mount these API routes.
module.exports = router;
