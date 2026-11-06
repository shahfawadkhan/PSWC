export default function Stats({ ds }) {
  const items = [
    ["Instrument", ds.instrument.toUpperCase()], ["Rows", ds.rows.toLocaleString()],
    ["Start (UTC)", ds.start.slice(0, 19)], ["End (UTC)", ds.end.slice(0, 19)],
    ["Sampling", `${ds.sampling_s.toFixed(3)} s`], ["Gaps", ds.gaps],
    ["Missing", Object.entries(ds.missing).map(([k, v]) => `${k}:${v}`).join(" ")],
  ];
  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-slate-200 border-l-4 border-l-blue-600 bg-white px-3 py-2 shadow-sm">
          <div className="text-xs text-slate-500">{k}</div>
          <div className="text-sm font-semibold text-slate-900">{v}</div>
        </div>
      ))}
    </div>
  );
}
