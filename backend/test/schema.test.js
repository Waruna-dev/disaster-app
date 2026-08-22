/**
 * Pure Mongoose schema validation tests — no database connection required.
 * mongoose.Document#validateSync() runs all schema validators in-process.
 */
const assert = require("assert");
const Report = require("../models/Report");

function main() {
  // Flood without waterLevel must fail
  {
    const doc = new Report({ incidentType: "flood" });
    const err = doc.validateSync();
    assert.ok(err, "expected a validation error for flood without waterLevel");
    assert.ok(err.errors.waterLevel, "expected waterLevel to be the failing field");
    console.log("PASS: flood without waterLevel fails validation");
  }

  // Flood with a valid waterLevel passes
  {
    const doc = new Report({ incidentType: "flood", waterLevel: "high" });
    const err = doc.validateSync();
    assert.strictEqual(err, undefined);
    console.log("PASS: flood with waterLevel passes validation");
  }

  // Non-flood types don't require waterLevel
  {
    const doc = new Report({ incidentType: "fire" });
    const err = doc.validateSync();
    assert.strictEqual(err, undefined);
    console.log("PASS: fire report without waterLevel passes validation");
  }

  // Unknown incidentType is rejected by the enum
  {
    const doc = new Report({ incidentType: "meteor-strike" });
    const err = doc.validateSync();
    assert.ok(err && err.errors.incidentType, "expected incidentType enum validation to fail");
    console.log("PASS: unknown incidentType rejected by enum");
  }

  // Unknown waterLevel value is rejected by the enum
  {
    const doc = new Report({ incidentType: "flood", waterLevel: "catastrophic" });
    const err = doc.validateSync();
    assert.ok(err && err.errors.waterLevel, "expected waterLevel enum validation to fail");
    console.log("PASS: unknown waterLevel rejected by enum");
  }

  // status defaults to "pending"
  {
    const doc = new Report({ incidentType: "fire" });
    assert.strictEqual(doc.status, "pending");
    console.log("PASS: status defaults to pending");
  }

  // media/voiceNote structures validate
  {
    const doc = new Report({
      incidentType: "fire",
      media: [{ url: "http://x/uploads/a.png", type: "image", originalName: "a.png" }],
      voiceNote: { url: "http://x/uploads/b.webm", originalName: "b.webm" },
    });
    const err = doc.validateSync();
    assert.strictEqual(err, undefined);
    console.log("PASS: media + voiceNote sub-documents validate");
  }

  console.log("\nALL SCHEMA TESTS PASSED");
}

main();
