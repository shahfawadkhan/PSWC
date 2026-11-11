"""One reader per instrument; load() turns uploaded files into one UTC table."""
import io
import zipfile

import pandas as pd

from ..config import LT_OFFSET_HOURS, NATIVE_ZONE
from .didd import read_didd
from .gfgm import read_gfgm
from .lama import read_lama
from .ned import read_ned

READERS = {"ned": read_ned, "didd": read_didd, "lama": read_lama, "gfgm": read_gfgm}


def detect(name):
    n = name.lower()
    if n.endswith(".son"): return "lama"
    if n.endswith(".mag"): return "didd"
    if n.endswith(".csv"): return "ned"
    if n.endswith(".txt"): return "gfgm"


def load(files, instrument):
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
    native = NATIVE_ZONE[kind]                      # NED files are in LT, all others in UTC
    shift = LT_OFFSET_HOURS if native == "LT" else 0
    df.index = (df.index - pd.Timedelta(hours=shift)).astype("datetime64[ns]")   # stored internally in UTC
    df.index.name = "time_utc"
    return kind, native, df.astype(float)
