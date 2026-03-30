"""
utils.py — Shared utility helpers
  - now_str() : current datetime string (UTC + TZ_OFFSET)
"""

import time
from config import TZ_OFFSET


def now_str() -> str:
    """Return current local time as 'YYYY-MM-DD HH:MM:SS'."""
    t  = time.time() + TZ_OFFSET * 3600
    tm = time.gmtime(t)
    return "{:04d}-{:02d}-{:02d} {:02d}:{:02d}:{:02d}".format(
        tm[0], tm[1], tm[2], tm[3], tm[4], tm[5]
    )