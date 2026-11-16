// Times are plain strings "YYYY-MM-DD HH:MM:SS" in the zone being shown (UTC or LT).
const toDate = (s) => new Date(s.replace(" ", "T").slice(0, 19) + "Z");
export const fmt = (d) => d.toISOString().slice(0, 19).replace("T", " ");
export const addDays = (s, n) => fmt(new Date(toDate(s).getTime() + n * 86400000));
