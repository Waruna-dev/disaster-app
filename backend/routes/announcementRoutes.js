const express = require("express");
const {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  previewTranslation,
} = require("../controllers/announcementController");
const { uploadAnnouncementImage } = require("../middleware/upload");
const { protectAdmin } = require("../middleware/adminAuth");

const router = express.Router();

// Public: the Home page reads published announcements.
router.get("/", getAnnouncements);
router.get("/:id", getAnnouncementById);

// Admin-only: manage announcements.
router.post("/translate", protectAdmin, previewTranslation);
router.post("/", protectAdmin, uploadAnnouncementImage, createAnnouncement);
router.put("/:id", protectAdmin, uploadAnnouncementImage, updateAnnouncement);
router.delete("/:id", protectAdmin, deleteAnnouncement);

module.exports = router;
