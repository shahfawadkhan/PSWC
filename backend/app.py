"""PSWC magnetometer cleaning backend: read files -> UTC table -> remove outliers -> smooth."""
import io, re, uuid, zipfile
from collections import OrderedDict
import numpy as np, pandas as pd
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024**3
DATA = OrderedDict()                      # dataset id -> {raw, clean, mask, meta}; kept in memory only
TZ = {"ned": 5, "didd": 0, "lama": 0, "gfgm": 0}   # default: hours the file clock is AHEAD of UTC (NED assumed PKT)
MONTHS = {m: i + 1 for i, m in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split())}

# ------------------------------------------------------------------ readers
def read_ned(name, raw):
    df = pd.read_csv(io.BytesIO(raw))
    df.columns = ["time", "X", "Y", "Z", "F"][: len(df.columns)]
    df.index = pd.to_datetime(df.pop("time"))
    return df.where(df.abs() < 9999990)                       # 9999999 = missing

def read_didd(name, raw):
    day = pd.Timestamp(re.search(r"(\d{8})", name).group(1))   # date comes from file name YYYYMMDD.mag
    rows = [l.split() for l in raw.decode("ascii", "replace").splitlines() if l.strip() and not l.startswith("//")]
    a = np.array([r[:18] for r in rows if len(r) >= 18], dtype=float)
    t = a[:, 0]; sec = (t // 10000) * 3600 + (t % 10000 // 100) * 60 + t % 100
    return pd.DataFrame({"F": a[:, 1], "X": a[:, 16], "Y": a[:, 15], "Z": a[:, 17],
                         "Inc": a[:, 11], "Dec": a[:, 13]}, index=day + pd.to_timedelta(sec, unit="s"))

def read_lama(name, raw):
    out, h0, k = [], None, 0
    for line in raw.decode("ascii", "replace").splitlines():
        p = line.split()
        if not p: continue
        if p[0] == "SON":                                        # header: SON AUG0124 214 00 HDZF ...
            d = p[1]; h0 = pd.Timestamp(2000 + int(d[5:7]), MONTHS[d[:3]], int(d[3:5]), int(p[3])); k = 0; continue
        if h0 is None or len(p) < 8: continue
        v = [np.nan if set(x) == {"9"} else float(x) for x in p[:8]]
        for j in range(2):                                       # one line = 2 minutes
            out.append((h0 + pd.Timedelta(minutes=2 * k + j), *v[4 * j: 4 * j + 4]))
        k += 1
    df = pd.DataFrame(out, columns=["time", "H", "D", "Z", "F"]).set_index("time")
    return df / [10, 100, 10, 10]                                # D in arc-minutes

def read_gfgm(name, raw):
    lines = raw.decode("utf-8", "replace").replace("\r", "").split("\n")
    meta = {l.split(":", 1)[0].strip(): l.split(":", 1)[1].strip() for l in lines[:60] if ":" in l}
    hl = int(meta["FileHeadLength"].split()[0])
    d = pd.read_csv(io.StringIO("\n".join(lines[hl:])), sep=r"\s+", header=None, names=["t", "X", "Y", "Z", "Temp"])
    n = len(d)
    try:   # exact path: constant sample interval between header start and end times (~60.095 Hz)
        t0, t1 = pd.Timestamp(meta["DataStartTime"]), pd.Timestamp(meta["DataEndTime"])
        if int(meta["RecordNumber"].split()[0]) != n: raise ValueError
        idx = t0 + pd.to_timedelta(np.arange(n) * ((t1 - t0).total_seconds() / (n - 1)), unit="s")
    except Exception:   # fallback: whole-second labels, rows spread evenly inside each second
        day = pd.Timestamp(re.search(r"(\d{8})T", name).group(1))
        sec = pd.to_timedelta(d["t"]).dt.total_seconds().to_numpy()
        sec = sec + 86400 * np.cumsum(np.r_[0, np.diff(sec) < -43200])
        g = pd.Series(sec).groupby(sec)
        idx = day + pd.to_timedelta(sec + (g.cumcount().to_numpy() + 0.5) / g.transform("size").to_numpy(), unit="s")
    d.index = idx
    return d[["X", "Y", "Z", "Temp"]]

READERS = {"ned": read_ned, "didd": read_didd, "lama": read_lama, "gfgm": read_gfgm}

def detect(name):
    n = name.lower()
    if n.endswith(".son"): return "lama"
    if n.endswith(".mag"): return "didd"
    if n.endswith(".csv"): return "ned"
    if n.endswith(".txt"): return "gfgm"

def load(files, instrument, tz):
    items = []
    for name, raw in files:                                      # expand zips
        if name.lower().endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                items += [(m, z.read(m)) for m in z.namelist() if not m.endswith("/")]
        else:
            items.append((name, raw))
    kinds = {detect(n) if instrument == "auto" else instrument for n, _ in items}
    items = [(n, r) for n, r in items if (detect(n) if instrument == "auto" else instrument)]
    kinds.discard(None)
    if len(kinds) != 1: raise ValueError(f"Could not work out one instrument type (found: {sorted(kinds) or 'none'}). Pick it manually.")
    kind = kinds.pop()
    parts = [READERS[kind](n.replace("\\", "/").split("/")[-1], r) for n, r in items if detect(n) == kind or instrument != "auto"]
    df = pd.concat(parts).sort_index()
    df = df[~df.index.duplicated()]
    shift = TZ[kind] if tz is None else tz
    df.index = (df.index - pd.Timedelta(hours=shift)).astype("datetime64[ns]")   # -> UTC
    df.index.name = "time_utc"
    return kind, shift, df.astype(float)

# ------------------------------------------------------------------ cleaning
def roll(s, w, **kw): return s.rolling(pd.Timedelta(seconds=float(w)), **kw)

def noise(s):                                                    # robust noise from first differences
    d = np.diff(s.to_numpy()); d = d[np.isfinite(d)]
    return float(1.4826 * np.median(np.abs(d - np.median(d))) / np.sqrt(2)) if len(d) else None

def find_outliers(s, m, p):
    if m == "range": return (s < p["min"]) | (s > p["max"])
    if m == "zscore":
        mu, sd = roll(s, p["window_s"], center=True, min_periods=3).mean(), roll(s, p["window_s"], center=True, min_periods=3).std()
        return (s - mu).abs() > p["k"] * sd
    med = roll(s, p["window_s"], center=True, min_periods=3).median()
    r = s - med
    if m == "threshold": return r.abs() > p["nT"]
    if m == "hampel":
        mad = roll(r.abs(), p["window_s"], center=True, min_periods=3).median() * 1.4826
        return r.abs() > p["k"] * mad.clip(lower=0.05)           # 0.05 nT floor so flat stretches are not over-flagged
    if m == "trim": return (r < r.quantile(p["low"] / 100)) | (r > r.quantile(p["high"] / 100))
    raise ValueError(f"unknown outlier method {m}")

def clean_column(s, o, sm):
    mask, x, m = pd.Series(False, index=s.index), s.copy(), o.get("method", "none")
    if m == "cap":                                               # capping: pull extremes back to the percentile limits
        med = roll(s, o["window_s"], center=True, min_periods=3).median(); r = s - med
        lo, hi = r.quantile(o["low"] / 100), r.quantile(o["high"] / 100)
        x, mask = (med + r.clip(lo, hi)).fillna(s), (r < lo) | (r > hi)
    elif m != "none":
        mask = find_outliers(s, m, o); x = s.mask(mask)
        if o.get("interpolate"): x = x.where(~mask, x.interpolate(method="time", limit_area="inside"))
    gaps, k = x.isna(), sm.get("method", "none")
    if k in ("mean", "median"):
        r = roll(x, sm["window_s"], center=bool(sm.get("center", True)), min_periods=1)
        x = r.mean() if k == "mean" else r.median()
    elif k == "exp":
        dt = float(np.median(np.diff(x.index.values[:200000])) / np.timedelta64(1, "s"))
        a = 1 - np.exp(-np.log(2) * dt / float(sm["halflife_s"]))
        y = x.ewm(alpha=a).mean()
        x = (y + x[::-1].ewm(alpha=a).mean()[::-1]) / 2 if sm.get("zero_phase", True) else y
    return x.mask(gaps), mask & s.notna()

W = {"key": "window_s", "label": "Window (s)", "default": None}
Q = [W, {"key": "low", "label": "Lower %", "default": 0.5}, {"key": "high", "label": "Upper %", "default": 99.5}]
C = {"key": "center", "label": "Centered (untick = real-time/trailing)", "type": "bool", "default": True}
METHODS = {
    "outlier": {"none": [], "hampel": [W, {"key": "k", "label": "k x MAD", "default": 5}],
                "threshold": [W, {"key": "nT", "label": "Max deviation from median (nT)", "default": 10}],
                "zscore": [W, {"key": "k", "label": "k x std", "default": 4}], "trim": Q, "cap": Q,
                "range": [{"key": "min", "label": "Min", "default": 0}, {"key": "max", "label": "Max", "default": 100000}]},
    "smooth": {"none": [], "mean": [W, C], "median": [W, C],
               "exp": [{"key": "halflife_s", "label": "Half-life (s)", "default": None},
                       {"key": "zero_phase", "label": "Zero phase (no lag)", "type": "bool", "default": True}]}}

# ------------------------------------------------------------------ helpers
def decimate(s, n=4000):                                         # keeps min and max per bucket so spikes stay visible
    v, k = s.to_numpy(float), len(s)
    if k <= n: return s.index, v
    m = -(-k // (n // 2)); vp = np.concatenate([v, np.full((-k) % m, np.nan)]).reshape(-1, m)
    lo, hi = np.where(np.isnan(vp), np.inf, vp).argmin(1), np.where(np.isnan(vp), -np.inf, vp).argmax(1)
    base = np.arange(vp.shape[0]) * m
    i = np.minimum(np.sort(np.stack([base + lo, base + hi], 1), 1).ravel(), k - 1)
    return s.index[i], v[i]

def pack(idx, v):
    return {"t": list(pd.DatetimeIndex(idx).strftime("%Y-%m-%dT%H:%M:%S.%f")),
            "v": np.where(np.isnan(v), None, np.round(v, 3)).tolist()}

def get(i):
    if i not in DATA: raise KeyError("Dataset not found (the server may have restarted). Upload again.")
    return DATA[i]

@app.errorhandler(Exception)
def fail(e): return jsonify(error=str(e)), 400

# ------------------------------------------------------------------ routes
@app.get("/api/methods")
def methods(): return jsonify(METHODS)

@app.post("/api/upload")
def upload():
    files = [(f.filename, f.read()) for f in request.files.getlist("files")]
    tz = request.form.get("tz", "").strip()
    kind, shift, df = load(files, request.form.get("instrument", "auto"), float(tz) if tz else None)
    dt = float(np.median(np.diff(df.index.values[:200000])) / np.timedelta64(1, "s"))
    big = np.diff(df.index.values) > np.timedelta64(int(max(3 * dt, 1) * 1e9), "ns")
    i = uuid.uuid4().hex[:8]
    DATA[i] = {"raw": df, "clean": None, "mask": None, "kind": kind}
    while len(DATA) > 4: DATA.popitem(last=False)
    return jsonify(id=i, instrument=kind, tz_applied=shift, rows=len(df), start=str(df.index[0]), end=str(df.index[-1]),
                   sampling_s=dt, columns=list(df.columns), missing={c: int(df[c].isna().sum()) for c in df.columns},
                   gaps=int(big.sum()), files=len(files))

@app.post("/api/datasets/<i>/process")
def process(i):
    d, b = get(i), request.get_json()
    clean, mask, report = d["raw"].copy(), pd.DataFrame(False, index=d["raw"].index, columns=d["raw"].columns), []
    for c in b["columns"]:
        s = d["raw"][c]; x, m = clean_column(s, b["outlier"], b["smooth"])
        clean[c], mask[c] = x, m
        report.append({"column": c, "outliers": int(m.sum()), "outlier_pct": round(100 * float(m.mean()), 3),
                       "noise_before": noise(s), "noise_after": noise(x)})
    d["clean"], d["mask"] = clean, mask
    return jsonify(report=report)

@app.get("/api/datasets/<i>/series")
def series(i):
    d, c = get(i), request.args["col"]
    a, e = request.args.get("start"), request.args.get("end")
    sl = (lambda s: s.loc[pd.Timestamp(a):pd.Timestamp(e)]) if a and e else (lambda s: s)
    raw = sl(d["raw"][c]); out = {"raw": pack(*decimate(raw)), "clean": None, "out": None}
    if d["clean"] is not None and c in d["mask"]:
        out["clean"] = pack(*decimate(sl(d["clean"][c])))
        hit = raw[sl(d["mask"][c]).reindex(raw.index, fill_value=False)]
        hit = hit.iloc[:: max(1, len(hit) // 1500)]
        out["out"] = pack(hit.index, hit.to_numpy(float))
    return jsonify(out)

@app.get("/api/datasets/<i>/csv")
def csv(i):
    d = get(i); df = d["clean"] if request.args.get("which") == "clean" and d["clean"] is not None else d["raw"]
    buf = io.BytesIO(df.to_csv(date_format="%Y-%m-%dT%H:%M:%S.%f", float_format="%.3f").encode())
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name=f"{d['kind']}_{request.args.get('which', 'raw')}_utc.csv")

if __name__ == "__main__":
    app.run(port=5000, debug=False)
