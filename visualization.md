# Visualization Design — NROC Dashboard

Documents every chart, animation, and data-display decision in the dashboard. Intended as a reference for contributors extending or debugging the frontend.

---

## Design System

### Color Tokens (`globals.css`)

| Token | Value | Used for |
|:---|:---|:---|
| `--brand` | `#1A3828` | Primary green — buttons, active states |
| `--brand-mid` | `#2A5C40` | Sensor GDD line, soil moisture |
| `--amber` | `#B8832A` | Harvest / R3 milestone, light intensity |
| `--amber-mid` | `#D4993A` | Amber accent |
| `#E05252` | — | Temperature (I2C primary) |
| `#F0964A` | — | Temperature (DHT secondary, dashed) |
| `#3B82F6` | — | Humidity, rain |
| `--text-muted` | `#A49E98` | Labels, axis ticks |
| `--text-secondary` | `#6A6560` | Body text |
| `--bg-base` | `#F3F0E9` | Page background — warm off-white |
| `--bg-surface` | `#FFFFFF` | Card backgrounds |
| `--bg-elevated` | `#EAE7DF` | Hover states, skeleton loaders |

### Typography

| Class | Font | Use |
|:---|:---|:---|
| `.display` | Cormorant Garamond 500 | Section headings |
| `.display-italic` | Cormorant Garamond 400 italic | Page titles, hero |
| `.label-caps` | DM Sans 600, 10 px, 0.14 em spaced, uppercase | Data labels, axis annotations |
| `.data-num` | DM Mono, tabular-nums | All numeric values |

---

## Animation Architecture (GSAP)

### Rule: `gsap.set` + `gsap.to` for scroll-reveal

All scroll-triggered reveal animations follow this pattern to prevent the "flash-to-invisible" bug that occurs when `gsap.from()` is called on elements already in the viewport:

```ts
// 1. Pre-hide elements synchronously before ScrollTrigger is created
gsap.set(".scroll-reveal", { opacity: 0, y: 44 });

// 2. Animate TO the visible state on enter — never FROM
ScrollTrigger.batch(".scroll-reveal", {
  onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }),
  once: true,        // never re-trigger on scroll back up
  start: "top 88%",
});

// 3. Refresh after DOM settles (critical when loading state changes)
gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
```

**Why not `gsap.from()`?**  `from()` has `immediateRender: true` by default, meaning it sets `opacity: 0` the moment `onEnter` fires. If the element is already in the viewport (common on page re-entry after navigation), the user sees a 1-frame flash from visible → invisible → visible.

**Why `once: true`?** Without it, scrolling back up and then down re-triggers `onEnter`, causing repeated flash-in animations. `once: true` kills the ScrollTrigger after it fires once per page mount.

**Why `ScrollTrigger.refresh()`?** Pages with `dependencies: [loading]` in `useGSAP` tear down and recreate the GSAP context when `loading` changes. New DOM elements added during that render won't have correct scroll positions unless `ScrollTrigger.refresh()` recalculates.

### Immediate (non-scroll) animations

Hero titles and stat cards that should animate on page enter use `gsap.from()` directly — this is correct since those elements are always in the viewport on mount:

```ts
gsap.from(".page-title-heading", { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.08 });
```

### Cleanup

`useGSAP` with `{ scope: ref }` handles cleanup automatically on unmount, reverting all inline GSAP styles. This ensures navigation away and back produces a clean re-animation.

---

## Charts

All charts are built with **Recharts** (`ComposedChart`, `LineChart`). Recharts renders SVG and relies on `ResponsiveContainer` for sizing. All containers have explicit pixel heights to avoid the 0-height collapse issue.

### Tooltip Style

All tooltips use a custom dark tooltip to maintain design consistency:

```tsx
content={({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] text-xs min-w-[160px]">
      <p className="text-white/50 text-[10px] pb-2 mb-2 border-b border-white/10">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-white/80">{p.name}</span>
          </div>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}}
```

---

## Chart Details by Page

### Overview (`/overview`)

#### Live Conditions — StatCard grid

Four `StatCard` components in a `grid-cols-2 lg:grid-cols-4` layout showing the latest sensor reading from `/api/sensors/latest`. No time filter — always returns the most recent row regardless of timestamp.

#### GDD Growth Curve — `GddChart`

- **Component**: `app/overview/components/GddChart.tsx`
- **Chart type**: `ComposedChart` with a `Line` (sensor GDD) and scatter-style dots (logged observations)
- **Data source**: `/api/gdd/{farm_id}` for current stage + `/api/sensors` for the raw readings used to draw the cumulative curve
- **X-axis**: calendar date (`d MMM` format)
- **Y-axis**: cumulative GDD (0 – 2700 max)
- **Reference lines**: key stage milestones from `lib/stages.ts` — VE, V6, VT, R1, R3 (amber/harvest), R6
- **Two series**:
  - Blue solid line — sensor-accumulated GDD (Modified USDA formula, computed frontend-side from raw readings for the visual curve)
  - Orange dots — manually logged GDD observations from the growth log

#### Sensor History — `SensorGrid`

- **Component**: `app/overview/components/SensorGrid.tsx`
- **Chart type**: Four `LineChart` panels in a 2×2 grid
- **Downsampling**: Readings are bucketed into 1-hour averages using `format(d, "yyyy-MM-dd'T'HH:00:00")` (local time) as the bucket key. The bucket key must use local time or chart x-axis labels will show UTC times (7 hours behind Bangkok).
- **Brush**: Recharts `<Brush>` component — `startIndex` defaults to `data.length - 96` (last 4 days of hourly data)
- **Temperature**: Shows both `temp_i2c` (primary, red solid) and `temperature` DHT reading (orange dashed secondary line)

#### Market Prices

- **Component**: `components/PriceChart.tsx`
- **Data source**: `/api/market-prices` filtered to the last 30 days. The API returns a `size` field (`"large"`, `"medium"`, `"small"`), and the frontend filters by this field rather than `product_id`.
- **Chart type**: `LineChart` with one line per grade

#### Weather Forecast

- **Component**: `components/WeatherForecast.tsx`
- **Data source**: `/api/weather/daily` for the next 7 days

---

### Field Monitor (`/monitor`)

#### Sensor Charts — `SensorChartsGrid`

- **Component**: `components/SensorChartsGrid.tsx`
- **Chart type**: Four `LineChart` panels with drag-to-pan
- **Drag-to-pan**: Custom `useDragPan` hook tracks `startIdx` state. Mouse/touch drag events shift the index proportionally to drag distance × 1.5× the window size. The `<Brush>` component is controlled via `startIndex` / `endIndex` props.
- **Window size**: 96 points by default (96 hourly buckets = 4 days)
- **Alert rings**: `ring-2 ring-amber-300` applied to cards when humidity > 80 % (disease risk) or soil moisture < 30 % (stress threshold)

#### Rain Sparkline

- **Data source**: `/api/weather/rain-accumulation` — returns ISO week total and per-day breakdown
- **Visualization**: CSS bar chart (no Recharts dependency). Each day gets a `flex-1` column with a div whose height is `(day_mm / max_mm) * 100%`. Minimum rendered height 4 % to keep zero-rain days visible.

#### Recent Readings Table

- GSAP row hover animation: `onMouseEnter` tweens `backgroundColor` to `#1A1714` (near-black) and applies per-column accent colors. `onMouseLeave` reverts with `power2.inOut` easing.
- Key: `r.created_at` (sensors table has no standalone `id` column — `created_at` is unique per reading).

---

### Corn Growth (`/growth`)

#### GDD Ring

- SVG `<circle>` with `stroke-dasharray` / `stroke-dashoffset` for the arc fill
- Percentage computed as `cumulative_gdd / r3_gdd` (target is R3 harvest at 1875 GDD, not R6 maturity)
- Data from `/api/gdd/{farm_id}`

#### Growth Timeline — `GrowthTimeline`

- **Component**: `components/GrowthTimeline.tsx`
- Stage reference pills along a horizontal rule; observation entries below as a vertical log
- `dependencies: [logs.length]` causes GSAP to re-animate stage pills and entries whenever a new log is added

#### Growth Log Form — `GrowthLogForm`

- Datetime input default: `format(new Date(), "yyyy-MM-dd'T'HH:mm")` — local time, not UTC
- Submission: passes the `datetime-local` value directly as `observation_date` (no `toISOString()` conversion) so the stored timestamp matches Bangkok local time

---

### Market Prices (`/market`)

#### Price Chart — `PriceChart`

- **Component**: `components/PriceChart.tsx`
- Three lines: Large (`size: "large"`, blue `#1D4ED8`), Medium (`size: "medium"`, `--brand-mid`), Small (`size: "small"`, purple `#7C3AED`)
- The market price API returns a `size` field that identifies the grade — the frontend uses this instead of checking `product_id` directly.
- Range selector: 30D / 60D / 90D — triggers a new `/api/market-prices` fetch
- Day hover in the price history table: GSAP tweens row `backgroundColor` to black with accent-colored text per column

---

## Date Handling Summary

All timestamps stored in MySQL are Bangkok local time, naive (no timezone suffix). The following rules apply everywhere in the codebase:

| Situation | Correct approach | Wrong approach |
|:---|:---|:---|
| Sensor date range filter | `format(d, "yyyy-MM-dd'T'HH:mm:ss")` | `d.toISOString()` (UTC, 7h behind) |
| Date-only filter (market, weather) | `format(d, "yyyy-MM-dd")` | `d.toISOString().slice(0, 10)` (wrong before 07:00 BKK) |
| Hourly bucket key in downsample | `format(d, "yyyy-MM-dd'T'HH:00:00")` | `d.toISOString()` (shifts x-axis 7h) |
| Growth log datetime input default | `format(new Date(), "yyyy-MM-dd'T'HH:mm")` | `new Date().toISOString().slice(0, 16)` |
| CSV export range | `date + "T00:00:00"` / `date + "T23:59:59"` | `new Date(date + "T00:00:00").toISOString()` |

---

## Export (CSV)

`ExportCsvModal` accepts an `ExportConfig` that decouples the modal from any specific data source:

```ts
interface ExportConfig {
  fetchAll:   (preloaded: Record[]) => Promise<Record[]>;
  fetchRange: (startIso: string, endIso: string) => Promise<Record[]>;
  defaultStart?: string;  // pre-fill "From" date (e.g. planting date)
}
```

`fetchRange` receives local-time ISO strings (`"2026-04-01T00:00:00"`, `"2026-04-21T23:59:59"`) — not UTC — so the backend date comparison against Bangkok-stored timestamps is correct.
