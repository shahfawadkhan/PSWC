// All calls to the backend. Set VITE_API_URL when the backend is on another address.
export const API = import.meta.env.VITE_API_URL || "";

const request = async (path, opts) => {
  const r = await fetch(API + path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};

export const getMethods = () => request("/api/methods");
export const getStations = () => request("/api/stations");

export const uploadFiles = (files, instrument, station) => {
  const f = new FormData();
  files.forEach((x) => f.append("files", x));
  f.append("instrument", instrument);
  f.append("station", station);
  return request("/api/upload", { method: "POST", body: f });
};

const postJson = (path, body) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const processRun = (id, body) => postJson(`/api/datasets/${id}/process`, body);
export const resetCleaning = (id) => postJson(`/api/datasets/${id}/reset`, {});

export const getSeries = (id, col, range, zone) => {
  const q = new URLSearchParams({ col, zone });
  if (range) { q.set("start", range[0]); q.set("end", range[1]); }
  return request(`/api/datasets/${id}/series?${q}`);
};

// q: { which: "raw"|"clean", scope: "file"|"window"|"all", zone, file, start, end }
export const csvUrl = (id, q) => `${API}/api/datasets/${id}/csv?${new URLSearchParams(q)}`;
