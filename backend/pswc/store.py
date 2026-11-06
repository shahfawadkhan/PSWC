"""In-memory store of uploaded datasets (lost on restart)."""
import uuid
from collections import OrderedDict
from .config import MAX_DATASETS

DATA = OrderedDict()   # id -> {"raw", "clean", "mask", "kind"}


def put(entry):
    i = uuid.uuid4().hex[:8]
    DATA[i] = entry
    while len(DATA) > MAX_DATASETS:
        DATA.popitem(last=False)
    return i


def get(i):
    if i not in DATA:
        raise KeyError("Dataset not found (the server may have restarted). Upload again.")
    return DATA[i]
