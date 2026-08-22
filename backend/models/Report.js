const mongoose = require("mongoose");

const INCIDENT_TYPES = [
  "flood",
  "landslide",
  "heavy-rain",
  "fire",
  "road-block",
  "medical",
  "power-outage",
  "other",
];
const WATER_LEVELS = ["low", "medium", "high"];
const STATUSES = ["pending", "in-progress", "resolved"];

// Admin verification workflow (separate from the operational `status` above,
// which is used by the resident/volunteer flow for in-progress/resolved tracking).
const SEVERITIES = ["low", "medium", "high"];
const APPROVAL_STATUSES = ["pending", "approved", "rejected"];

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    originalName: { type: String },
  },
  { _id: false }
);

const voiceNoteSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    originalName: { type: String },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

// 8. Main report schema with incident details and metadata.
const reportSchema = new mongoose.Schema(
  {
    incidentType: {
      type: String,
      enum: INCIDENT_TYPES,
      required: [true, "incidentType is required"],
    },
    waterLevel: {
      type: String,
      enum: WATER_LEVELS,
      required: [
        function requiredForFlood() {
          return this.incidentType === "flood";
        },
        "waterLevel is required when incidentType is 'flood'",
      ],
      default: undefined,
    },
    location: {
      type: locationSchema,
      default: undefined,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
    voiceNote: {
      type: voiceNoteSchema,
      default: undefined,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "pending",
    },

    // --- Admin dashboard fields (additive; do not remove/rename existing fields above) ---
    locationName: {
      type: String,
      trim: true,
      default: "",
    },
    reportedByName: {
      type: String,
      trim: true,
      default: "Anonymous Resident",
    },
    severity: {
      type: String,
      enum: SEVERITIES,
      default: "medium",
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "pending",
    },
    rejectReason: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

reportSchema.index({ incidentType: 1, status: 1, createdAt: -1 });
reportSchema.index({ approvalStatus: 1, severity: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
module.exports.INCIDENT_TYPES = INCIDENT_TYPES;
module.exports.WATER_LEVELS = WATER_LEVELS;
module.exports.STATUSES = STATUSES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.APPROVAL_STATUSES = APPROVAL_STATUSES;
