'''Outlier detection and removal.'''
import pandas as pd


def roll(s, w, **kw): return s.rolling(pd.Timedelta(seconds=float(w)), **kw)


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


def apply_outliers(s, o):
    """Apply the chosen outlier method. Returns (values, mask of flagged points)."""
    m = o.get("method", "none")
    mask, x = pd.Series(False, index=s.index), s.copy()
    if m == "cap":                                   # capping: pull extremes back to the percentile limits
        med = roll(s, o["window_s"], center=True, min_periods=3).median()
        r = s - med
        lo, hi = r.quantile(o["low"] / 100), r.quantile(o["high"] / 100)
        x, mask = (med + r.clip(lo, hi)).fillna(s), (r < lo) | (r > hi)
    elif m != "none":
        mask = find_outliers(s, m, o)
        x = s.mask(mask)
        if o.get("interpolate"):
            x = x.where(~mask, x.interpolate(method="time", limit_area="inside"))
    return x, mask
