export default function Header({ ds, busy, zone }) {
  const chips = ds ? [ds.instrument.toUpperCase(), `${ds.rows.toLocaleString()} rows`, `Data in ${zone.toUpperCase()}`] : [];
  return (
    <header className="flex h-16 flex-none items-center justify-between bg-blue-700 px-6 text-white shadow">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-lg font-bold text-blue-700">P</div>
        <div>
          <h1 className="text-base font-semibold leading-tight">PSWC</h1>
          <p className="text-xs text-blue-100">Outlier removal and smoothing (Current Progress)</p>
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        {busy && <span className="rounded-full bg-white px-3 py-1 font-semibold text-blue-700">Working...</span>}
        {chips.map((c) => <span key={c} className="rounded-full bg-blue-600 px-3 py-1">{c}</span>)}
      </div>
    </header>
  );
}
