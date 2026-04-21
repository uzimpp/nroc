# NROC — Smart Corn Farming Dashboard
> IoT sensor telemetry · TMD weather forecasts · Talad Thai market prices — unified in one decision-support dashboard for sweet corn farmers.

<p align="center">
  <img src="assets/kidbright.png" alt="KidBright Board & Sensors" width="400"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

---

## System Architecture

```
KidBright ESP32 ──MQTT/JSON──► FastAPI (port 8000) ──► MySQL
Talaad Thai scraper ──────────►        │
TMD weather fetcher ──────────►        │
                                       ▼
                               Next.js Dashboard (port 3000)
```

All timestamps in the database are stored as **Bangkok local time (UTC+7) without timezone suffix**. The API and dashboard both use local-time strings (never UTC ISO strings) when filtering sensor data to avoid a 7-hour data gap.

---

## Repository Layout

```
nroc/
├── api/                  FastAPI backend
│   ├── main.py           All route handlers
│   ├── database.py       PyMySQL connection factory
│   └── Dockerfile
├── dashboard/            Next.js 16 frontend (Turbopack)
│   ├── app/
│   │   ├── page.tsx      Landing page
│   │   ├── overview/     Farm overview (GDD, sensors, market, weather)
│   │   ├── monitor/      Sensor history charts + weather
│   │   ├── growth/       GDD timeline + growth log form
│   │   └── market/       Price history across corn grades
│   ├── components/       Shared UI components
│   └── lib/
│       ├── api.ts        Typed fetch helpers
│       ├── stages.ts     Canonical CORN_STAGES (22 entries)
│       └── csv.ts        CSV export utilities
├── embedded/             MicroPython firmware for KidBright
├── fetch-data/           Talaad Thai price scraper
├── fetch_weather/        TMD weather fetcher
├── schema.sql            MySQL table definitions
├── docker-compose.yml
└── visualization.md      Chart & animation design notes
```

---

## Hardware — KidBright IoT Sensors

| Sensor | Column | Purpose |
|:---|:---|:---|
| LM73 (I2C) | `temp_i2c` | High-precision temperature — primary for GDD |
| DHT11 | `temperature`, `humidity` | Ambient temperature + humidity fallback |
| Capacitive | `moisture` | Soil moisture (0–100 %) |
| LDR | `light` | Light intensity (lux) |

`temp_i2c` is preferred over `temperature` throughout GDD calculation and chart display. The DHT11 reading is shown as a secondary dashed line on the temperature chart.

---

## GDD Calculation — Modified USDA Sweet Corn Method

Daily GDD is computed **on the backend** (`/api/gdd/{farm_id}`) using the USDA sweet corn standard:

```
t_max_capped = min(t_max_raw, 30.0)   # 86 °F ceiling
t_min_capped = max(t_min_raw, 10.0)   # 50 °F base
daily_gdd    = max(0, (t_max_capped + t_min_capped) / 2 − 10)
```

The formula uses **true daily min and max** of `temp_i2c` per calendar day, not a simple average of all readings. The frontend chart mirrors this logic for the visual GDD curve.

Key milestones (GDD thresholds from `lib/stages.ts`):

| Stage | GDD |
|:---|---:|
| VE — Emergence | 110 |
| V6 — 6-Leaf | 520 |
| VT — Tasseling | 1 350 |
| R1 — Silking | 1 500 |
| R3 — Milk / Harvest | 1 875 |
| R6 — Maturity | 2 700 |

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- A running MySQL instance (connection details in `.env`)

### 1. Configure environment
```bash
cp .env.template .env
# Fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
```

### 2. Create tables
```bash
mysql -u <user> -p <dbname> < schema.sql
```

### 3. Start the stack
```bash
docker compose up -d --build
```

| Service | URL |
|:---|:---|
| Farmer Dashboard | http://localhost:3000 |
| API + Swagger docs | http://localhost:8000/docs |

### Local development
```bash
# Backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Frontend
cd dashboard
bun install
bun dev
```

---

## API Overview

Full interactive docs at `/docs` (Swagger UI) and `/redoc`.

| Method | Path | Description |
|:---|:---|:---|
| GET | `/api/farms` | All farms with last-known GPS coordinates |
| GET | `/api/sensors/latest` | Most recent sensor reading for a farm |
| GET | `/api/sensors` | Sensor history — filterable by farm + date range |
| GET | `/api/gdd/{farm_id}` | Cumulative Modified GDD, current stage, harvest projection |
| GET | `/api/growth` | Growth observation logs |
| POST | `/api/growth` | Add a new growth observation |
| GET | `/api/market-prices` | Talad Thai corn prices — filterable by grade + date |
| GET | `/api/weather/daily` | TMD 7-day daily forecast |
| GET | `/api/weather/hourly` | TMD hourly forecast |
| GET | `/api/weather/rain-accumulation` | Weekly rain total + daily breakdown |

All date/datetime query parameters use **local-time strings without timezone suffix** (e.g. `2026-04-21T15:30:00`, not `2026-04-21T08:30:00Z`).

---

## Dashboard Pages

| Page | Route | What it shows |
|:---|:---|:---|
| Landing | `/` | Project intro, feature panels, nav cards |
| Overview | `/overview` | Live sensor stats, GDD curve, sensor history, market prices, 7-day weather |
| Field Monitor | `/monitor` | Full sensor charts (drag-to-pan), rain sparkline, recent readings table, weather export |
| Corn Growth | `/growth` | GDD accumulation ring, growth timeline, observation log form |
| Market Prices | `/market` | Price history chart, per-grade stats, CSV export |

---

## Environment Variables

| Variable | Description |
|:---|:---|
| `DB_HOST` | MySQL hostname |
| `DB_PORT` | MySQL port (default `3306`) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `NEXT_PUBLIC_API_URL` | Backend base URL seen by the browser |
