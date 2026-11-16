"""HTTP routes (the 'doors' the web page calls)."""
import io

import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request, send_file

from .cleaning import METHODS, clean_column, noise
from .config import LT_OFFSET_HOURS, MAX_DAYS, STATIONS
from .plotdata import decimate, pack
from .readers import load
from .store import get, put

bp = Blueprint("api", __name__, url_prefix="/api")


def _zone():
    """Time zone the page wants to see: 'utc' or 'lt' (Pakistan local time = UTC + 5)."""
    z = request.args.get("zone", "utc").lower()
    return z if z in ("utc", "lt") else "utc"


def _offset(zone):
    return pd.Timedelta(hours=LT_OFFSET_HOURS) if zone == "lt" else pd.Timedelta(0)


def _pad_seconds(o, sm):
    """Extra data taken around a selected range so the window edges are not distorted."""
    return 1.5 * max(o.get("window_s") or 0, sm.get("window_s") or 0, 5 * (sm.get("halflife_s") or 0))


def _suffix(ops):
    return "clsm" if {"cl", "sm"} <= ops else "cl" if "cl" in ops else "sm" if "sm" in ops else ""


def _summary(i, d):
    df, lt = d["raw"], _offset("lt")
    dt = float(np.median(np.diff(df.index.values[:200000])) / np.timedelta64(1, "s"))
    big = np.diff(df.index.values) > np.timedelta64(int(max(3 * dt, 1) * 1e9), "ns")
    files = [dict(index=k, name=f["name"], rows=f["rows"], start_utc=str(f["start"]), end_utc=str(f["end"]),
                  start_lt=str(f["start"] + lt), end_lt=str(f["end"] + lt)) for k, f in enumerate(d["files"])]
    return dict(id=i, instrument=d["kind"], native=d["native"], station=d["station"], station_name=STATIONS.get(d["station"]),
                rows=len(df), start_utc=str(df.index[0]), end_utc=str(df.index[-1]),
                start_lt=str(df.index[0] + lt), end_lt=str(df.index[-1] + lt), sampling_s=dt, columns=list(df.columns),
                missing={c: int(df[c].isna().sum()) for c in df.columns}, gaps=int(big.sum()), files=files, max_days=MAX_DAYS[d["kind"]])


@bp.get("/methods")
def methods():
    return jsonify(METHODS)


@bp.get("/stations")
def stations():
    return jsonify([{"code": c, "name": n} for c, n in STATIONS.items()])


@bp.post("/upload")
def upload():
    files = [(f.filename, f.read()) for f in request.files.getlist("files")]
    kind, native, df, spans, guess = load(files, request.form.get("instrument", "auto"))
    pick = request.form.get("station", "auto")
    code = guess if pick == "auto" else pick
    d = {"raw": df, "clean": None, "mask": None, "kind": kind, "native": native, "files": spans, "ops": set(),
         "station": code if code in STATIONS else None}          # data is stored in UTC
    return jsonify(_summary(put(d), d))


@bp.post("/datasets/<i>/process")
def process(i):
    d, b = get(i), request.get_json()
    raw, off = d["raw"], _offset((b.get("zone") or "utc").lower())
    o, sm, rng = dict(b["outlier"]), b["smooth"], b.get("range")
    if rng:                                                      # clean only a part: times arrive in the zone the page shows
        a, e = pd.Timestamp(rng["start"]) - off, pd.Timestamp(rng["end"]) - off
        if a >= e:
            raise ValueError("The end of the range must be after its start.")
        o["range_utc"] = (a, e)
    elif o.get("method") == "manual":
        raise ValueError("Manual removal needs a selected time range.")
    if not rng or d["clean"] is None:                            # a whole-data run starts again from the raw data
        d["clean"], d["mask"], d["ops"] = raw.copy(), pd.DataFrame(False, index=raw.index, columns=raw.columns), set()
    pad = pd.Timedelta(seconds=_pad_seconds(o, sm)) if rng else None
    report = []
    for c in b["columns"]:
        s = raw[c]
        if rng:
            x, m = clean_column(s.loc[a - pad:e + pad], o, sm)
            x, m = x.loc[a:e], m.loc[a:e]
            d["clean"].loc[x.index, c] = x.to_numpy()            # only this range changes; the rest of the cleaned data is kept
            d["mask"].loc[m.index, c] = m.to_numpy()
            s = s.loc[a:e]
        else:
            x, m = clean_column(s, o, sm)
            d["clean"][c], d["mask"][c] = x, m
        report.append({"column": c, "outliers": int(m.sum()), "outlier_pct": round(100 * float(m.mean()), 3) if len(m) else 0.0,
                       "noise_before": noise(s), "noise_after": noise(x)})
    if o.get("method", "none") != "none": d["ops"].add("cl")
    if sm.get("method", "none") != "none": d["ops"].add("sm")
    return jsonify(report=report, ops=sorted(d["ops"]))


@bp.post("/datasets/<i>/reset")
def reset(i):
    d = get(i)
    d["clean"] = d["mask"] = None
    d["ops"] = set()
    return jsonify(ok=True)


@bp.get("/datasets/<i>/series")
def series(i):
    d, c, zone = get(i), request.args["col"], _zone()
    off = _offset(zone)
    a, e = request.args.get("start"), request.args.get("end")
    if a and e:   # the page sends the zoom range in the zone it is showing
        a, e = pd.Timestamp(a) - off, pd.Timestamp(e) - off
        sl = lambda s: s.loc[a:e]
    else:
        sl = lambda s: s

    def shown(s):   # reduced for plotting, times moved to the shown zone
        idx, v = decimate(s)
        return pack(idx + off, v)

    raw = sl(d["raw"][c])
    out = {"raw": shown(raw), "clean": None, "out": None}
    if d["clean"] is not None and c in d["mask"]:
        out["clean"] = shown(sl(d["clean"][c]))
        hit = raw[sl(d["mask"][c]).reindex(raw.index, fill_value=False)]
        hit = hit.iloc[:: max(1, len(hit) // 1500)]
        out["out"] = pack(hit.index + off, hit.to_numpy(float))
    return jsonify(out)


@bp.get("/datasets/<i>/csv")
def csv(i):
    """scope=file (one original file), window (the plot window as one file) or all. Cleaned files get _cl, _sm or _clsm."""
    d, zone = get(i), _zone()
    which, scope, off = request.args.get("which", "raw"), request.args.get("scope", "all"), _offset(zone)
    use_clean = which == "clean" and d["clean"] is not None
    df = d["clean"] if use_clean else d["raw"]
    code = d["station"] or d["kind"].upper()
    if scope == "file":
        f = d["files"][int(request.args["file"])]
        df, base = df.loc[f["start"]:f["end"]], f["name"].rsplit(".", 1)[0]
    elif scope == "window":
        a, e = pd.Timestamp(request.args["start"]) - off, pd.Timestamp(request.args["end"]) - off
        df, base = df.loc[a:e], f"{code}_{a + off:%Y%m%d}_{e + off - pd.Timedelta(seconds=1):%Y%m%d}_{zone.upper()}"
    else:
        base = f"{code}_all"
    tag = _suffix(d["ops"]) if use_clean else ""
    df = df.copy()
    df.index = df.index + off
    df.index.name = f"time_{zone}"
    buf = io.BytesIO(df.to_csv(date_format="%Y-%m-%dT%H:%M:%S.%f", float_format="%.3f").encode())
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name=f"{base}_{tag or 'raw'}.csv")
