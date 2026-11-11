import Section from "./Section";
import { ghostBtn } from "../ui";
import { csvUrl } from "../api";

export default function ExportPanel({ ds, zone, hasRun, onSaveSettings }) {
  const go = (which) => (window.location = csvUrl(ds.id, which, zone));
  return (
    <Section n="3" title="Export" disabled={!ds}>
      <button className={ghostBtn} disabled={!hasRun} onClick={() => go("clean")}>{`Cleaned data, ${zone.toUpperCase()} (CSV)`}</button>
      <button className={ghostBtn} disabled={!ds} onClick={() => go("raw")}>{`Standardised raw, ${zone.toUpperCase()} (CSV)`}</button>
      <button className={ghostBtn} disabled={!ds} onClick={onSaveSettings}>Settings (JSON)</button>
    </Section>
  );
}
