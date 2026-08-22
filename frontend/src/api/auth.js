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

export async function registerUser(userData) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  return parseResponse(res);
}

export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  return parseResponse(res);
}

export async function getProfile(token) {
  const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });
  return parseResponse(res);
}
