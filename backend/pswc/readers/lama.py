import numpy as np
import pandas as pd

from ..config import MONTHS


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
