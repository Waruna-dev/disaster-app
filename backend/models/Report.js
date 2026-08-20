const mongoose = require("mongoose");

const INCIDENT_TYPES = ["flood", "fire", "road-block", "medical", "power-outage", "other"];
const WATER_LEVELS = ["low", "medium", "high"];
const STATUSES = ["pending", "in-progress", "resolved"];

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

reportSchema.index({ incidentType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
module.exports.INCIDENT_TYPES = INCIDENT_TYPES;
module.exports.WATER_LEVELS = WATER_LEVELS;
module.exports.STATUSES = STATUSES;
