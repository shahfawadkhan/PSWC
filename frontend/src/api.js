// All calls to the backend. Set VITE_API_URL when the backend is on another address.
export const API = import.meta.env.VITE_API_URL || "";

const request = async (path, opts) => {
  const r = await fetch(API + path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};

export const getMethods = () => request("/api/methods");

export const uploadFiles = (files, instrument, tz) => {
  const f = new FormData();
  files.forEach((x) => f.append("files", x));
  f.append("instrument", instrument);
  f.append("tz", tz);
  return request("/api/upload", { method: "POST", body: f });
};

export const processRun = (id, body) =>
  request(`/api/datasets/${id}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getSeries = (id, col, range) => {
  const q = new URLSearchParams({ col });
  if (range) { q.set("start", range[0]); q.set("end", range[1]); }
  return request(`/api/datasets/${id}/series?${q}`);
};

export const csvUrl = (id, which) => `${API}/api/datasets/${id}/csv?which=${which}`;
