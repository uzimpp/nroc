const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SensorReading {
  id: number;
  farm_id: string;
  lat: number;
  lon: number;
  moisture_raw: number | null;
  moisture: number | null;
  light: number | null;
  temperature: number | null;
  humidity: number | null;
  temp_i2c: number | null;
  created_at: string;
}

export interface GrowthLog {
  id: number;
  farm_id: string;
  growth_progress_in_gdd: string;
  height: number | null;
  n_ears: number | null;
  notes: string | null;
  created_at: string;
}

export interface WeatherDaily {
  lat: number;
  lon: number;
  forecast_date: string;
  temp_max: number | null;
  temp_min: number | null;
  humidity: number | null;
  pressure: number | null;
  rain: number | null;
  wind_speed: number | null;
  wind_dir: number | null;
  cond: number | null;
  created_at: string;
}

export interface MarketPrice {
  id: number;
  product_id: number;
  product_name: string;
  record_date: string;
  price_min: number | null;
  price_max: number | null;
  unit: string;
  fetched_at: string;
}

export interface GrowthLogCreate {
  farm_id: string;
  growth_progress_in_gdd: string;
  height?: number;
  n_ears?: number;
  notes?: string;
  observation_date?: string;
}

// ── Core fetch ───────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/** Returns distinct farm_ids from the sensors table. */
export function fetchFarms(): Promise<string[]> {
  return get<string[]>("/api/farms");
}

/**
 * Latest single sensor reading. Uses the dedicated /latest endpoint (LIMIT 1)
 * so it never scans the full table.
 */
export function fetchLatestSensor(farmId?: string): Promise<SensorReading[]> {
  return get<SensorReading[]>(`/api/sensors/latest${qs({ farm_id: farmId })}`);
}

/**
 * Sensor readings over a time range.
 * Omit farmId to query all farms.
 */
export function fetchSensors(
  startDate: string,
  endDate: string,
  farmId?: string,
): Promise<SensorReading[]> {
  return get<SensorReading[]>(
    `/api/sensors${qs({ farm_id: farmId, start_date: startDate, end_date: endDate })}`,
  );
}

/** Growth observation logs. Omit all params to fetch everything. */
export function fetchGrowthLogs(
  farmId?: string,
  startDate?: string,
  endDate?: string,
): Promise<GrowthLog[]> {
  return get<GrowthLog[]>(`/api/growth${qs({ farm_id: farmId, start_date: startDate, end_date: endDate })}`);
}

export function fetchWeatherDaily(startDate: string, endDate: string): Promise<WeatherDaily[]> {
  return get<WeatherDaily[]>(`/api/weather/daily${qs({ start_date: startDate, end_date: endDate })}`);
}

export function fetchWeatherHourly(startDate: string, endDate: string): Promise<WeatherDaily[]> {
  return get<WeatherDaily[]>(`/api/weather/hourly${qs({ start_date: startDate, end_date: endDate })}`);
}

export function fetchMarketPrices(startDate: string, endDate: string): Promise<MarketPrice[]> {
  return get<MarketPrice[]>(`/api/market-prices${qs({ start_date: startDate, end_date: endDate })}`);
}

export async function postGrowthLog(body: GrowthLogCreate): Promise<void> {
  const res = await fetch(`${BASE}/api/growth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}
