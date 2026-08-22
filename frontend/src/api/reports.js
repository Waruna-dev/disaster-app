// Talks to the Resilience Response backend (see /backend in the project root).
// Set VITE_API_BASE_URL in frontend/.env to point at a different API host.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function parseResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch (err) {
    // response had no JSON body (e.g. a network-level failure page)
  }

  if (!res.ok) {
    const message = body?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body;
}

/** Submits a new incident report. `formData` should be a FormData instance
 * built by the Submit Report form (text fields + "media" files + "voiceNote"). */
export async function createReport(formData) {
  const res = await fetch(`${API_BASE_URL}/api/reports`, {
    method: "POST",
    body: formData,
  });
  return parseResponse(res);
}

/** Lists reports. `params` may include incidentType, status, page, limit. */
export async function fetchReports(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
  ).toString();
  const res = await fetch(`${API_BASE_URL}/api/reports${query ? `?${query}` : ""}`);
  return parseResponse(res);
}

export async function fetchReportById(id) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}`);
  return parseResponse(res);
}

export async function updateReportStatus(id, status) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseResponse(res);
}

export async function deleteReport(id) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}`, { method: "DELETE" });
  return parseResponse(res);
}
