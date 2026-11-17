import factory from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { cardCls } from "../ui";

const Plot = (factory.default || factory)(Plotly);

export default function PlotCard({ ds, zone, col, setCol, data, onRelayout, onGraph, title, win }) {
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
      <p className="mb-1 mt-1 text-xs text-slate-500">Drag to zoom, double-click to reset. Grey = raw, blue = cleaned, red = removed.</p>
      <Plot data={traces} onRelayout={onRelayout} onInitialized={(f, gd) => onGraph(gd)} onUpdate={(f, gd) => onGraph(gd)} useResizeHandler style={{ width: "100%", height: 480 }}
        layout={{
          title: { text: title, font: { size: 13 }, x: 0.02, xanchor: "left" },
          uirevision: `${ds.id}${col}${zone}${win.start}${win.end}`,
          margin: { l: 75, r: 20, t: 45, b: 50 }, paper_bgcolor: "rgba(0,0,0,0)",
          xaxis: { title: zone.toUpperCase(), range: [win.start, win.end] },
          yaxis: { title: `${col} (nT)`, exponentformat: "none", tickformat: "~f", hoverformat: ".2f" },   // plain numbers: no "k", no commas
          legend: { orientation: "h" },
        }}
        config={{ displaylogo: false }} />
    </div>
  );
}
