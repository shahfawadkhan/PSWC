import Section from "./Section";
import { ghostBtn } from "../ui";
import { csvUrl } from "../api";

export default function ExportPanel({ ds, hasRun, onSaveSettings }) {
  const go = (which) => (window.location = csvUrl(ds.id, which));
  return (
    <Section n="3" title="Export" disabled={!ds}>
      <button className={ghostBtn} disabled={!hasRun} onClick={() => go("clean")}>Cleaned data (CSV)</button>
      <button className={ghostBtn} disabled={!ds} onClick={() => go("raw")}>Standardised raw, UTC (CSV)</button>
      <button className={ghostBtn} disabled={!ds} onClick={onSaveSettings}>Settings (JSON)</button>
    </Section>
  );
}
