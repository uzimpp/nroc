"use client";

import { format, parseISO } from "date-fns";
import {
  Sun, CloudSun, Cloud, CloudDrizzle, CloudRain,
  CloudLightning, Snowflake, Wind, Thermometer, Droplets,
  type LucideIcon,
} from "lucide-react";
import type { WeatherDaily } from "@/lib/api";
import Card from "./ui/Card";

interface CondDef { label: string; Icon: LucideIcon; color: string }

const COND: Record<number, CondDef> = {
  1:  { label: "Clear",         Icon: Sun,            color: "text-amber-500" },
  2:  { label: "Partly Cloudy", Icon: CloudSun,       color: "text-amber-400" },
  3:  { label: "Cloudy",        Icon: Cloud,          color: "text-slate-400"  },
  4:  { label: "Overcast",      Icon: Cloud,          color: "text-slate-500"  },
  5:  { label: "Light Rain",    Icon: CloudDrizzle,   color: "text-blue-400"   },
  6:  { label: "Moderate Rain", Icon: CloudRain,      color: "text-blue-500"   },
  7:  { label: "Heavy Rain",    Icon: CloudRain,      color: "text-blue-700"   },
  8:  { label: "Thunderstorm",  Icon: CloudLightning, color: "text-purple-500" },
  9:  { label: "Very Cold",     Icon: Snowflake,      color: "text-sky-400"    },
  10: { label: "Cold",          Icon: Wind,           color: "text-sky-500"    },
  11: { label: "Cool",          Icon: Wind,           color: "text-slate-400"  },
  12: { label: "Very Hot",      Icon: Thermometer,    color: "text-red-500"    },
};
const DEFAULT_COND: CondDef = { label: "—", Icon: CloudSun, color: "text-slate-400" };

export default function WeatherForecast({ forecast, maxDays = 5 }: { forecast: WeatherDaily[]; maxDays?: number }) {
  const days = forecast.slice(0, maxDays);

  return (
    <Card noPad className="p-6">
      <p className="label-caps mb-4">{maxDays}-Day Forecast</p>

      {days.length === 0 ? (
        <p className="text-sm text-[--text-muted]">No forecast data available.</p>
      ) : (
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d, i) => {
            const { label, Icon, color } = d.cond !== null ? (COND[d.cond] ?? DEFAULT_COND) : DEFAULT_COND;
            const date = parseISO(d.forecast_date);
            return (
              <div
                key={d.forecast_date}
                className={`
                  flex flex-col items-center gap-1.5 rounded-[--radius-md] p-3 text-center
                  ${i === 0
                    ? "bg-[--brand-light] ring-1 ring-[--brand-mid]/20"
                    : "bg-[--bg-elevated]"}
                `}
              >
                <p className="label-caps !text-[9px]">{i === 0 ? "Today" : format(date, "EEE")}</p>
                <p className="text-[10px] text-[--text-muted]">{format(date, "d MMM")}</p>
                <Icon size={28} className={color} />
                <p className="text-[10px] text-[--text-secondary] leading-tight">{label}</p>
                <div className="data-num flex items-center gap-0.5 text-xs font-semibold">
                  <span className="text-red-500">{d.temp_max !== null ? `${d.temp_max}°` : "—"}</span>
                  <span className="text-[--border-strong]">/</span>
                  <span className="text-blue-500">{d.temp_min !== null ? `${d.temp_min}°` : "—"}</span>
                </div>
                <div className="text-[10px] text-[--text-muted] space-y-0.5">
                  <div className="flex items-center justify-center gap-0.5">
                    <Droplets size={9} className="text-blue-400" />
                    {d.humidity !== null ? `${d.humidity}%` : "—"}
                  </div>
                  <div className="flex items-center justify-center gap-0.5">
                    <CloudRain size={9} className="text-blue-500" />
                    {d.rain !== null ? `${d.rain}mm` : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
