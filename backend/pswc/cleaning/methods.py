"""Method list the web page uses to build its dropdowns and boxes."""

W = {"key": "window_s", "label": "Window (s)", "default": None}
Q = [W, {"key": "low", "label": "Lower %", "default": 0.5}, {"key": "high", "label": "Upper %", "default": 99.5}]
C = {"key": "center", "label": "Centered (untick = real-time/trailing)", "type": "bool", "default": True}
METHODS = {
    "outlier": {"none": [], "hampel": [W, {"key": "k", "label": "k x MAD", "default": 5}],
                "threshold": [W, {"key": "nT", "label": "Max deviation from median (nT)", "default": 10}],
                "zscore": [W, {"key": "k", "label": "k x std", "default": 4}], "trim": Q, "cap": Q,
                "range": [{"key": "min", "label": "Min", "default": 0}, {"key": "max", "label": "Max", "default": 100000}]},
    "smooth": {"none": [], "mean": [W, C], "median": [W, C],
               "exp": [{"key": "halflife_s", "label": "Half-life (s)", "default": None},
                       {"key": "zero_phase", "label": "Zero phase (no lag)", "type": "bool", "default": True}]}}
