const mongoose = require("mongoose");

const PROVINCES = [
  "Western",
  "Central",
  "Southern",
  "Northern",
  "Eastern",
  "North Western",
  "North Central",
  "Uva",
  "Sabaragamuwa",
];

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide an announcement title"],
      trim: true,
      maxlength: 150,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    messageEn: {
      type: String,
      required: [true, "Please provide the announcement message"],
      trim: true,
      maxlength: 3000,
    },
    messageSi: {
      type: String,
      trim: true,
      default: "",
    },
    messageTa: {
      type: String,
      trim: true,
      default: "",
    },
    provinces: {
      type: [{ type: String, enum: PROVINCES }],
      default: [],
    },
    districts: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
module.exports.PROVINCES = PROVINCES;
