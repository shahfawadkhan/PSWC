'''Full cleaning of one column: outliers first, then smoothing; gaps stay gaps.'''
import numpy as np

from .outliers import apply_outliers
from .smoothing import smooth


def noise(s):                                                    # robust noise from first differences
    d = np.diff(s.to_numpy()); d = d[np.isfinite(d)]
    return float(1.4826 * np.median(np.abs(d - np.median(d))) / np.sqrt(2)) if len(d) else None


def clean_column(s, o, sm):
    x, mask = apply_outliers(s, o)
    gaps = x.isna()
    return smooth(x, sm).mask(gaps), mask & s.notna()
