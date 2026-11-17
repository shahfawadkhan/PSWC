"""Settings in one place."""
LT_OFFSET_HOURS = 5   # Pakistan local time (LT) = UTC + 5, fixed
NATIVE_ZONE = {"ned": "LT", "didd": "UTC", "lama": "UTC", "gfgm": "UTC"}   # time zone each instrument writes its files in
MONTHS = {m: i + 1 for i, m in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split())}
MAX_DATASETS = 4                                   # datasets kept in memory
MAX_UPLOAD_BYTES = 4 * 1024**3

STATIONS = {"SON": "Sonmiani", "ISB": "Islamabad", "KHI": "Karachi", "PEW": "Peshawar", "OTH": "Other (for future)"}   # add new stations here (code: name)
MAX_DAYS = {"ned": 7, "didd": 7, "lama": 7, "gfgm": 1}   # most days one plot may show, per instrument (60 Hz GFGM data is very large)
