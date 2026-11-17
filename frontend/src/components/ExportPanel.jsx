import Section from "./Section";
import { ghostBtn } from "../ui";
import { csvUrl } from "../api";

export default function ExportPanel({ ds, zone, mode, days, fileIdx, win, hasRun, hasPlot, onPng, onSaveSettings }) {
  // always the working file: the one shown in the plot (one file, or the whole window when several days are shown)
  const query = (which) => (mode === "file" && days === 1 ? { which, scope: "file", file: fileIdx } : { which, scope: "window", start: win.start, end: win.end });
  const go = (which) => (window.location = csvUrl(ds.id, { zone, ...query(which) }));
  return (
    <Section n="3" title="Export" disabled={!ds}>
      <p className="mb-1 text-xs text-slate-500">Saves the working file (what is shown in the plot). The name is the original name plus _cl, _sm or _clsm (raw: _raw). Times are in {zone.toUpperCase()}.</p>
      <button className={ghostBtn} disabled={!hasRun} onClick={() => go("clean")}>ASCII file</button>
      <button className={ghostBtn} disabled={!ds} onClick={() => go("raw")}>Raw ASCII file</button>
      <button className={ghostBtn} disabled={!ds || !hasPlot} onClick={onPng}>PNG (graph)</button>
      <button className={ghostBtn} disabled={!ds} onClick={onSaveSettings}>Settings (JSON)</button>
    </Section>
  );
}
