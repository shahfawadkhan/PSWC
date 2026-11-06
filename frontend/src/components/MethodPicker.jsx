import { inputCls, selectCls } from "../ui";

// A missing default becomes 11 x the sampling interval.
export function defaults(spec, sampling) {
  const o = {};
  spec.forEach((p) => (o[p.key] = p.default ?? Math.round(11 * sampling * 1000) / 1000));
  return o;
}

export default function MethodPicker({ title, group, methods, sampling, state, setState }) {
  const spec = methods[group][state.method] || [];
  const pick = (m) => setState({ method: m, ...defaults(methods[group][m], sampling) });
  const set = (k, v) => setState({ ...state, [k]: v });
  const checkbox = (key, label) => (
    <label key={key} className="mt-2 flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" className="accent-blue-600" checked={!!state[key]} onChange={(e) => set(key, e.target.checked)} />{label}
    </label>
  );
  return (
    <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <select className={selectCls} value={state.method} onChange={(e) => pick(e.target.value)}>
          {Object.keys(methods[group]).map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      {spec.map((p) => p.type === "bool" ? checkbox(p.key, p.label) : (
        <div key={p.key} className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>{p.label}</span>
          <input type="number" step="any" className={inputCls} value={state[p.key] ?? ""} onChange={(e) => set(p.key, parseFloat(e.target.value))} />
        </div>
      ))}
      {group === "outlier" && state.method !== "none" && state.method !== "cap" && checkbox("interpolate", "Replace removed points by interpolation")}
    </div>
  );
}
