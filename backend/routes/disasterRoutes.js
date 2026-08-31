const express = require("express");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/addreport", report);
router.get("/getreports", protect, getReports);


module.exports = router;
