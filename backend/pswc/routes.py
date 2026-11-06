"""HTTP routes (the 'doors' the web page calls)."""
import io

import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request, send_file

from .cleaning import METHODS, clean_column, noise
from .plotdata import decimate, pack
from .readers import load
from .store import get, put

bp = Blueprint("api", __name__, url_prefix="/api")


def _summary(i, kind, shift, df, n_files):
    dt = float(np.median(np.diff(df.index.values[:200000])) / np.timedelta64(1, "s"))
    big = np.diff(df.index.values) > np.timedelta64(int(max(3 * dt, 1) * 1e9), "ns")
    return dict(id=i, instrument=kind, tz_applied=shift, rows=len(df), start=str(df.index[0]), end=str(df.index[-1]),
                sampling_s=dt, columns=list(df.columns), missing={c: int(df[c].isna().sum()) for c in df.columns},
                gaps=int(big.sum()), files=n_files)


@bp.get("/methods")
def methods():
    return jsonify(METHODS)


@bp.post("/upload")
def upload():
    files = [(f.filename, f.read()) for f in request.files.getlist("files")]
    tz = request.form.get("tz", "").strip()
    kind, shift, df = load(files, request.form.get("instrument", "auto"), float(tz) if tz else None)
    i = put({"raw": df, "clean": None, "mask": None, "kind": kind})
    return jsonify(_summary(i, kind, shift, df, len(files)))


@bp.post("/datasets/<i>/process")
def process(i):
    d, b = get(i), request.get_json()
    clean, mask, report = d["raw"].copy(), pd.DataFrame(False, index=d["raw"].index, columns=d["raw"].columns), []
    for c in b["columns"]:
        s = d["raw"][c]
        x, m = clean_column(s, b["outlier"], b["smooth"])
        clean[c], mask[c] = x, m
        report.append({"column": c, "outliers": int(m.sum()), "outlier_pct": round(100 * float(m.mean()), 3),
                       "noise_before": noise(s), "noise_after": noise(x)})
    d["clean"], d["mask"] = clean, mask
    return jsonify(report=report)


@bp.get("/datasets/<i>/series")
def series(i):
    d, c = get(i), request.args["col"]
    a, e = request.args.get("start"), request.args.get("end")
    sl = (lambda s: s.loc[pd.Timestamp(a):pd.Timestamp(e)]) if a and e else (lambda s: s)
    raw = sl(d["raw"][c])
    out = {"raw": pack(*decimate(raw)), "clean": None, "out": None}
    if d["clean"] is not None and c in d["mask"]:
        out["clean"] = pack(*decimate(sl(d["clean"][c])))
        hit = raw[sl(d["mask"][c]).reindex(raw.index, fill_value=False)]
        hit = hit.iloc[:: max(1, len(hit) // 1500)]
        out["out"] = pack(hit.index, hit.to_numpy(float))
    return jsonify(out)


@bp.get("/datasets/<i>/csv")
def csv(i):
    d, which = get(i), request.args.get("which", "raw")
    df = d["clean"] if which == "clean" and d["clean"] is not None else d["raw"]
    buf = io.BytesIO(df.to_csv(date_format="%Y-%m-%dT%H:%M:%S.%f", float_format="%.3f").encode())
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name=f"{d['kind']}_{which}_utc.csv")
