import { cardCls } from "../ui";

const heads = ["Run", "Outliers", "Smoothing", "Column", "Removed", "%", "Noise before (nT)", "Noise after (nT)"];

export default function HistoryTable({ history }) {
  return (
    <div className={cardCls}>
      <h2 className="mb-2 text-sm font-semibold text-slate-800">Run history</h2>
      {!history.length && <p className="text-xs text-slate-500">Apply a cleaning method to see results here. Compare runs to choose the best settings.</p>}
      {history.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-blue-50 text-left text-xs text-blue-900">{heads.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {[...history].reverse().flatMap((h) => h.report.map((r) => (
                <tr key={`${h.n}${r.column}`} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-1.5">{h.n}</td><td className="px-3 py-1.5">{h.outlier.method}</td><td className="px-3 py-1.5">{h.smooth.method}</td>
                  <td className="px-3 py-1.5">{r.column}</td><td className="px-3 py-1.5">{r.outliers}</td><td className="px-3 py-1.5">{r.outlier_pct}</td>
                  <td className="px-3 py-1.5">{r.noise_before?.toFixed(3)}</td><td className="px-3 py-1.5">{r.noise_after?.toFixed(3)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
