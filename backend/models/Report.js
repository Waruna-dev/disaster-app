const mongoose = require("mongoose");

// 1. Connect to MongoDB using Mongoose.
// 2. Supported incident categories for reports.
const INCIDENT_TYPES = ["flood", "fire", "road-block", "medical", "power-outage", "other"];
// 3. Allowed flood water levels for severity tracking.
const WATER_LEVELS = ["low", "medium", "high"];
// 4. Valid lifecycle states for each report.
const STATUSES = ["pending", "in-progress", "resolved"];

// 5. Uploaded media items attached to a disaster report.
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    originalName: { type: String },
  },
  { _id: false }
);

// 6. Optional voice note recorded by the reporter.
const voiceNoteSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    originalName: { type: String },
  },
  { _id: false }
);

// 7. GPS coordinates for the reported incident location.
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
  },
  { timestamps: true }
);

// 9. Index report lookups by type, status, and newest creation date.
reportSchema.index({ incidentType: 1, status: 1, createdAt: -1 });

// 10. Export the report model and related constants.
module.exports = mongoose.model("Report", reportSchema);
module.exports.INCIDENT_TYPES = INCIDENT_TYPES;
module.exports.WATER_LEVELS = WATER_LEVELS;
module.exports.STATUSES = STATUSES;
