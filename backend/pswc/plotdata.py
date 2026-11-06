'''Shrink series for plotting.'''
import numpy as np
import pandas as pd


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
