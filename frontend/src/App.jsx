import { useEffect, useRef, useState } from "react";
import { getMethods, getSeries, getStations, processRun, resetCleaning, uploadFiles } from "./api";
import Plotly from "plotly.js-basic-dist-min";
import { addDays, addSeconds } from "./time";
import Header from "./components/Header";
import UploadPanel from "./components/UploadPanel";
import CleanPanel from "./components/CleanPanel";
import ExportPanel from "./components/ExportPanel";
import Stats from "./components/Stats";
import FileBar from "./components/FileBar";
import PlotCard from "./components/PlotCard";
import HistoryTable from "./components/HistoryTable";
import Welcome from "./components/Welcome";

export default function App() {
  const [methods, setMethods] = useState(null);
  const [stations, setStations] = useState([]);
  const [files, setFiles] = useState([]);
  const [instrument, setInstrument] = useState("auto");
  const [station, setStation] = useState("auto");
  const [ds, setDs] = useState(null);
  const [zone, setZone] = useState("utc");          // time zone shown: "utc" or "lt" (Pakistan time = UTC + 5)
  const [fileIdx, setFileIdx] = useState(0);
  const [mode, setMode] = useState("file");         // "file" = the file's own span, "day" = 24 h days in the shown zone
  const [days, setDays] = useState(1);
  const [dayShift, setDayShift] = useState(0);
  const [cols, setCols] = useState([]);
  const [col, setCol] = useState("");
  const [outlier, setOutlier] = useState({ method: "none" });
  const [smooth, setSmooth] = useState({ method: "none" });
  const [scope, setScope] = useState("file");       // clean "all" files, "this file" (default) or a selected "range"
  const [rStart, setRStart] = useState("");
  const [rEnd, setREnd] = useState("");
  const [zoom, setZoom] = useState(null);
  const [history, setHistory] = useState([]);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const timer = useRef(null);
  const graph = useRef(null);                   // the plot element, used for the PNG export
  const [ops, setOps] = useState([]);           // what was applied: "cl" (outliers) and/or "sm" (smoothing)

  useEffect(() => {
    getMethods().then(setMethods).catch((e) => setError(e.message));
    getStations().then(setStations).catch(() => {});
  }, []);

  // The time window shown in the plot (strings in the shown zone)
  let win = null;
  if (ds) {
    const f = ds.files[fileIdx], s0 = f[`start_${zone}`].slice(0, 19);
    if (mode === "day") {
      const start = addDays(`${s0.slice(0, 10)} 00:00:00`, dayShift * days);
      win = { start, end: addDays(start, days) };
    } else {
      win = { start: s0, end: days === 1 ? f[`end_${zone}`].slice(0, 19) : addDays(s0, days) };
    }
  }

  const loadSeries = (range) => {
    if (ds && col && win) getSeries(ds.id, col, range || [win.start, win.end], zone).then(setData).catch((e) => setError(e.message));
  };
  useEffect(() => { setZoom(null); loadSeries(null); }, [ds, col, zone, win && win.start, win && win.end]);
  useEffect(() => { if (version) loadSeries(zoom); }, [version]);

  const run = async (job) => {
    setBusy(true); setError("");
    try { await job(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const onUpload = () => run(async () => {
    const d = await uploadFiles(files, instrument, station);
    setDs(d); setZone(d.native.toLowerCase()); setFileIdx(0); setMode("file"); setDays(1); setDayShift(0);
    setCols(d.columns.filter((c) => c !== "Temp")); setCol(d.columns[0]);
    setHistory([]); setData(null); setOutlier({ method: "none" }); setSmooth({ method: "none" });
    setScope("file"); setRStart(""); setREnd(""); setOps([]);
  });

  const onApply = () => run(async () => {
    if (scope === "range" && (!rStart || !rEnd)) throw new Error("Type a start and an end time for the range, or press 'Use plot zoom'.");
    let range = null;
    if (scope === "range") range = { start: rStart, end: rEnd };
    else if (scope === "file") { const f = ds.files[fileIdx]; range = { start: f[`start_${zone}`], end: f[`end_${zone}`] }; }
    const r = await processRun(ds.id, { columns: cols, outlier, smooth, zone, range });
    setOps(r.ops);
    setHistory((h) => [...h, { n: h.length + 1, outlier, smooth, range, report: r.report }]);
    setVersion((v) => v + 1);
  });

  const onReset = () => run(async () => { await resetCleaning(ds.id); setHistory([]); setOps([]); setVersion((v) => v + 1); });

  // file / day navigation
  const chooseFile = (i) => { setFileIdx(Math.max(0, Math.min(ds.files.length - 1, i))); setDayShift(0); };
  const chooseMode = (m) => { setMode(m); setDayShift(0); };
  const chooseDays = (n) => { setDays(n); setDayShift(0); };
  const chooseZone = (z) => { setZone(z); setDayShift(0); };
  const step = (dir) => (mode === "file" ? chooseFile(fileIdx + dir) : setDayShift((s) => s + dir));
  const dsStart = ds ? ds[`start_${zone}`].slice(0, 19) : "", dsEnd = ds ? ds[`end_${zone}`].slice(0, 19) : "";
  const canPrev = ds && (mode === "file" ? fileIdx > 0 : win.start > `${dsStart.slice(0, 10)} 00:00:00`);
  const canNext = ds && (mode === "file" ? fileIdx < ds.files.length - 1 : win.end <= dsEnd);

  // title above the plot: station | file name(s) | time span (zone)
  let title = "";
  if (ds) {
    const inWin = ds.files.filter((f) => f[`end_${zone}`].slice(0, 19) >= win.start && f[`start_${zone}`].slice(0, 19) <= win.end);
    const label = !inWin.length ? ds.files[fileIdx].name : inWin.length === 1 ? inWin[0].name : `${inWin[0].name} ... ${inWin[inWin.length - 1].name} (${inWin.length} files)`;
    title = `${ds.station || ds.instrument.toUpperCase()} | ${label} | ${win.start.slice(0, 16)} to ${win.end.slice(0, 16)} (${zone.toUpperCase()})`;
  }

  const onRelayout = (ev) => {            // zoom: remember the range and ask the backend for finer detail
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (ev["xaxis.range[0]"]) { const r = [ev["xaxis.range[0]"], ev["xaxis.range[1]"]]; setZoom(r); loadSeries(r); }
      else if (ev["xaxis.autorange"]) { setZoom(null); loadSeries(null); }
    }, 300);
  };
  const useZoom = () => { if (zoom) { setRStart(String(zoom[0]).slice(0, 19)); setREnd(String(zoom[1]).slice(0, 19)); } };
  const useWindow = () => { setRStart(win.start); setREnd(win.end); };

  // PNG of the plot, named like the ASCII file: original name + _cl / _sm / _clsm (raw: _raw) + column
  const suffix = ops.includes("cl") && ops.includes("sm") ? "clsm" : ops.includes("cl") ? "cl" : ops.includes("sm") ? "sm" : "raw";
  const code = ds ? ds.station || ds.instrument.toUpperCase() : "";
  const day8 = (s) => s.slice(0, 10).replaceAll("-", "");
  const base = !ds ? "" : mode === "file" && days === 1 ? ds.files[fileIdx].name.replace(/\.[^.]+$/, "") : `${code}_${day8(win.start)}_${day8(addSeconds(win.end, -1))}_${zone.toUpperCase()}`;
  const onPng = () => Plotly.downloadImage(graph.current, { format: "png", width: 1600, height: 800, scale: 1, filename: `${base}_${suffix}_${col}` });

  const onSaveSettings = () => {
    const blob = new Blob([JSON.stringify({ instrument: ds.instrument, station: ds.station, file_time: ds.native, time_shown: zone.toUpperCase(), columns: cols, outlier, smooth, history: history.map((h) => ({ outlier: h.outlier, smooth: h.smooth, range: h.range })) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "cleaning_settings.json"; a.click();
  };

  return (
    <div className="flex h-screen flex-col">
      <Header ds={ds} busy={busy} zone={zone} />
      <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr]">
        <aside className="overflow-auto border-r border-slate-200 bg-slate-100/70 p-4">
          <UploadPanel {...{ files, setFiles, instrument, setInstrument, stations, station, setStation, ds, zone, setZone: chooseZone, onUpload, busy }} />
          <CleanPanel {...{ ds, methods, zone, cols, setCols, outlier, setOutlier, smooth, setSmooth, scope, setScope, rStart, setRStart, rEnd, setREnd, zoom, useZoom, useWindow, onApply, onReset, busy, hasRun: history.length > 0 }} />
          <ExportPanel {...{ ds, zone, mode, days, fileIdx, win, onPng, onSaveSettings }} hasRun={history.length > 0} hasPlot={!!data} />
        </aside>
        <main className="overflow-auto p-5">
          {error && (
            <div onClick={() => setError("")} className="mb-4 cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {error} <span className="text-xs font-normal">(click to dismiss)</span>
            </div>
          )}
          {!ds && <Welcome />}
          {ds && (<>
            <Stats ds={ds} zone={zone} />
            <FileBar {...{ ds, fileIdx, chooseFile, mode, chooseMode, days, chooseDays, step, canPrev, canNext }} />
            <PlotCard ds={ds} zone={zone} col={col} setCol={setCol} data={data} onRelayout={onRelayout} onGraph={(gd) => (graph.current = gd)} title={title} win={win} />
            <HistoryTable history={history} />
          </>)}
        </main>
      </div>
    </div>
  );
}
