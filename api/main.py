from datetime import date, datetime, timedelta
from typing import Optional

import pymysql
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import get_db_connection

app = FastAPI(
    title="Agricultural Data API",
    description="API for accessing market prices, weather forecasts, sensor telemetry, and crop growth tracking.",
    version="1.0.0",
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
        conn.close()


def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Strip timezone info so PyMySQL can serialize the datetime correctly."""
    if dt is None:
        return None
    return dt.replace(tzinfo=None)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "message": "Agricultural Data API is running. Go to /docs for Swagger UI.",
    }


@app.get("/api/market-prices", tags=["Market"])
def get_market_prices(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    product_id: Optional[int] = Query(
        None, description="Filter by generic product ID (e.g. 206 for medium corn)"
    ),
    db: pymysql.connections.Connection = Depends(get_db),
):
    sql = "SELECT id, product_id, product_name, record_date, price_min, price_max, unit, fetched_at FROM market_prices WHERE 1=1"
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

    sql += " ORDER BY record_date ASC"

    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.get("/api/weather/hourly", tags=["Weather"])
def get_weather_hourly(
    start_time: Optional[datetime] = Query(
        None, description="Start datetime (e.g., 2026-04-11T00:00:00)"
    ),
    end_time: Optional[datetime] = Query(None, description="End datetime"),
    db: pymysql.connections.Connection = Depends(get_db),
):
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


@app.get("/api/weather/daily", tags=["Weather"])
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


@app.get("/api/weather/rain-accumulation", tags=["Weather"])
def get_rain_accumulation(
    db: pymysql.connections.Connection = Depends(get_db),
):
    """Weekly rain forecast accumulation for the current ISO week (Mon–Sun)."""
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


@app.get("/api/sensors/latest", tags=["Farm IoT"])
def get_latest_sensor(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id"),
    db: pymysql.connections.Connection = Depends(get_db),
):
    """Return the single most-recent sensor reading, optionally filtered by farm."""
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


@app.get("/api/sensors", tags=["Farm IoT"])
def get_sensors_data(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id"),
    start_date: Optional[datetime] = Query(None, description="Start datetime"),
    end_date: Optional[datetime] = Query(None, description="End datetime"),
    db: pymysql.connections.Connection = Depends(get_db),
):
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


@app.get("/api/farms", tags=["Farm IoT"])
def get_farms(db: pymysql.connections.Connection = Depends(get_db)):
    """Return distinct farms with their last-known GPS coordinates."""
    with db.cursor() as cur:
        cur.execute(
            "SELECT farm_id, MAX(lat) AS lat, MAX(lon) AS lon FROM sensors GROUP BY farm_id ORDER BY farm_id"
        )
        rows = cur.fetchall()
    return [{"id": r["farm_id"], "lat": r["lat"], "lon": r["lon"]} for r in rows]


@app.get("/api/gdd/{farm_id}", tags=["Farm IoT"])
def get_gdd(farm_id: str, db: pymysql.connections.Connection = Depends(get_db)):
    """
    Compute Modified GDD accumulation for a farm using the USDA sweet corn method.
    Formula: cap t_min at 10 °C floor, t_max at 30 °C ceiling, then
    daily_gdd = max(0, (t_max + t_min) / 2 - 10).
    Uses temp_i2c as the preferred sensor column, falling back to temperature.
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


@app.post("/api/growth", tags=["Farm IoT"], status_code=201)
def create_growth_log(
    body: GrowthLogCreate, db: pymysql.connections.Connection = Depends(get_db)
):
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


@app.get("/api/growth", tags=["Farm IoT"])
def get_growth_data(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id"),
    start_date: Optional[datetime] = Query(
        None, description="Start datetime (e.g. 2026-01-01T00:00:00)"
    ),
    end_date: Optional[datetime] = Query(
        None, description="End datetime (e.g. 2026-12-31T23:59:59)"
    ),
    db: pymysql.connections.Connection = Depends(get_db),
):
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
