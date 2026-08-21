const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function apiFetch(path, options = {}, token = "") {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = { message: "Request failed." };
    }
    throw new Error(payload.message || "Request failed.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
