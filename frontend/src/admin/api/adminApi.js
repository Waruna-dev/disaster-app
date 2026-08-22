// Talks to the FloodGuard backend's admin-only endpoints.
// Set VITE_API_BASE_URL in frontend/.env to point at a different API host.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function getAdminToken() {
  return localStorage.getItem("adminToken");
}

async function parseResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    throw new Error(body?.message || `Request failed with status ${res.status}`);
  }
  return body;
}

function authHeaders(extra = {}) {
  const token = getAdminToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// --- Auth ---
export async function adminLogin(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(res);
}

// --- Summary ---
export async function fetchAdminSummary() {
  const res = await fetch(`${API_BASE_URL}/api/reports/admin/summary`, {
    headers: authHeaders(),
  });
  return parseResponse(res);
}

// --- Reports (pending / approved / rejected verification workflow) ---
export async function fetchAllReports() {
  const res = await fetch(`${API_BASE_URL}/api/reports?limit=100`, {
    headers: authHeaders(),
  });
  return parseResponse(res);
}

export async function approveReport(id) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}/approve`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return parseResponse(res);
}

export async function rejectReport(id, reason) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}/reject`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ reason }),
  });
  return parseResponse(res);
}

// --- Announcements ---
export async function fetchAnnouncements(all = true) {
  const res = await fetch(`${API_BASE_URL}/api/announcements${all ? "?all=true" : ""}`, {
    headers: authHeaders(),
  });
  return parseResponse(res);
}

export async function fetchPublishedAnnouncements() {
  const res = await fetch(`${API_BASE_URL}/api/announcements`);
  return parseResponse(res);
}

export async function previewTranslation(messageEn) {
  const res = await fetch(`${API_BASE_URL}/api/announcements/translate`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ messageEn }),
  });
  return parseResponse(res);
}

export async function createAnnouncement(formData) {
  const res = await fetch(`${API_BASE_URL}/api/announcements`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return parseResponse(res);
}

export async function updateAnnouncement(id, formData) {
  const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: formData,
  });
  return parseResponse(res);
}

export async function deleteAnnouncement(id) {
  const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseResponse(res);
}
