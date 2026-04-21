from datetime import date, datetime, timedelta
from typing import Optional

import pymysql
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import get_db_connection

app = FastAPI(
    title="NROC Agricultural Data API",
    description="""
## NROC — Smart Corn Farming API

Provides sensor telemetry, weather forecasts, market prices, and GDD-based crop growth data
for the NROC sweet corn decision-support system.

### Timestamp Convention
All datetimes stored in MySQL are **Bangkok local time (UTC+7) without timezone suffix**.
Pass datetime query parameters as local-time strings (e.g. `2026-04-21T15:30:00`),
**not** UTC ISO strings with a `Z` suffix, to avoid a 7-hour data gap.

### GDD Formula
Growing Degree Days use the **USDA sweet corn Modified GDD** standard:
- Base temperature: **10 °C (50 °F)**
- Ceiling temperature: **30 °C (86 °F)**
- Formula per day: `max(0, (min(t_max, 30) + max(t_min, 10)) / 2 − 10)`
- Uses true daily min/max of `temp_i2c` (LM73 I2C sensor), falling back to `temperature` (DHT11)

### Key Stage Milestones (GDD)
| Stage | GDD |
|-------|-----|
| VE — Emergence | 110 |
| V6 — 6-Leaf | 520 |
| VT — Tasseling | 1 350 |
| R1 — Silking | 1 500 |
| R3 — Milk / Harvest | 1 875 |
| R6 — Full Maturity | 2 700 |
""",
    version="1.1.0",
    contact={"name": "NROC Project", "url": "https://github.com/your-org/nroc"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modified GDD thresholds for sweet corn (base 10 °C, ceiling 30 °C)
GDD_BASE = 10.0
GDD_CEIL = 30.0

# Key stage milestones used for projection and labelling
_STAGE_MILESTONES = [
    {"id": "VE", "label": "Emergence",    "gdd": 110},
    {"id": "V6", "label": "6-Leaf",       "gdd": 520},
    {"id": "VT", "label": "Tasseling",    "gdd": 1350},
    {"id": "R1", "label": "Silking",      "gdd": 1500},
    {"id": "R3", "label": "Milk/Harvest", "gdd": 1875},
    {"id": "R6", "label": "Maturity",     "gdd": 2700},
]


def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()  # returns connection to pool (PooledDB), does not destroy it



def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Strip timezone info so PyMySQL can serialize the datetime correctly."""
    if dt is None:
        return None
    return dt.replace(tzinfo=None)


@app.get("/", tags=["Health"], summary="Health check")
def root():
    """Returns a simple status object confirming the API is reachable."""
    return {
        "status": "ok",
        "message": "NROC Agricultural Data API is running. Go to /docs for Swagger UI.",
    }


@app.get(
    "/api/market-prices",
    tags=["Market"],
    summary="Corn market prices from Talad Thai",
    response_description="List of daily price records sorted ascending by record_date",
)
def get_market_prices(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    product_id: Optional[int] = Query(
        None, description="Filter by product ID (e.g. 206 for medium corn)"
    ),
    size: Optional[str] = Query(
        None,
        description="Filter by size grade: 'large', 'medium', or 'small'",
        examples=["large"],
    ),
    db: pymysql.connections.Connection = Depends(get_db),
):
    """
    Returns daily min/max corn prices scraped from Talad Thai (ตลาดไท).

    Each record includes a `size` field that identifies the corn grade:
    - `large` — Large grade corn
    - `medium` — Medium grade corn
    - `small` — Small grade corn

    The dashboard uses the `size` field to filter and display prices
    instead of relying on `product_id`.

    Dates are calendar dates only (`YYYY-MM-DD`). Pass `start_date` and `end_date`
    to narrow the range; omit both to retrieve the full price history.
    """
    size_to_product = {"large": 182, "medium": 206, "small": 216}

    sql = """SELECT id, product_id, product_name,
    CASE product_id
        WHEN 182 THEN 'large'
        WHEN 206 THEN 'medium'
        WHEN 216 THEN 'small'
    END AS size,
    record_date, price_min, price_max, unit, fetched_at
FROM market_prices WHERE 1=1"""
    params = []

    if start_date:
        sql += " AND record_date >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND record_date <= %s"
        params.append(end_date)
    if product_id:
        sql += " AND product_id = %s"
        params.append(product_id)
    elif size and size in size_to_product:
        # Push size filter into SQL via the underlying product_id mapping
        sql += " AND product_id = %s"
        params.append(size_to_product[size])

    sql += " ORDER BY record_date ASC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.get(
    "/api/weather/hourly",
    tags=["Weather"],
    summary="Hourly weather forecast from TMD",
    response_description="Hourly forecast rows sorted ascending by forecast_datetime",
)
def get_weather_hourly(
    start_time: Optional[datetime] = Query(
        None, description="Start datetime (e.g., 2026-04-11T00:00:00)"
    ),
    end_time: Optional[datetime] = Query(None, description="End datetime"),
    db: pymysql.connections.Connection = Depends(get_db),
):
    """
    Returns hourly weather forecast data sourced from the Thai Meteorological Department (TMD).

    Pass `start_time` and `end_time` as **local-time** strings without a timezone suffix,
    e.g. `2026-04-21T00:00:00`. Passing a UTC string (ending in `Z`) will be stripped of
    timezone info and compared against Bangkok-stored timestamps, resulting in a 7-hour shift.
    """
    sql = "SELECT lat, lon, forecast_datetime, temperature, humidity, pressure, rain, wind_speed, wind_dir, cond, created_at FROM weather_forecast_hourly WHERE 1=1"
    params = []

    if start_time:
        sql += " AND forecast_datetime >= %s"
        params.append(_naive(start_time))
    if end_time:
        sql += " AND forecast_datetime <= %s"
        params.append(_naive(end_time))

    sql += " ORDER BY forecast_datetime ASC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.get(
    "/api/weather/daily",
    tags=["Weather"],
    summary="Daily weather forecast from TMD",
    response_description="Daily forecast rows sorted ascending by forecast_date",
)
def get_weather_daily(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: pymysql.connections.Connection = Depends(get_db),
):
    sql = "SELECT lat, lon, forecast_date, temp_max, temp_min, humidity, pressure, rain, wind_speed, wind_dir, cond, created_at FROM weather_forecast_daily WHERE 1=1"
    params = []

    if start_date:
        sql += " AND forecast_date >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND forecast_date <= %s"
        params.append(end_date)

    sql += " ORDER BY forecast_date ASC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.get(
    "/api/weather/rain-accumulation",
    tags=["Weather"],
    summary="Weekly rain forecast accumulation",
    response_description="Total mm for the current ISO week with per-day breakdown",
)
def get_rain_accumulation(
    db: pymysql.connections.Connection = Depends(get_db),
):
    """
    Sums forecast `rain` (mm) from `weather_forecast_hourly` for the current ISO week
    (Monday through Sunday). Always scoped to the current calendar week — no parameters needed.

    **Response shape:**
    ```json
    {
      "week_start": "2026-04-20",
      "week_end":   "2026-04-26",
      "total_mm":   12.4,
      "days": [
        { "date": "2026-04-20", "total_mm": 0.0 },
        { "date": "2026-04-21", "total_mm": 3.2 }
      ]
    }
    ```
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_end   = week_start + timedelta(days=6)            # Sunday

    sql = """
        SELECT DATE(forecast_datetime) AS day, SUM(rain) AS total_mm
        FROM weather_forecast_hourly
        WHERE DATE(forecast_datetime) >= %s AND DATE(forecast_datetime) <= %s
        GROUP BY DATE(forecast_datetime)
        ORDER BY day ASC
    """
    with db.cursor() as cur:
        cur.execute(sql, (week_start, week_end))
        rows = cur.fetchall()

    days = [{"date": str(r["day"]), "total_mm": round(float(r["total_mm"] or 0), 1)} for r in rows]
    total = round(sum(d["total_mm"] for d in days), 1)

    return {
        "week_start": week_start.isoformat(),
        "week_end":   week_end.isoformat(),
        "total_mm":   total,
        "days":       days,
    }


@app.get(
    "/api/sensors/latest",
    tags=["Farm IoT"],
    summary="Most recent sensor reading",
    response_description="Array of 0 or 1 sensor readings — empty if no data exists for the farm",
)
def get_latest_sensor(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id (e.g. 'FARM_001')"),
    db: pymysql.connections.Connection = Depends(get_db),
):
    """
    Returns the single most-recent row from the `sensors` table, optionally scoped to a farm.
    No date filter is applied — this always returns the absolute latest reading.

    **Sensor columns:**
    - `temp_i2c` — LM73 I2C temperature (preferred for GDD; may be null if sensor offline)
    - `temperature` — DHT11 ambient temperature fallback
    - `humidity` — DHT11 ambient humidity (%)
    - `moisture` — Capacitive soil moisture (0–100 %)
    - `light` — LDR light intensity (lux)
    """
    sql = "SELECT farm_id, lat, lon, moisture, light, temperature, humidity, temp_i2c, created_at FROM sensors WHERE 1=1"
    params = []
    if farm_id:
        sql += " AND farm_id = %s"
        params.append(farm_id)
    sql += " ORDER BY created_at DESC LIMIT 1"
    with db.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
    return [row] if row else []


@app.get(
    "/api/sensors",
    tags=["Farm IoT"],
    summary="Sensor reading history",
    response_description="Sensor rows sorted descending by created_at (newest first)",
)
def get_sensors_data(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id (e.g. 'FARM_001')"),
    start_date: Optional[datetime] = Query(
        None,
        description="Start datetime as **local Bangkok time** without timezone suffix, e.g. `2026-04-01T00:00:00`",
    ),
    end_date: Optional[datetime] = Query(
        None,
        description="End datetime as **local Bangkok time** without timezone suffix, e.g. `2026-04-21T23:59:59`",
    ),
    db: pymysql.connections.Connection = Depends(get_db),
):
    """
    Returns sensor readings within an optional date range.

    **Important:** Pass datetime strings without a timezone suffix. The database stores
    Bangkok local time (UTC+7) as naive datetimes. Passing a UTC string (e.g. ending in `Z`)
    will cause the date comparison to be 7 hours off, excluding the most recent readings.

    Rows are returned newest-first. The dashboard downsamples these into 1-hour bucket
    averages for chart rendering.
    """
    sql = "SELECT farm_id, lat, lon, moisture, light, temperature, humidity, temp_i2c, created_at FROM sensors WHERE 1=1"
    params = []

    if farm_id:
        sql += " AND farm_id = %s"
        params.append(farm_id)
    if start_date:
        sql += " AND created_at >= %s"
        params.append(_naive(start_date))
    if end_date:
        sql += " AND created_at <= %s"
        params.append(_naive(end_date))

    sql += " ORDER BY created_at DESC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.get(
    "/api/farms",
    tags=["Farm IoT"],
    summary="List all farms",
    response_description="List of farms with last-known GPS coordinates",
)
def get_farms(db: pymysql.connections.Connection = Depends(get_db)):
    """
    Returns every distinct `farm_id` found in the `sensors` table, along with its
    last-known latitude and longitude.

    **Response shape:**
    ```json
    [{ "id": "FARM_001", "lat": 14.07, "lon": 100.61 }]
    ```

    The dashboard calls this on mount to dynamically select the first available farm
    rather than hardcoding a farm ID.
    """
    with db.cursor() as cur:
        cur.execute(
            "SELECT farm_id, MAX(lat) AS lat, MAX(lon) AS lon FROM sensors GROUP BY farm_id ORDER BY farm_id"
        )
        rows = cur.fetchall()
    return [{"id": r["farm_id"], "lat": r["lat"], "lon": r["lon"]} for r in rows]


@app.get(
    "/api/gdd/{farm_id}",
    tags=["Farm IoT"],
    summary="Cumulative GDD, current stage, and harvest projection",
    response_description="GDD summary object with current stage and projected dates",
)
def get_gdd(farm_id: str, db: pymysql.connections.Connection = Depends(get_db)):
    """
    Computes cumulative Modified GDD for a farm from the planting date to today,
    identifies the current crop stage, and projects the harvest (R3) and maturity (R6) dates.

    **GDD Formula (USDA sweet corn — Modified Method):**
    ```
    t_max_capped = min(daily_t_max, 30.0)   # 86 °F ceiling
    t_min_capped = max(daily_t_min, 10.0)   # 50 °F base floor
    daily_gdd    = max(0, (t_max_capped + t_min_capped) / 2 − 10)
    ```
    Uses true daily **min and max** of `COALESCE(temp_i2c, temperature)` — not a simple
    average of all readings.

    **Planting date detection:** finds the growth log with the lowest `growth_progress_in_gdd`
    value (closest to 0). If no logs exist, GDD is computed from the earliest sensor reading.

    **Harvest projection:** averages the last 7 days of daily GDD to estimate days remaining
    to R3 (1 875 GDD) and R6 (2 700 GDD) milestones.

    **Response shape:**
    ```json
    {
      "farm_id": "FARM_001",
      "cumulative_gdd": 847.3,
      "planting_date": "2026-02-01",
      "current_stage_id": "V6",
      "current_stage_label": "6-Leaf",
      "days_since_planting": 79,
      "projected_r3_date": "2026-05-14",
      "projected_r6_date": "2026-06-28",
      "r3_gdd": 1875,
      "r6_gdd": 2700
    }
    ```
    """
    # Find planting date from growth logs (log with GDD closest to 0)
    with db.cursor() as cur:
        cur.execute(
            """SELECT created_at FROM growth
               WHERE farm_id = %s
               ORDER BY CAST(growth_progress_in_gdd AS DECIMAL(10,2)) ASC
               LIMIT 1""",
            (farm_id,),
        )
        row = cur.fetchone()

    planting_date: Optional[date] = None
    if row:
        ts = row["created_at"]
        planting_date = ts.date() if isinstance(ts, datetime) else ts

    # Daily min/max of preferred sensor (temp_i2c with temperature fallback)
    sql = """
        SELECT
            DATE(created_at) AS day,
            MIN(COALESCE(temp_i2c, temperature)) AS t_min,
            MAX(COALESCE(temp_i2c, temperature)) AS t_max
        FROM sensors
        WHERE farm_id = %s
    """
    params: list = [farm_id]
    if planting_date:
        sql += " AND DATE(created_at) >= %s"
        params.append(planting_date)
    sql += " GROUP BY DATE(created_at) ORDER BY day ASC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    cumulative = 0.0
    daily_gdds: list[dict] = []
    for r in rows:
        if r["t_min"] is None or r["t_max"] is None:
            continue
        t_min = max(float(r["t_min"]), GDD_BASE)
        t_max = min(float(r["t_max"]), GDD_CEIL)
        daily = max(0.0, (t_max + t_min) / 2.0 - GDD_BASE)
        cumulative += daily
        daily_gdds.append({"date": str(r["day"]), "gdd": round(daily, 2)})

    cumulative = round(cumulative, 1)

    # Current stage — highest threshold the crop has passed
    current_stage = None
    for s in _STAGE_MILESTONES:
        if cumulative >= s["gdd"]:
            current_stage = s

    # Days since planting
    days_since: Optional[int] = None
    if planting_date:
        days_since = (date.today() - planting_date).days

    # Project dates to R3 (harvest) and R6 (maturity) from recent daily GDD rate
    projected_r3_date: Optional[str] = None
    projected_r6_date: Optional[str] = None
    if daily_gdds:
        recent = daily_gdds[-7:]
        avg_daily = sum(d["gdd"] for d in recent) / len(recent)
        if avg_daily > 0:
            today = date.today()
            r3_rem = max(0.0, 1875.0 - cumulative)
            r6_rem = max(0.0, 2700.0 - cumulative)
            if r3_rem > 0:
                projected_r3_date = (today + timedelta(days=int(r3_rem / avg_daily))).isoformat()
            if r6_rem > 0:
                projected_r6_date = (today + timedelta(days=int(r6_rem / avg_daily))).isoformat()

    return {
        "farm_id":             farm_id,
        "cumulative_gdd":      cumulative,
        "planting_date":       planting_date.isoformat() if planting_date else None,
        "current_stage_id":    current_stage["id"]    if current_stage else None,
        "current_stage_label": current_stage["label"] if current_stage else "Pre-Emergence",
        "days_since_planting": days_since,
        "projected_r3_date":   projected_r3_date,
        "projected_r6_date":   projected_r6_date,
        "r3_gdd":              1875,
        "r6_gdd":              2700,
    }


class GrowthLogCreate(BaseModel):
    farm_id: str
    growth_progress_in_gdd: float
    height: Optional[float] = None
    n_ears: Optional[int] = None
    notes: Optional[str] = None
    observation_date: Optional[datetime] = None


@app.post(
    "/api/growth",
    tags=["Farm IoT"],
    status_code=201,
    summary="Record a field observation",
    response_description="Confirmation with the stored observation timestamp",
)
def create_growth_log(
    body: GrowthLogCreate, db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Saves a manual growth observation (plant height, ear count, notes, current GDD stage).

    `growth_progress_in_gdd` must be a numeric float matching one of the canonical stage
    GDD thresholds (e.g. `0.0` for planting, `110.0` for VE emergence, `1875.0` for harvest).
    The planting log (`growth_progress_in_gdd = 0`) is used by `/api/gdd/{farm_id}` to
    determine the crop's start date.

    `observation_date` should be a **local Bangkok time** datetime string without timezone
    suffix. If omitted, `datetime.now()` (server local time) is used.
    """
    ts = body.observation_date or datetime.now()
    sql = """
        INSERT INTO growth (farm_id, growth_progress_in_gdd, height, n_ears, notes, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    with db.cursor() as cur:
        cur.execute(
            sql,
            (
                body.farm_id,
                body.growth_progress_in_gdd,
                body.height,
                body.n_ears,
                body.notes,
                ts,
            ),
        )
    db.commit()
    return {"status": "created", "observation_date": ts.isoformat()}


@app.get(
    "/api/growth",
    tags=["Farm IoT"],
    summary="Growth observation history",
    response_description="Growth log rows sorted ascending by created_at",
)
def get_growth_data(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id (e.g. 'FARM_001')"),
    start_date: Optional[datetime] = Query(
        None,
        description="Start datetime as local Bangkok time, e.g. `2026-01-01T00:00:00`",
    ),
    end_date: Optional[datetime] = Query(
        None,
        description="End datetime as local Bangkok time, e.g. `2026-12-31T23:59:59`",
    ),
    db: pymysql.connections.Connection = Depends(get_db),
):
    """
    Returns growth observation logs in chronological order.

    `growth_progress_in_gdd` is returned as a `DECIMAL(10,2)` cast to ensure numeric
    JSON output even for rows originally stored as strings in older schema versions.
    """
    sql = "SELECT id, farm_id, CAST(growth_progress_in_gdd AS DECIMAL(10,2)) AS growth_progress_in_gdd, height, n_ears, notes, created_at FROM growth WHERE 1=1"
    params = []

    if farm_id:
        sql += " AND farm_id = %s"
        params.append(farm_id)
    if start_date:
        sql += " AND created_at >= %s"
        params.append(_naive(start_date))
    if end_date:
        sql += " AND created_at <= %s"
        params.append(_naive(end_date))

    sql += " ORDER BY created_at ASC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
