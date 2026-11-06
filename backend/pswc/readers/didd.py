import re

import numpy as np
import pandas as pd


def read_didd(name, raw):
    day = pd.Timestamp(re.search(r"(\d{8})", name).group(1))   # date comes from file name YYYYMMDD.mag
    rows = [l.split() for l in raw.decode("ascii", "replace").splitlines() if l.strip() and not l.startswith("//")]
    a = np.array([r[:18] for r in rows if len(r) >= 18], dtype=float)
    t = a[:, 0]; sec = (t // 10000) * 3600 + (t % 10000 // 100) * 60 + t % 100
    return pd.DataFrame({"F": a[:, 1], "X": a[:, 16], "Y": a[:, 15], "Z": a[:, 17],
                         "Inc": a[:, 11], "Dec": a[:, 13]}, index=day + pd.to_timedelta(sec, unit="s"))
