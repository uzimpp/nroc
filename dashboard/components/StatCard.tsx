"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface StatCardProps {
  label: string;
  rawValue: number | null;
  unit: string;
  icon: ReactNode;           // accepts Lucide <Icon /> or any ReactNode
  valueColor: string;        // CSS color string, e.g. "var(--brand-mid)"
  decimals?: number;
  subtitle?: string;
  alert?: boolean;
}

export default function StatCard({
  label, rawValue, unit, icon,
  valueColor, decimals = 1, subtitle, alert = false,
}: StatCardProps) {
  const [display, setDisplay] = useState<string>("—");
  const proxy = useRef({ val: 0 });

  useEffect(() => {
    if (rawValue === null || rawValue === undefined) { setDisplay("—"); return; }
    gsap.to(proxy.current, {
      val: rawValue,
      duration: 1.3,
      ease: "power2.out",
      onUpdate: () => setDisplay(proxy.current.val.toFixed(decimals)),
    });
  }, [rawValue, decimals]);

  return (
    <div
      className={`
        stat-card card card-lift p-5 flex flex-col gap-3
        ${alert ? "ring-2 ring-amber-300 ring-offset-1" : ""}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        <span className="text-[--text-muted]">{icon}</span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="data-num text-[42px] font-semibold leading-none tracking-tight"
          style={{ color: valueColor }}
        >
          {display}
        </span>
        <span className="data-num text-sm text-[--text-muted]">{unit}</span>
      </div>

      {subtitle && (
        <p className={`text-[11px] font-medium leading-tight ${alert ? "text-amber-600" : "text-[--text-muted]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
