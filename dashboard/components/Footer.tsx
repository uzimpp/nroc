"use client";

import Link from "next/link";
import { Wheat } from "lucide-react";

const LINKS = [
  { href: "/overview", label: "Overview"      },
  { href: "/monitor",  label: "Field Monitor" },
  { href: "/growth",   label: "Corn Growth"   },
  { href: "/market",   label: "Market"        },
];

const GDD_STAGES = [
  { id: "VE",  gdd: 110,  short: "Emergence"   },
  { id: "V6",  gdd: 520,  short: "6-leaf"       },
  { id: "VT",  gdd: 1350, short: "Tasseling"    },
  { id: "R1",  gdd: 1500, short: "Silking"      },
  { id: "R3",  gdd: 1875, short: "Milk / Harvest" },
  { id: "R6",  gdd: 2700, short: "Maturity"     },
];

export default function Footer() {
  return (
    <footer className="bg-brand border-t border-white/8" role="contentinfo">
      <div className="max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">

        {/* Big brand watermark */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-12 border-b border-white/8 overflow-hidden">
          <p
            aria-hidden="true"
            className="display-italic text-base leading-[0.85] tracking-tighter select-none pointer-events-none whitespace-nowrap"
            style={{ fontSize: "clamp(5rem, 14vw, 10rem)" }}
          >
            Nroc
          </p>
        </div>

        {/* Content grid */}
        <div className="py-12 sm:py-16 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-10">

          {/* Brand col */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <Wheat size={15} className="text-white/40 group-hover:text-white/70 transition-colors" aria-hidden="true" />
              <span className="display text-white text-base group-hover:text-white/70 transition-colors">Nroc</span>
            </Link>
            <p className="text-white/35 text-xs leading-relaxed max-w-[200px]">
              Real-time corn field intelligence — IoT sensors, weather forecasts, and market prices unified.
            </p>
          </div>

          {/* Dashboard links */}
          <div>
            <p className="label-caps text-white/20 mb-5">Dashboard</p>
            <ul className="flex flex-col gap-3" role="list">
              {LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-white/45 hover:text-white text-xs transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Data sources */}
          <div>
            <p className="label-caps text-white/20 mb-5">Data Sources</p>
            <ul className="flex flex-col gap-3 text-xs text-white/35" role="list">
              <li>IoT telemetry (MQTT, FARM_001)</li>
              <li>Thai Met. Dept. weather</li>
              <li>Talad Thai wholesale prices</li>
              <li>USDA GDD scale (base 10 °C)</li>
            </ul>
          </div>

          {/* GDD quick reference */}
          <div>
            <p className="label-caps text-white/20 mb-5">GDD Reference</p>
            <p className="text-[10px] text-white/25 font-mono mb-4 leading-relaxed">
              GDD = ((T_max + T_min) / 2) − 10°C
            </p>
            <div className="flex flex-col gap-1.5">
              {GDD_STAGES.map(s => (
                <div key={s.id} className="flex items-baseline gap-2">
                  <span className="data-num text-[10px] font-semibold text-white/40 w-7 shrink-0">{s.id}</span>
                  <span className="data-num text-[10px] text-white/20 w-12 shrink-0">{s.gdd}</span>
                  <span className="text-[10px] text-white/30">{s.short}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="py-5 border-t border-white/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="label-caps text-white/18">
            Kasetsart University · Agricultural IoT Research Project
          </p>
          <p className="data-num text-[10px] text-white/18">
            {new Date().getFullYear()} Nroc Dashboard
          </p>
        </div>
      </div>
    </footer>
  );
}
