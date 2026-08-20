/**
 * Sends a handful of realistic sample reports to a RUNNING backend so you can
 * confirm the API + MongoDB connection actually work end-to-end (not just the
 * automated tests, which use an in-memory fake).
 *
 * Usage:
 *   node test/sample-requests.js
 *   API_URL=http://localhost:5000 node test/sample-requests.js   (override the target)
 *
 * Make sure `npm run dev` (or `npm start`) is already running in another
 * terminal, and that MONGO_URI in your .env points at a reachable MongoDB,
 * before running this.
 */
const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:5000";
const SAMPLE_IMAGE = path.join(__dirname, "fixtures", "test.png");

const SAMPLE_REPORTS = [
  {
    incidentType: "flood",
    waterLevel: "high",
    details: "Water is waist-deep near the Galle Road junction, several homes cut off.",
    lat: "6.9271",
    lng: "79.8612",
    attachImage: true,
  },
  {
    incidentType: "fire",
    details: "Fire broke out in a warehouse behind the market, heavy smoke visible.",
    lat: "6.9319",
    lng: "79.8478",
  },
  {
    incidentType: "road-block",
    details: "Fallen tree blocking both lanes near the school junction.",
  },
  {
    incidentType: "medical",
    details: "Elderly resident needs urgent medical attention, no transport available.",
    lat: "6.9147",
    lng: "79.8731",
  },
];

async function checkServerUp() {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    return true;
  } catch (err) {
    console.error(`\nCouldn't reach the API at ${API_URL} (${err.message}).`);
    console.error("Make sure the backend is running (npm run dev) and try again.\n");
    return false;
  }
}

async function sendReport(sample, index) {
  const form = new FormData();
  form.append("incidentType", sample.incidentType);
  if (sample.waterLevel) form.append("waterLevel", sample.waterLevel);
  if (sample.lat) form.append("lat", sample.lat);
  if (sample.lng) form.append("lng", sample.lng);
  form.append("details", sample.details);

  if (sample.attachImage && fs.existsSync(SAMPLE_IMAGE)) {
    form.append(
      "media",
      new Blob([fs.readFileSync(SAMPLE_IMAGE)], { type: "image/png" }),
      "sample.png"
    );
  }

  const res = await fetch(`${API_URL}/api/reports`, { method: "POST", body: form });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.error(`[${index + 1}/${SAMPLE_REPORTS.length}] FAILED (${res.status}):`, body?.message || body);
    return null;
  }

  console.log(
    `[${index + 1}/${SAMPLE_REPORTS.length}] Created ${sample.incidentType} report — id ${body.data._id}`
  );
  return body.data;
}

async function main() {
  console.log(`Sending ${SAMPLE_REPORTS.length} sample reports to ${API_URL} ...\n`);

  const serverUp = await checkServerUp();
  if (!serverUp) process.exit(1);

  const created = [];
  for (let i = 0; i < SAMPLE_REPORTS.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const doc = await sendReport(SAMPLE_REPORTS[i], i);
    if (doc) created.push(doc);
  }

  console.log(`\n${created.length}/${SAMPLE_REPORTS.length} reports created successfully.`);

  const listRes = await fetch(`${API_URL}/api/reports`);
  const listBody = await listRes.json();
  console.log(`GET /api/reports now returns ${listBody.total} report(s) total.`);
  console.log(`\nOpen ${API_URL}/api/reports in your browser to see the raw JSON.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
