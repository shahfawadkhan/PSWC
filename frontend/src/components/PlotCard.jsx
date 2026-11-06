import factory from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { cardCls } from "../ui";

const Plot = (factory.default || factory)(Plotly);

export default function PlotCard({ ds, col, setCol, data, onRelayout }) {
  const tr = (d, name, extra) => d && { x: d.t, y: d.v, name, connectgaps: false, type: "scatter", ...extra };
  const traces = data ? [
    tr(data.raw, "raw", { mode: "lines", line: { color: "#94a3b8", width: 1 } }),
    tr(data.clean, "cleaned", { mode: "lines", line: { color: "#1d4ed8", width: 1.5 } }),
    tr(data.out, "removed / capped", { mode: "markers", marker: { color: "#ef4444", size: 6 } }),
  ].filter(Boolean) : [];
  return (
    <div className={`${cardCls} mb-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Plot</h2>
        <div className="flex gap-1">
          {ds.columns.map((c) => (
            <button key={c} onClick={() => setCol(c)}
              className={`rounded-md border px-3 py-1 text-xs font-medium ${c === col ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-blue-400"}`}>{c}</button>
          ))}
        </div>
      </div>
      <p className="mb-2 mt-1 text-xs text-slate-500">Drag to zoom, double-click to reset. Zooming loads finer detail. Grey = raw, blue = cleaned, red = removed.</p>
      <Plot data={traces} onRelayout={onRelayout} useResizeHandler style={{ width: "100%", height: 460 }}
        layout={{ uirevision: `${ds.id}${col}`, margin: { l: 60, r: 20, t: 10, b: 50 }, paper_bgcolor: "rgba(0,0,0,0)", xaxis: { title: "UTC" }, yaxis: { title: `${col} (nT)` }, legend: { orientation: "h" } }}
        config={{ displaylogo: false }} />
    </div>
  );
}
