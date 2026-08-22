/**
 * End-to-end HTTP test of the real Express app: server.js, routes/, controllers/,
 * the multer upload middleware, and the error handler — all exercised for real.
 * Only the persistence layer (models/Report.js) is swapped for an in-memory fake
 * (test/fakeReportModel.js) because this sandbox cannot download a mongod binary.
 * Schema/validation rules themselves are verified separately, against the real
 * Mongoose model, in test/schema.test.js.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Module = require("module");

// Redirect every `require("../models/Report")` (from any file) to the in-memory fake.
const realResolveFilename = Module._resolveFilename;
const modelPath = path.join(__dirname, "..", "models", "Report.js");
const fakePath = path.join(__dirname, "fakeReportModel.js");
Module._resolveFilename = function patchedResolve(request, ...rest) {
  const resolved = realResolveFilename.call(this, request, ...rest);
  return resolved === modelPath ? fakePath : resolved;
};

process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "*";

const app = require("../server");
const fakeModel = require("../models/Report"); // now resolves to the fake

async function main() {
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const fetchJson = async (urlPath, options = {}) => {
    const res = await fetch(base + urlPath, options);
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* ignore non-json */
    }
    return { status: res.status, body };
  };

  // 1. Health check
  {
    const { status, body } = await fetchJson("/api/health");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    console.log("PASS: health check");
  }

  const testImagePath = path.join(__dirname, "fixtures", "test.png");
  const testAudioPath = path.join(__dirname, "fixtures", "test.webm");

  let createdId;
  // 2. Create a flood report with an image and a voice note attached
  {
    const form = new FormData();
    form.append("incidentType", "flood");
    form.append("waterLevel", "high");
    form.append("details", "Water rising fast near the market.");
    form.append("lat", "6.9271");
    form.append("lng", "79.8612");
    form.append(
      "media",
      new Blob([fs.readFileSync(testImagePath)], { type: "image/png" }),
      "test.png"
    );
    form.append(
      "voiceNote",
      new Blob([fs.readFileSync(testAudioPath)], { type: "audio/webm" }),
      "test.webm"
    );

    const res = await fetch(base + "/api/reports", { method: "POST", body: form });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.incidentType, "flood");
    assert.strictEqual(body.data.waterLevel, "high");
    assert.strictEqual(body.data.media.length, 1);
    assert.strictEqual(body.data.media[0].type, "image");
    assert.ok(body.data.voiceNote.url.includes("/uploads/"));
    assert.strictEqual(body.data.status, "pending");
    createdId = body.data._id;
    console.log("PASS: create report with media + voice note, id =", createdId);

    // confirm the uploaded file was actually written to disk and is served statically
    const fileRes = await fetch(body.data.media[0].url);
    assert.strictEqual(fileRes.status, 200);
    console.log("PASS: uploaded file served via /uploads");
  }

  // 3. Validation: flood without waterLevel should fail (400, via error middleware)
  {
    const form = new FormData();
    form.append("incidentType", "flood");
    const res = await fetch(base + "/api/reports", { method: "POST", body: form });
    const body = await res.json();
    assert.strictEqual(res.status, 400, `expected 400, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.success, false);
    console.log("PASS: validation rejects flood report without waterLevel");
  }

  // 4. List reports
  {
    const { status, body } = await fetchJson("/api/reports");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.count, 1);
    assert.strictEqual(body.total, 1);
    console.log("PASS: list reports");
  }

  // 5. Filter by incidentType
  {
    const { status, body } = await fetchJson("/api/reports?incidentType=fire");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.count, 0);
    console.log("PASS: filter by incidentType");
  }

  // 6. Get single report
  {
    const { status, body } = await fetchJson(`/api/reports/${createdId}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data._id, createdId);
    console.log("PASS: get report by id");
  }

  // 7. Update status
  {
    const { status, body } = await fetchJson(`/api/reports/${createdId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in-progress" }),
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.status, "in-progress");
    console.log("PASS: update report status");
  }

  // 8. Invalid status should be rejected (400)
  {
    const { status, body } = await fetchJson(`/api/reports/${createdId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "not-a-real-status" }),
    });
    assert.strictEqual(status, 400, `expected 400, got ${status}: ${JSON.stringify(body)}`);
    console.log("PASS: invalid status rejected");
  }

  // 9. 404 for a well-formed but unknown id
  {
    const { status } = await fetchJson("/api/reports/64b8f0f0f0f0f0f0f0f0f0f0");
    assert.strictEqual(status, 404);
    console.log("PASS: unknown id returns 404");
  }

  // 10. Unknown route hits notFound -> errorHandler as 404
  {
    const { status, body } = await fetchJson("/api/does-not-exist");
    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
    console.log("PASS: unmatched route returns 404 via notFound middleware");
  }

  // 11. Delete report
  {
    const { status, body } = await fetchJson(`/api/reports/${createdId}`, { method: "DELETE" });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    console.log("PASS: delete report");
  }

  // 12. List is empty again
  {
    const { body } = await fetchJson("/api/reports");
    assert.strictEqual(body.count, 0);
    console.log("PASS: list empty after delete");
  }

  await new Promise((resolve) => server.close(resolve));
  fakeModel.__reset();

  console.log("\nALL HTTP TESTS PASSED");
}

main().catch((err) => {
  console.error("TEST FAILURE:", err);
  process.exit(1);
});
