import Section from "./Section";
import { ghostBtn } from "../ui";
import { csvUrl } from "../api";

export default function ExportPanel({ ds, zone, fileIdx, win, hasRun, onSaveSettings }) {
  const go = (q) => (window.location = csvUrl(ds.id, { zone, ...q }));
  return (
    <Section n="3" title="Export" disabled={!ds}>
      <p className="mb-1 text-xs text-slate-500">Cleaned files keep the original file name plus _cl, _sm or _clsm. Times are saved in {zone.toUpperCase()}.</p>
      <button className={ghostBtn} disabled={!hasRun} onClick={() => go({ which: "clean", scope: "file", file: fileIdx })}>Cleaned data: this file</button>
      <button className={ghostBtn} disabled={!hasRun} onClick={() => go({ which: "clean", scope: "window", start: win.start, end: win.end })}>Cleaned data: whole plot window, one file</button>
      <button className={ghostBtn} disabled={!ds} onClick={() => go({ which: "raw", scope: "file", file: fileIdx })}>Standardised raw: this file</button>
      <button className={ghostBtn} disabled={!ds} onClick={onSaveSettings}>Settings (JSON)</button>
    </Section>
  );
}
