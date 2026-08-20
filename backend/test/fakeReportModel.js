/**
 * In-memory stand-in for the Mongoose Report model, used only by the HTTP
 * integration test (test/http.test.js) so the real Express app, routes,
 * controllers, multer upload handling, and error middleware can be exercised
 * end-to-end without a live MongoDB server available in this sandbox.
 * Schema-level validation itself is verified separately, against the real
 * Mongoose model, in test/schema.test.js.
 */
let store = [];
let counter = 1;

function nextId() {
  const id = counter++;
  return id.toString(16).padStart(24, "0");
}

function makeValidationError(fields) {
  const err = new Error(Object.values(fields).join(", "));
  err.name = "ValidationError";
  err.errors = {};
  Object.entries(fields).forEach(([path, message]) => {
    err.errors[path] = { message };
  });
  return err;
}

function clone(doc) {
  return JSON.parse(JSON.stringify(doc));
}

const INCIDENT_TYPES = ["flood", "fire", "road-block", "medical", "power-outage", "other"];
const WATER_LEVELS = ["low", "medium", "high"];
const STATUSES = ["pending", "in-progress", "resolved"];

const Report = {
  async create(data) {
    if (!INCIDENT_TYPES.includes(data.incidentType)) {
      throw makeValidationError({ incidentType: "incidentType is required" });
    }
    if (data.incidentType === "flood" && !WATER_LEVELS.includes(data.waterLevel)) {
      throw makeValidationError({
        waterLevel: "waterLevel is required when incidentType is 'flood'",
      });
    }

    const doc = {
      _id: nextId(),
      incidentType: data.incidentType,
      waterLevel: data.incidentType === "flood" ? data.waterLevel : undefined,
      location: data.location,
      details: data.details || "",
      media: data.media || [],
      voiceNote: data.voiceNote,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.push(doc);
    return clone(doc);
  },

  find(filter = {}) {
    let results = store.filter((doc) =>
      Object.entries(filter).every(([key, value]) => doc[key] === value)
    );
    const builder = {
      sort() {
        results = [...results].reverse();
        return builder;
      },
      skip(n) {
        results = results.slice(n);
        return builder;
      },
      limit(n) {
        results = results.slice(0, n);
        return builder;
      },
      then(resolve, reject) {
        return Promise.resolve(results.map(clone)).then(resolve, reject);
      },
    };
    return builder;
  },

  async countDocuments(filter = {}) {
    return store.filter((doc) => Object.entries(filter).every(([key, value]) => doc[key] === value))
      .length;
  },

  async findById(id) {
    const doc = store.find((d) => d._id === id);
    if (!doc) return null;
    const wrapper = clone(doc);
    wrapper.deleteOne = async () => {
      store = store.filter((d) => d._id !== id);
    };
    return wrapper;
  },

  async findByIdAndUpdate(id, update) {
    const doc = store.find((d) => d._id === id);
    if (!doc) return null;
    if (update.status && !STATUSES.includes(update.status)) {
      throw makeValidationError({ status: `\`${update.status}\` is not a valid enum value for path \`status\`.` });
    }
    Object.assign(doc, update, { updatedAt: new Date().toISOString() });
    return clone(doc);
  },

  __reset() {
    store = [];
    counter = 1;
  },
};

module.exports = Report;
