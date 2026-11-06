import io
import re

import numpy as np
import pandas as pd


def read_gfgm(name, raw):
    lines = raw.decode("utf-8", "replace").replace("\r", "").split("\n")
    meta = {l.split(":", 1)[0].strip(): l.split(":", 1)[1].strip() for l in lines[:60] if ":" in l}
    hl = int(meta["FileHeadLength"].split()[0])
    d = pd.read_csv(io.StringIO("\n".join(lines[hl:])), sep=r"\s+", header=None, names=["t", "X", "Y", "Z", "Temp"])
    n = len(d)
    try:   # exact path: constant sample interval between header start and end times (~60.095 Hz)
        t0, t1 = pd.Timestamp(meta["DataStartTime"].rstrip("Z")), pd.Timestamp(meta["DataEndTime"].rstrip("Z"))   # header times end in Z (UTC); keep them timezone-naive
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
