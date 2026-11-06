import Section from "./Section";
import MethodPicker from "./MethodPicker";
import { primaryBtn } from "../ui";

export default function CleanPanel({ ds, methods, cols, setCols, outlier, setOutlier, smooth, setSmooth, onApply, busy }) {
  const ready = ds && methods;
  const toggle = (c) => setCols(cols.includes(c) ? cols.filter((x) => x !== c) : [...cols, c]);
  return (
    <Section n="2" title="Clean" disabled={!ready}>
      {!ready && <p className="text-xs text-slate-500">Upload a file first.</p>}
      {ready && (<>
        <div className="mb-1 text-sm font-semibold text-slate-800">Columns</div>
        <div className="flex flex-wrap gap-2">
          {ds.columns.map((c) => (
            <button key={c} type="button" onClick={() => toggle(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${cols.includes(c) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-blue-400"}`}>{c}</button>
          ))}
        </div>
        <MethodPicker title="Outliers" group="outlier" methods={methods} sampling={ds.sampling_s} state={outlier} setState={setOutlier} />
        <MethodPicker title="Smoothing" group="smooth" methods={methods} sampling={ds.sampling_s} state={smooth} setState={setSmooth} />
        <button className={primaryBtn} onClick={onApply} disabled={busy || !cols.length}>Apply</button>
      </>)}
    </Section>
  );
}
