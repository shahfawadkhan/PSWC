import { cardCls, selectCls } from "../ui";

const btn = "rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";
const seg = (on) => `px-3 py-1 text-xs font-semibold ${on ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`;

export default function FileBar({ ds, fileIdx, chooseFile, mode, chooseMode, days, chooseDays, step, canPrev, canNext }) {
  return (
    <div className={`${cardCls} mb-4 flex flex-wrap items-center gap-3`}>
      <button className={btn} disabled={!canPrev} onClick={() => step(-1)}>{"\u2190 Previous"}</button>
      <button className={btn} disabled={!canNext} onClick={() => step(1)}>{"Next \u2192"}</button>
      <select className={`${selectCls} max-w-xs`} value={fileIdx} onChange={(e) => chooseFile(Number(e.target.value))}>
        {ds.files.map((f) => <option key={f.index} value={f.index}>{f.index + 1}. {f.name}</option>)}
      </select>
      <span className="text-xs text-slate-500">File {fileIdx + 1} of {ds.files.length}</span>
      <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
        <span>Show</span>
        <div className="flex overflow-hidden rounded-md border border-slate-300">
          <button className={seg(mode === "file")} onClick={() => chooseMode("file")}>File</button>
          <button className={seg(mode === "day")} onClick={() => chooseMode("day")}>24 h day</button>
        </div>
        <span>Days in plot</span>
        <select className={selectCls} value={days} onChange={(e) => chooseDays(Number(e.target.value))}>
          {Array.from({ length: ds.max_days }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {ds.max_days === 1 && <span className="text-slate-400">(max 1 for {ds.instrument.toUpperCase()}: very large files)</span>}
      </div>
    </div>
  );
}
