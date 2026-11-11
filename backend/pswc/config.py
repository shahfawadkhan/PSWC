"""Settings in one place."""
LT_OFFSET_HOURS = 5   # Pakistan local time (LT) = UTC + 5, fixed
NATIVE_ZONE = {"ned": "LT", "didd": "UTC", "lama": "UTC", "gfgm": "UTC"}   # time zone each instrument writes its files in
MONTHS = {m: i + 1 for i, m in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split())}
MAX_DATASETS = 4                                   # datasets kept in memory
MAX_UPLOAD_BYTES = 4 * 1024**3
