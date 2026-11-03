# PSWC magnetometer cleaning app (outliers + smoothing)

Upload NED / dIdD / LAMA / GFGM files, get one standard UTC table, remove outliers, smooth, compare runs, download.

## Run (Windows PowerShell, two terminals)
Backend (needs Python 3.10+):
    cd backend
    python -m pip install -r requirements.txt
    python app.py
Frontend (needs Node.js 18+):
    cd frontend
    npm install
    npm run dev
Open http://localhost:5173

## Methods
Outliers: hampel (median/MAD), threshold (nT from local median), zscore (rolling), trim (percentile of residual), cap (clip residual to percentiles), range.
Smoothing: mean, median, exp (exponential, optional zero-phase). "Centered" off = trailing window, for real-time use.
Windows are in seconds (time-based, so gaps do not distort them). Default window = 11 samples.
Fill values (9999999 / all-9s) become NaN on reading and stay gaps. Noise = robust noise of first differences.

## Notes
- Time: each instrument has a default clock offset (NED +5 = Pakistan time, assumed, unconfirmed); override it in the upload box.
- GFGM times are rebuilt from header start/end (constant ~60.095 Hz); falls back to whole-second labels.
- Datasets live in server memory (last 4); a restart needs a re-upload.
- Not included yet: CDF output, Pi/Pc and earthquake modules, server integration.
