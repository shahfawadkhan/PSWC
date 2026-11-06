"""Smoothing: moving mean, moving median, exponential."""
import numpy as np

from .outliers import roll


def smooth(x, sm):
    k = sm.get("method", "none")
    if k in ("mean", "median"):
        r = roll(x, sm["window_s"], center=bool(sm.get("center", True)), min_periods=1)
        return r.mean() if k == "mean" else r.median()
    if k == "exp":
        dt = float(np.median(np.diff(x.index.values[:200000])) / np.timedelta64(1, "s"))
        a = 1 - np.exp(-np.log(2) * dt / float(sm["halflife_s"]))
        y = x.ewm(alpha=a).mean()
        return (y + x[::-1].ewm(alpha=a).mean()[::-1]) / 2 if sm.get("zero_phase", True) else y
    return x
