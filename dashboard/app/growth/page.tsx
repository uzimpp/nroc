"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Plus, Download } from "lucide-react";
import { fetchGrowthLogs, fetchFarms, type GrowthLog } from "@/lib/api";
import { downloadCSV, todayStr } from "@/lib/csv";
import GrowthTimeline from "@/components/GrowthTimeline";
import GrowthLogForm from "@/components/GrowthLogForm";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function GrowthPage() {
  const [logs, setLogs]         = useState<GrowthLog[]>([]);
  const [farmId, setFarmId]     = useState<string>("");
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]       = useState("");

  const page = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [growthLogs, farms] = await Promise.all([fetchGrowthLogs(), fetchFarms()]);
      setLogs(growthLogs);
      if (farms.length > 0) setFarmId(farms[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load growth data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useGSAP(() => {
    gsap.from(".tip-card", { x: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power2.out", delay: 0.3 });
    ScrollTrigger.batch(".animate-section", {
      onEnter: els => gsap.from(els, { y: 40, opacity: 0, stagger: 0.12, duration: 0.7, ease: "power2.out" }),
      once: true, start: "top 88%",
    });
  }, { scope: page });

  const sorted   = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const latest   = sorted.at(-1);
  const planting = sorted[0];

  return (
    <div ref={page} className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <PageHeader
        eyebrow="Corn Growth"
        title="Growth Tracker"
        description="Stage milestones and field observations. GDD uses the modified method (T_max capped at 30°C) for tropical conditions."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => downloadCSV(logs as unknown as Record<string, unknown>[], `growth_logs_${todayStr()}.csv`)}
              disabled={loading || logs.length === 0}
            >
              <Download size={14} className="mr-1.5" />Export CSV
            </Button>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Log Observation
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-[--radius-md] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Empty-state tips */}
      {!loading && logs.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Start with planting", tip: "Log the Plant stage on your planting date." },
            { title: "Observe by stage", tip: "Log each time you notice a new growth stage." },
            { title: "Harvest at R3 (720 GDD)", tip: "At the milk stage, the corn is ready to pick." },
          ].map(c => (
            <div key={c.title} className="tip-card card border-dashed p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-1">{c.title}</h3>
              <p className="text-xs text-[--text-muted] leading-relaxed">{c.tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary strip */}
      {!loading && logs.length > 0 && (
        <div className="animate-section grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Entries",    value: logs.length.toString(),                                                       unit: "logs" },
            { label: "Planting Date",    value: planting ? format(new Date(planting.created_at), "d MMM")                  : "—", unit: "" },
            { label: "Last Observation", value: latest   ? format(new Date(latest.created_at),   "d MMM")                  : "—", unit: "" },
            { label: "Latest GDD",       value: latest?.growth_progress_in_gdd ?? "—",                                       unit: "" },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="label-caps mb-1.5">{s.label}</p>
              <p className="data-num text-2xl font-semibold text-[--text-primary]">
                {s.value} <span className="text-xs font-normal text-[--text-muted]">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Growth timeline */}
      <Card className="animate-section p-6 sm:p-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 rounded-[--radius-md] bg-[--bg-elevated] animate-pulse" />
            <div className="h-3 rounded bg-[--bg-elevated] animate-pulse w-3/4" />
            <div className="h-32 rounded-[--radius-md] bg-[--bg-elevated] animate-pulse" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="display text-2xl text-[--text-primary] mb-2">No growth data yet</h2>
            <p className="text-sm text-[--text-muted] mb-6 max-w-sm mx-auto">
              Start by logging the Plant stage on your planting date.
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Log First Entry
            </Button>
          </div>
        ) : (
          <GrowthTimeline logs={logs} />
        )}
      </Card>

      {/* About GDD */}
      <div className="animate-section rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border] p-6">
        <p className="text-sm font-semibold text-[--text-primary] mb-3">About Growing Degree Days (GDD)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[--text-muted] leading-relaxed">
          <p>
            GDD measures heat accumulation needed for plant development.{" "}
            <strong className="text-[--text-secondary]">Modified method (tropical)</strong>: caps T_max at 30°C and T_min at 10°C before averaging.
            Formula: ((min(T_max, 30) + max(T_min, 10)) / 2) − 10.
          </p>
          <p>
            Sweet corn stage thresholds used: Plant (0) → VE (100) → V4 (200) → V8 (350) → VT/R1 (560) → R3 Harvest (720 GDD).
            Source: tropical sweet corn agronomy data (base 10°C).
          </p>
        </div>
      </div>

      {showForm && farmId && (
        <GrowthLogForm
          farmId={farmId}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
        />
      )}

      {showForm && !farmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-[--bg-surface] rounded-[--radius-xl] p-8 max-w-sm w-full text-center shadow-[--shadow-lg]">
            <p className="text-[--text-muted] text-sm mb-4">No farm found in the database. Add sensor data first.</p>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
