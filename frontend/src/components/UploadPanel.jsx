import Section from "./Section";
import { inputCls, selectCls, primaryBtn } from "../ui";

export default function UploadPanel({ files, setFiles, instrument, setInstrument, tz, setTz, onUpload, busy }) {
  return (
    <Section n="1" title="Upload">
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-3 text-center text-sm text-blue-700 hover:border-blue-400">
        <input type="file" multiple className="hidden" onChange={(e) => setFiles([...e.target.files])} />
        {files.length ? `${files.length} file(s) selected` : "Choose files"}
      </label>
      <p className="mt-2 text-xs text-slate-500">NED .csv, dIdD .mag, LAMA .SON, GFGM .txt, or .zip files holding them.</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span>Instrument</span>
        <select className={selectCls} value={instrument} onChange={(e) => setInstrument(e.target.value)}>
          <option value="auto">auto-detect</option><option value="ned">NED</option><option value="didd">dIdD</option>
          <option value="lama">LAMA</option><option value="gfgm">GFGM</option>
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span>Clock ahead of UTC (h)</span>
        <input type="number" step="any" placeholder="default" className={inputCls} value={tz} onChange={(e) => setTz(e.target.value)} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Defaults: NED +5 (assumed Pakistan time), others 0.</p>
      <button className={primaryBtn} onClick={onUpload} disabled={busy || !files.length}>Upload</button>
    </Section>
  );
}
