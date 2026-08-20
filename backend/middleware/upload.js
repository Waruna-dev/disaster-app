const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];

function fileFilter(req, file, cb) {
  const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
  if (!isAllowed) {
    return cb(new Error("Only image, video, and audio files are allowed"), false);
  }
  cb(null, true);
}

const maxFileSize = Number(process.env.MAX_UPLOAD_SIZE) || 10 * 1024 * 1024; // 10 MB default

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

// Accepts up to 6 photo/video files under "media" and a single "voiceNote" audio file
const uploadReportFiles = upload.fields([
  { name: "media", maxCount: 6 },
  { name: "voiceNote", maxCount: 1 },
]);

module.exports = { upload, uploadReportFiles, UPLOAD_DIR };
