import json
import os
from pathlib import Path

from dotenv import load_dotenv

from fetch_weather import get_daily_forecast, get_hourly_forecast

# Load .env from project root (one level up from this file)
ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

API_KEY = os.getenv("WEATHER_API_KEY")
LAT = float(os.getenv("WEATHER_LAT", 13.75))
LON = float(os.getenv("WEATHER_LON", 100.50))

OUTPUT_DIR = Path(__file__).parent

if __name__ == "__main__":
    if not API_KEY:
        print("WEATHER_API_KEY missing in root .env")
        exit(1)

    print("Fetching hourly data (24 h)...")
    hourly = get_hourly_forecast(LAT, LON, hours=24, api_key=API_KEY,
                                 fields="tc,rh,slp,rain,ws10m,wd10m,cond")
    if hourly:
        out = OUTPUT_DIR / "hourly_forecast.json"
        out.write_text(json.dumps(hourly, indent=4, ensure_ascii=False), encoding="utf-8")
        print(f"Saved → {out}")
    else:
        print("Failed to fetch hourly data")

    print("\nFetching daily data (5 d)...")
    # TMD daily API allows max duration=126 hours (~5 days)
    daily = get_daily_forecast(LAT, LON, days=5, api_key=API_KEY,
                                fields="tc_max,tc_min,rh,slp,rain,ws10m,wd10m,cond")
    if daily:
        out = OUTPUT_DIR / "daily_forecast.json"
        out.write_text(json.dumps(daily, indent=4, ensure_ascii=False), encoding="utf-8")
        print(f"Saved → {out}")
    else:
        print("Failed to fetch daily data")

