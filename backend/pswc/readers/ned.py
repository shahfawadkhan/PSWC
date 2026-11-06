import io

import pandas as pd


def read_ned(name, raw):
    df = pd.read_csv(io.BytesIO(raw))
    df.columns = ["time", "X", "Y", "Z", "F"][: len(df.columns)]
    df.index = pd.to_datetime(df.pop("time"))
    return df.where(df.abs() < 9999990)                       # 9999999 = missing
