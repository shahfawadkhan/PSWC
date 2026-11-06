"""Settings in one place."""
TZ = {"ned": 5, "didd": 0, "lama": 0, "gfgm": 0}   # default: hours the file clock is AHEAD of UTC (NED assumed PKT)
MONTHS = {m: i + 1 for i, m in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split())}
MAX_DATASETS = 4                                   # datasets kept in memory
MAX_UPLOAD_BYTES = 4 * 1024**3
