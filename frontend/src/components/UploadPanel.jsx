import Section from "./Section";
import { selectCls, primaryBtn } from "../ui";

export default function UploadPanel({ files, setFiles, instrument, setInstrument, ds, zone, setZone, onUpload, busy }) {
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
      <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>Show data in</span>
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            {["utc", "lt"].map((z) => (
              <button key={z} type="button" disabled={!ds} onClick={() => setZone(z)}
                className={`px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${ds && zone === z ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`}>{z.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {ds ? `This ${ds.instrument.toUpperCase()} file is in ${ds.native}. ` : "NED files are in LT, all other instruments are in UTC. "}
          LT = UTC + 5 (Pakistan).
        </p>
      </div>
      <button className={primaryBtn} onClick={onUpload} disabled={busy || !files.length}>Upload</button>
    </Section>
  );
}
