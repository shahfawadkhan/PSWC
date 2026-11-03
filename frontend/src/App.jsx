import { useEffect, useRef, useState } from "react";
import factory from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
const Plot = (factory.default || factory)(Plotly);

const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};
const post = (url, body) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function defaults(spec, sampling) {
  const o = {};
  spec.forEach((p) => (o[p.key] = p.default ?? Math.round(11 * sampling * 1000) / 1000));
  return o;
}

function MethodPicker({ title, group, methods, sampling, state, setState }) {
  const spec = methods[group][state.method] || [];
  const pick = (m) => setState({ method: m, ...defaults(methods[group][m], sampling) });
  const set = (k, v) => setState({ ...state, [k]: v });
  return (
    <div className="group">
      <div className="row"><span className="lbl">{title}</span>
        <select value={state.method} onChange={(e) => pick(e.target.value)}>
          {Object.keys(methods[group]).map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      {spec.map((p) => p.type === "bool" ? (
        <label key={p.key} className="check"><input type="checkbox" checked={!!state[p.key]} onChange={(e) => set(p.key, e.target.checked)} /> {p.label}</label>
      ) : (
        <div className="row" key={p.key}><span className="sub">{p.label}</span>
          <input type="number" step="any" value={state[p.key] ?? ""} onChange={(e) => set(p.key, parseFloat(e.target.value))} />
        </div>
      ))}
      {group === "outlier" && state.method !== "none" && state.method !== "cap" && (
        <label className="check"><input type="checkbox" checked={!!state.interpolate} onChange={(e) => set("interpolate", e.target.checked)} /> Replace removed points by interpolation</label>
      )}
    </div>
  );
}

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

  useEffect(() => { api("/api/methods").then(setMethods).catch((e) => setError(e.message)); }, []);

  const loadSeries = (range) => {
    if (!ds || !col) return;
    const q = new URLSearchParams({ col });
    if (range) { q.set("start", range[0]); q.set("end", range[1]); }
    api(`/api/datasets/${ds.id}/series?${q}`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(() => { loadSeries(null); }, [ds, col, version]);

  const upload = async () => {
    setBusy(true); setError("");
    try {
      const f = new FormData();
      files.forEach((x) => f.append("files", x));
      f.append("instrument", instrument); f.append("tz", tz);
      const d = await api("/api/upload", { method: "POST", body: f });
      setDs(d); setCols(d.columns.filter((c) => c !== "Temp")); setCol(d.columns[0]);
      setHistory([]); setData(null);
      setOutlier({ method: "none" }); setSmooth({ method: "none" });
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const apply = async () => {
    setBusy(true); setError("");
    try {
      const r = await post(`/api/datasets/${ds.id}/process`, { columns: cols, outlier, smooth });
      setHistory((h) => [...h, { n: h.length + 1, outlier, smooth, report: r.report }]);
      setVersion((v) => v + 1);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const onRelayout = (ev) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (ev["xaxis.range[0]"]) loadSeries([ev["xaxis.range[0]"], ev["xaxis.range[1]"]]);
      else if (ev["xaxis.autorange"]) loadSeries(null);
    }, 300);
  };

  const trace = (d, name, extra) => d && { x: d.t, y: d.v, name, connectgaps: false, ...extra };
  const traces = data ? [
    trace(data.raw, "raw", { type: "scatter", mode: "lines", line: { color: "#aab2bf", width: 1 } }),
    trace(data.clean, "cleaned", { type: "scatter", mode: "lines", line: { color: "#1f5fbf", width: 1.5 } }),
    trace(data.out, "removed / capped", { type: "scatter", mode: "markers", marker: { color: "#d62728", size: 6 } }),
  ].filter(Boolean) : [];

  const saveSettings = () => {
    const blob = new Blob([JSON.stringify({ instrument: ds.instrument, tz_applied: ds.tz_applied, columns: cols, outlier, smooth }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cleaning_settings.json"; a.click();
  };
  const hasRun = history.length > 0;
  const stat = (k, v) => <div className="stat" key={k}><span>{k}</span><b>{v}</b></div>;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">P</div>
          <div><h1>PSWC Magnetometer Data Cleaner</h1><p>Outlier removal and smoothing</p></div>
        </div>
        <div className="chips">
          {busy && <span className="chip warn">Working...</span>}
          {ds && <><span className="chip">{ds.instrument.toUpperCase()}</span><span className="chip">{ds.rows.toLocaleString()} rows</span><span className="chip">Time: UTC</span></>}
        </div>
      </header>

      <div className="body">
        <aside className="side">
          <section>
            <h2><span className="num">1</span> Upload</h2>
            <label className="file">
              <input type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
              <span>{files.length ? `${files.length} file(s) selected` : "Choose files"}</span>
            </label>
            <p className="hint">NED .csv, dIdD .mag, LAMA .SON, GFGM .txt, or .zip files holding them.</p>
            <div className="row"><span className="sub">Instrument</span>
              <select value={instrument} onChange={(e) => setInstrument(e.target.value)}>
                <option value="auto">auto-detect</option><option value="ned">NED</option><option value="didd">dIdD</option>
                <option value="lama">LAMA</option><option value="gfgm">GFGM</option>
              </select></div>
            <div className="row"><span className="sub">Clock ahead of UTC (h)</span>
              <input type="number" step="any" placeholder="default" value={tz} onChange={(e) => setTz(e.target.value)} /></div>
            <p className="hint">Defaults: NED +5 (assumed Pakistan time), others 0.</p>
            <button className="primary" onClick={upload} disabled={busy || !files.length}>Upload</button>
          </section>

          <section className={ds && methods ? "" : "off"}>
            <h2><span className="num">2</span> Clean</h2>
            {ds && methods && (<>
              <div className="lbl">Columns</div>
              <div className="pills">{ds.columns.map((c) => (
                <label key={c} className={"pill" + (cols.includes(c) ? " on" : "")}>
                  <input type="checkbox" checked={cols.includes(c)} onChange={(e) => setCols(e.target.checked ? [...cols, c] : cols.filter((x) => x !== c))} />{c}
                </label>))}</div>
              <MethodPicker title="Outliers" group="outlier" methods={methods} sampling={ds.sampling_s} state={outlier} setState={setOutlier} />
              <MethodPicker title="Smoothing" group="smooth" methods={methods} sampling={ds.sampling_s} state={smooth} setState={setSmooth} />
              <button className="primary" onClick={apply} disabled={busy || !cols.length}>Apply</button>
            </>)}
            {!ds && <p className="hint">Upload a file first.</p>}
          </section>

          <section className={ds ? "" : "off"}>
            <h2><span className="num">3</span> Export</h2>
            <button className="ghost" disabled={!hasRun} onClick={() => (window.location = `/api/datasets/${ds.id}/csv?which=clean`)}>Cleaned data (CSV)</button>
            <button className="ghost" disabled={!ds} onClick={() => (window.location = `/api/datasets/${ds.id}/csv?which=raw`)}>Standardised raw, UTC (CSV)</button>
            <button className="ghost" disabled={!ds} onClick={saveSettings}>Settings (JSON)</button>
          </section>
        </aside>

        <main className="main">
          {error && <div className="err" onClick={() => setError("")}>{error} <span>(click to dismiss)</span></div>}

          {!ds && (
            <div className="card welcome">
              <h2>Welcome</h2>
              <p>Clean magnetometer data in three steps:</p>
              <ol><li><b>Upload</b> one or many files from any instrument.</li>
                <li><b>Clean</b>: pick an outlier method and a smoothing method, then Apply.</li>
                <li><b>Check</b> the plot and the run table, then export the result.</li></ol>
            </div>
          )}

          {ds && (<>
            <div className="stats">
              {stat("Instrument", ds.instrument.toUpperCase())}{stat("Rows", ds.rows.toLocaleString())}
              {stat("Start (UTC)", ds.start.slice(0, 19))}{stat("End (UTC)", ds.end.slice(0, 19))}
              {stat("Sampling", `${ds.sampling_s.toFixed(3)} s`)}{stat("Gaps", ds.gaps)}
              {stat("Missing", Object.entries(ds.missing).map(([k, v]) => `${k}:${v}`).join(" "))}
            </div>

            <div className="card">
              <div className="cardhead">
                <h2>Plot</h2>
                <div className="tabs">{ds.columns.map((c) => <button key={c} className={"tab" + (c === col ? " on" : "")} onClick={() => setCol(c)}>{c}</button>)}</div>
              </div>
              <p className="hint">Drag to zoom, double-click to reset. Zooming loads finer detail. Grey = raw, blue = cleaned, red = removed.</p>
              <Plot data={traces} onRelayout={onRelayout} useResizeHandler style={{ width: "100%", height: 460 }}
                layout={{ uirevision: `${ds.id}${col}`, margin: { l: 60, r: 20, t: 10, b: 50 }, paper_bgcolor: "rgba(0,0,0,0)", xaxis: { title: "UTC" }, yaxis: { title: `${col} (nT)` }, legend: { orientation: "h" } }}
                config={{ displaylogo: false }} />
            </div>

            <div className="card">
              <h2>Run history</h2>
              {!hasRun && <p className="hint">Apply a cleaning method to see results here. Compare runs to choose the best settings.</p>}
              {hasRun && (
                <div className="scroll"><table><thead><tr><th>Run</th><th>Outliers</th><th>Smoothing</th><th>Column</th><th>Removed</th><th>%</th><th>Noise before (nT)</th><th>Noise after (nT)</th></tr></thead>
                  <tbody>{[...history].reverse().flatMap((h) => h.report.map((r) => (
                    <tr key={`${h.n}${r.column}`}><td>{h.n}</td><td>{h.outlier.method}</td><td>{h.smooth.method}</td><td>{r.column}</td>
                      <td>{r.outliers}</td><td>{r.outlier_pct}</td><td>{r.noise_before?.toFixed(3)}</td><td>{r.noise_after?.toFixed(3)}</td></tr>
                  )))}</tbody></table></div>
              )}
            </div>
          </>)}
        </main>
      </div>
    </div>
  );
}
