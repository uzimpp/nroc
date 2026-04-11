"""
load_from_files.py
==================
Reads local data files and upserts them into MySQL.

  - fetch-data/data/corn_*.csv  → market_prices table
  - fetch_weather/*.json         → weather_forecast_hourly / weather_forecast_daily tables

First run: loads ALL rows from all files.
Subsequent runs: ON DUPLICATE KEY UPDATE is idempotent, so only
  genuinely new rows (new dates/times) will be inserted; existing
  rows are silently re-confirmed.

Usage:
    python3 load_from_files.py
"""

import csv
import glob
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import pymysql
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", ""),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", ""),
    "charset":  "utf8mb4",
}

PRODUCT_NAMES = {
    "182": "Sweet Corn - Large",
    "206": "Sweet Corn - Medium",
    "216": "Sweet Corn - Small",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_connection():
    return pymysql.connect(**DB_CONFIG)


# ---------------------------------------------------------------------------
# 1. Market prices from CSV files
# ---------------------------------------------------------------------------
def load_market_prices(conn):
    csv_files = sorted(glob.glob(str(ROOT / "fetch-data" / "data" / "corn_*.csv")))
    if not csv_files:
        print("[Market] No CSV files found, skipping.")
        return

    sql = """
        INSERT INTO market_prices
            (product_id, product_name, record_date, price_min, price_max, unit)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            price_min    = VALUES(price_min),
            price_max    = VALUES(price_max),
            product_name = VALUES(product_name)
    """

    total = 0
    for filepath in csv_files:
        pid_str = Path(filepath).stem.replace("corn_", "")
        pname   = PRODUCT_NAMES.get(pid_str, f"Product {pid_str}")
        rows    = []

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    date_str  = row["date"].strip()
                    price_min = float(row["price_min"])
                    price_max = float(row["price_max"])
                    unit      = row.get("unit", "kg.").strip() or "kg."
                    # Normalise unit (CSV may still have Thai)
                    if unit in ("กก.", ""):
                        unit = "kg."
                    rows.append((int(pid_str), pname, date_str, price_min, price_max, unit))
                except Exception:
                    continue

        if rows:
            with conn.cursor() as cur:
                cur.executemany(sql, rows)
            conn.commit()
            print(f"[Market] {pname}: upserted {len(rows)} rows from {Path(filepath).name}")
            total += len(rows)

    print(f"[Market] Done — {total} rows total.\n")


# ---------------------------------------------------------------------------
# 2. Hourly weather from JSON files
# ---------------------------------------------------------------------------
def load_weather_hourly(conn):
    json_files = sorted(glob.glob(str(ROOT / "fetch_weather" / "hourly_forecast*.json")))
    if not json_files:
        print("[Weather hourly] No JSON files found, skipping.")
        return

    sql = """
        INSERT INTO weather_forecast_hourly
            (lat, lon, forecast_datetime, temperature, humidity,
             pressure, rain, wind_speed, wind_dir, cond)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            temperature = VALUES(temperature),
            humidity    = VALUES(humidity),
            pressure    = VALUES(pressure),
            rain        = VALUES(rain),
            wind_speed  = VALUES(wind_speed),
            wind_dir    = VALUES(wind_dir),
            cond        = VALUES(cond)
    """

    total = 0
    for filepath in json_files:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        forecasts = (
            data.get("WeatherForecasts", [{}])[0]
                .get("forecasts", [])
        )
        location = (
            data.get("WeatherForecasts", [{}])[0]
                .get("location", {})
        )
        lat = location.get("lat", 13.75)
        lon = location.get("lon", 100.50)

        rows = []
        for fc in forecasts:
            try:
                fc_dt = datetime.fromisoformat(fc["time"])
            except Exception:
                continue
            d = fc.get("data", {})
            rows.append((
                lat, lon, fc_dt,
                d.get("tc"),    d.get("rh"),    d.get("slp"),
                d.get("rain"),  d.get("ws10m"), d.get("wd10m"),
                d.get("cond"),
            ))

        if rows:
            with conn.cursor() as cur:
                cur.executemany(sql, rows)
            conn.commit()
            print(f"[Weather hourly] {Path(filepath).name}: upserted {len(rows)} rows")
            total += len(rows)

    print(f"[Weather hourly] Done — {total} rows total.\n")


# ---------------------------------------------------------------------------
# 3. Daily weather from JSON files
# ---------------------------------------------------------------------------
def load_weather_daily(conn):
    json_files = sorted(glob.glob(str(ROOT / "fetch_weather" / "daily_forecast*.json")))
    if not json_files:
        print("[Weather daily] No JSON files found, skipping.")
        return

    sql = """
        INSERT INTO weather_forecast_daily
            (lat, lon, forecast_date, temp_max, temp_min,
             humidity, pressure, rain, wind_speed, wind_dir, cond)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            temp_max   = VALUES(temp_max),
            temp_min   = VALUES(temp_min),
            humidity   = VALUES(humidity),
            pressure   = VALUES(pressure),
            rain       = VALUES(rain),
            wind_speed = VALUES(wind_speed),
            wind_dir   = VALUES(wind_dir),
            cond       = VALUES(cond)
    """

    total = 0
    for filepath in json_files:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        forecasts = (
            data.get("WeatherForecasts", [{}])[0]
                .get("forecasts", [])
        )
        location = (
            data.get("WeatherForecasts", [{}])[0]
                .get("location", {})
        )
        lat = location.get("lat", 13.75)
        lon = location.get("lon", 100.50)

        rows = []
        for fc in forecasts:
            try:
                fc_date = datetime.fromisoformat(fc["time"]).date()
            except Exception:
                continue
            d = fc.get("data", {})
            rows.append((
                lat, lon, fc_date,
                d.get("tc_max"), d.get("tc_min"),
                d.get("rh"),    d.get("slp"),
                d.get("rain"),  d.get("ws10m"), d.get("wd10m"),
                d.get("cond"),
            ))

        if rows:
            with conn.cursor() as cur:
                cur.executemany(sql, rows)
            conn.commit()
            print(f"[Weather daily] {Path(filepath).name}: upserted {len(rows)} rows")
            total += len(rows)

    print(f"[Weather daily] Done — {total} rows total.\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    print(f"Connecting to {DB_CONFIG['host']}:{DB_CONFIG['port']} (db={DB_CONFIG['database']})...")
    try:
        conn = get_connection()
        print("Connected.\n")
    except Exception as e:
        print(f"[Error] Cannot connect: {e}")
        sys.exit(1)

    try:
        load_market_prices(conn)
        load_weather_hourly(conn)
        load_weather_daily(conn)
    finally:
        conn.close()
        print("Done. Connection closed.")


if __name__ == "__main__":
    main()
