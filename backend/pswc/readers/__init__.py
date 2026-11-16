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


def guess_station(kind, sel):
    """Station code found in the files, if any (LAMA headers start with it; GFGM names carry the station)."""
    name, raw = sel[0]
    if kind == "lama":
        tok = raw[:200].decode("ascii", "replace").split()[:1]
        return tok[0].upper() if tok else None
    if kind == "gfgm" and "sonmiani" in name.lower():
        return "SON"
    return None


def load(files, instrument):
    """Returns kind, native zone, one UTC table, a list of the files (name, start, end, rows) and a station guess."""
    items = []
    for name, raw in files:                                      # expand zips
        if name.lower().endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                items += [(m, z.read(m)) for m in z.namelist() if not m.endswith("/")]
        else:
            items.append((name, raw))
    kinds = {detect(n) if instrument == "auto" else instrument for n, _ in items}
    kinds.discard(None)
    if len(kinds) != 1:
        raise ValueError(f"Could not work out one instrument type (found: {sorted(kinds) or 'none'}). Pick it manually.")
    kind = kinds.pop()
    sel = [(n.replace("\\", "/").split("/")[-1], r) for n, r in items if detect(n) == kind or instrument != "auto"]
    parts = [(n, READERS[kind](n, r)) for n, r in sel]
    parts = [(n, p) for n, p in parts if len(p)]
    if not parts:
        raise ValueError("No data rows found in the uploaded files.")
    native = NATIVE_ZONE[kind]                                   # NED files are in LT, all others in UTC
    shift = pd.Timedelta(hours=LT_OFFSET_HOURS if native == "LT" else 0)
    spans = sorted(({"name": n, "start": p.index.min() - shift, "end": p.index.max() - shift, "rows": len(p)} for n, p in parts),
                   key=lambda f: f["start"])
    df = pd.concat([p for _, p in parts]).sort_index()
    df = df[~df.index.duplicated()]
    df.index = (df.index - shift).astype("datetime64[ns]")       # stored internally in UTC
    df.index.name = "time_utc"
    return kind, native, df.astype(float), spans, guess_station(kind, sel)
