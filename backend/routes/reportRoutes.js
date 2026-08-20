const express = require("express");
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
} = require("../controllers/reportController");
const { uploadReportFiles } = require("../middleware/upload");

const router = express.Router();

router.route("/").post(uploadReportFiles, createReport).get(getReports);

router.route("/:id").get(getReportById).delete(deleteReport);

router.patch("/:id/status", updateReportStatus);

module.exports = router;
