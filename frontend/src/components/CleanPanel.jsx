import Section from "./Section";
import MethodPicker from "./MethodPicker";
import { inputCls, primaryBtn, ghostBtn } from "../ui";

const pill = (on) => `rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-blue-400"}`;
const textCls = inputCls.replace("w-24", "w-44");

export default function CleanPanel({ ds, methods, zone, cols, setCols, outlier, setOutlier, smooth, setSmooth, scope, setScope, rStart, setRStart, rEnd, setREnd, zoom, useZoom, useWindow, onApply, onReset, busy, hasRun }) {
  const ready = ds && methods;
  const toggle = (c) => setCols(cols.includes(c) ? cols.filter((x) => x !== c) : [...cols, c]);
  return (
    <Section n="2" title="Clean" disabled={!ready}>
      {!ready && <p className="text-xs text-slate-500">Upload a file first.</p>}
      {ready && (<>
        <div className="mb-1 text-sm font-semibold text-slate-800">Columns</div>
        <div className="flex flex-wrap gap-2">
          {ds.columns.map((c) => <button key={c} type="button" onClick={() => toggle(c)} className={pill(cols.includes(c))}>{c}</button>)}
        </div>
        <MethodPicker title="Outliers" group="outlier" methods={methods} sampling={ds.sampling_s} state={outlier} setState={setOutlier} />
        {outlier.method === "manual" && <p className="mt-2 text-xs text-blue-700">Manual: the selected range is replaced by a straight line. Choose "Selected range" below (zoom onto the outlier, then press Use plot zoom).</p>}
        <MethodPicker title="Smoothing" group="smooth" methods={methods} sampling={ds.sampling_s} state={smooth} setState={setSmooth} />
        <div className="mt-3 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-600">
          <div className="mb-2 text-sm font-semibold text-slate-800">Apply to</div>
          <div className="flex gap-2">
            <button type="button" className={pill(scope === "file")} onClick={() => setScope("file")}>This file</button>
            <button type="button" className={pill(scope === "all")} onClick={() => setScope("all")}>All files</button>
            <button type="button" className={pill(scope === "range")} onClick={() => setScope("range")}>Selected range</button>
          </div>
          {scope === "range" && (<>
            <div className="mt-2 flex items-center justify-between gap-2"><span>Start ({zone.toUpperCase()})</span>
              <input className={textCls} placeholder="YYYY-MM-DD HH:MM:SS" value={rStart} onChange={(e) => setRStart(e.target.value)} /></div>
            <div className="mt-2 flex items-center justify-between gap-2"><span>End ({zone.toUpperCase()})</span>
              <input className={textCls} placeholder="YYYY-MM-DD HH:MM:SS" value={rEnd} onChange={(e) => setREnd(e.target.value)} /></div>
            <div className="mt-2 flex gap-2">
              <button type="button" className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-blue-50 disabled:opacity-40" disabled={!zoom} onClick={useZoom}>Use plot zoom</button>
              <button type="button" className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-blue-50" onClick={useWindow}>Use plot window</button>
            </div>
            <p className="mt-2 text-slate-500">Only this part is changed. The rest of the cleaned data is kept, so you can clean several parts one after another.</p>
          </>)}
        </div>
        <button className={primaryBtn} onClick={onApply} disabled={busy || !cols.length}>Apply</button>
        <button className={ghostBtn} onClick={onReset} disabled={busy || !hasRun}>Reset cleaning (back to raw)</button>
      </>)}
    </Section>
  );
}
