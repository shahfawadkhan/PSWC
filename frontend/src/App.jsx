import { useEffect, useRef, useState } from "react";
import { getMethods, getSeries, processRun, uploadFiles } from "./api";
import Header from "./components/Header";
import UploadPanel from "./components/UploadPanel";
import CleanPanel from "./components/CleanPanel";
import ExportPanel from "./components/ExportPanel";
import Stats from "./components/Stats";
import PlotCard from "./components/PlotCard";
import HistoryTable from "./components/HistoryTable";
import Welcome from "./components/Welcome";

export default function App() {
  const [methods, setMethods] = useState(null);
  const [files, setFiles] = useState([]);
  const [instrument, setInstrument] = useState("auto");
  const [tz, setTz] = useState("");
  const [ds, setDs] = useState(null);
  const [cols, setCols] = useState([]);
  const [col, setCol] = useState("");
  const [outlier, setOutlier] = useState({ method: "none" });
  const [smooth, setSmooth] = useState({ method: "none" });
  const [history, setHistory] = useState([]);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const timer = useRef(null);

  useEffect(() => { getMethods().then(setMethods).catch((e) => setError(e.message)); }, []);

  const loadSeries = (range) => {
    if (ds && col) getSeries(ds.id, col, range).then(setData).catch((e) => setError(e.message));
  };
  useEffect(() => { loadSeries(null); }, [ds, col, version]);

  const run = async (job) => {
    setBusy(true); setError("");
    try { await job(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const onUpload = () => run(async () => {
    const d = await uploadFiles(files, instrument, tz);
    setDs(d); setCols(d.columns.filter((c) => c !== "Temp")); setCol(d.columns[0]);
    setHistory([]); setData(null); setOutlier({ method: "none" }); setSmooth({ method: "none" });
  });

  const onApply = () => run(async () => {
    const r = await processRun(ds.id, { columns: cols, outlier, smooth });
    setHistory((h) => [...h, { n: h.length + 1, outlier, smooth, report: r.report }]);
    setVersion((v) => v + 1);
  });

  const onRelayout = (ev) => {            // zoom: ask the backend for finer detail
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (ev["xaxis.range[0]"]) loadSeries([ev["xaxis.range[0]"], ev["xaxis.range[1]"]]);
      else if (ev["xaxis.autorange"]) loadSeries(null);
    }, 300);
  };

  const onSaveSettings = () => {
    const blob = new Blob([JSON.stringify({ instrument: ds.instrument, tz_applied: ds.tz_applied, columns: cols, outlier, smooth }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "cleaning_settings.json"; a.click();
  };

  return (
    <div className="flex h-screen flex-col">
      <Header ds={ds} busy={busy} />
      <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr]">
        <aside className="overflow-auto border-r border-slate-200 bg-slate-100/70 p-4">
          <UploadPanel {...{ files, setFiles, instrument, setInstrument, tz, setTz, onUpload, busy }} />
          <CleanPanel {...{ ds, methods, cols, setCols, outlier, setOutlier, smooth, setSmooth, onApply, busy }} />
          <ExportPanel ds={ds} hasRun={history.length > 0} onSaveSettings={onSaveSettings} />
        </aside>
        <main className="overflow-auto p-5">
          {error && (
            <div onClick={() => setError("")} className="mb-4 cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {error} <span className="text-xs font-normal">(click to dismiss)</span>
            </div>
          )}
          {!ds && <Welcome />}
          {ds && (<>
            <Stats ds={ds} />
            <PlotCard ds={ds} col={col} setCol={setCol} data={data} onRelayout={onRelayout} />
            <HistoryTable history={history} />
          </>)}
        </main>
      </div>
    </div>
  );
}
