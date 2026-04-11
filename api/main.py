from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
import pymysql

from api.database import get_db_connection

app = FastAPI(
    title="Agricultural Data API",
    description="API for accessing market prices, weather forecasts, sensor telemetry, and crop growth tracking.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Agricultural Data API is running. Go to /docs for Swagger UI."}

@app.get("/api/market-prices", tags=["Market"])
def get_market_prices(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    product_id: Optional[int] = Query(None, description="Filter by generic product ID (e.g. 206 for medium corn)"),
    db: pymysql.connections.Connection = Depends(get_db)
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
    start_time: Optional[datetime] = Query(None, description="Start datetime (e.g., 2026-04-11T00:00:00)"),
    end_time: Optional[datetime] = Query(None, description="End datetime"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    sql = "SELECT lat, lon, forecast_datetime, temperature, humidity, pressure, rain, wind_speed, wind_dir, cond, created_at FROM weather_forecast_hourly WHERE 1=1"
    params = []
    
    if start_time:
        sql += " AND forecast_datetime >= %s"
        params.append(start_time)
    if end_time:
        sql += " AND forecast_datetime <= %s"
        params.append(end_time)
        
    sql += " ORDER BY forecast_datetime ASC"
    
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()

@app.get("/api/weather/daily", tags=["Weather"])
def get_weather_daily(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: pymysql.connections.Connection = Depends(get_db)
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

@app.get("/api/sensors", tags=["Farm IoT"])
def get_sensors_data(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id"),
    start_date: Optional[datetime] = Query(None, description="Start datetime"),
    end_date: Optional[datetime] = Query(None, description="End datetime"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    sql = "SELECT id, farm_id, lat, lon, moisture_raw, moisture, light, temperature, humidity, temp_i2c, created_at FROM sensors WHERE 1=1"
    params = []
    
    if farm_id:
        sql += " AND farm_id = %s"
        params.append(farm_id)
    if start_date:
        sql += " AND created_at >= %s"
        params.append(start_date)
    if end_date:
        sql += " AND created_at <= %s"
        params.append(end_date)
        
    sql += " ORDER BY created_at DESC"
    
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()

@app.get("/api/growth", tags=["Farm IoT"])
def get_growth_data(
    farm_id: Optional[str] = Query(None, description="Filter by farm_id"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    sql = "SELECT id, farm_id, growth_progress_in_gdd, height, n_ears, notes, created_at FROM growth WHERE 1=1"
    params = []
    
    if farm_id:
        sql += " AND farm_id = %s"
        params.append(farm_id)
        
    sql += " ORDER BY created_at DESC"
    
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
