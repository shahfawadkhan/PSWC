export default function Section({ n, title, disabled, children }) {
  return (
    <section className={`mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${disabled ? "opacity-60" : ""}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}
