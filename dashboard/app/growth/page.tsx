"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Plus, Download } from "lucide-react";
import { fetchGrowthLogs, fetchFarms, type GrowthLog } from "@/lib/api";
import GrowthTimeline from "@/components/GrowthTimeline";
import GrowthLogForm from "@/components/GrowthLogForm";
import { CORN_STAGES } from "@/lib/stages";
import ExportCsvModal, { type ExportConfig } from "@/components/ExportCsvModal";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function GrowthPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [farmId, setFarmId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showExport, setExport] = useState(false);
  const [error, setError] = useState("");

  const page = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const results = await Promise.allSettled([
        fetchGrowthLogs(),
        fetchFarms(),
      ]);
      const [logsResult, farmsResult] = results;
      if (logsResult.status === "fulfilled") setLogs(logsResult.value);
      if (farmsResult.status === "fulfilled" && farmsResult.value.length > 0)
        setFarmId(farmsResult.value[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load growth data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useGSAP(
    () => {
      gsap.from(".tip-card", { x: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power2.out", delay: 0.3 });

      gsap.set(".animate-section", { opacity: 0, y: 40 });
      ScrollTrigger.batch(".animate-section", {
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.12, duration: 0.7, ease: "power2.out" }),
        once: true,
        start: "top 88%",
      });

      gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
    },
    { scope: page, dependencies: [loading] },
  );

  const sorted = [...logs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const latest = sorted.at(-1);
  const planting = sorted[0];

  const growthExportConfig: ExportConfig = {
    title: "Export Growth Logs",
    description: "Download field observation records as a spreadsheet.",
    filenamePrefix: "growth_logs",
    preloaded: logs as unknown as Record<string, unknown>[],
    fetchAll: (pre) => Promise.resolve(pre),
    fetchRange: async (startIso, endIso) => {
      const rows = await fetchGrowthLogs(undefined, startIso, endIso);
      return rows as unknown as Record<string, unknown>[];
    },
    defaultStart: planting?.created_at?.slice(0, 10),
  };

  return (
    <div
      ref={page}
      className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 py-10 flex flex-col gap-8"
    >
      <PageHeader
        eyebrow="Corn Growth"
        title="Growth Tracker"
        description="Stage milestones and field observations. Full 2,700 GDD scale from planting to black layer (R6 physiological maturity)."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setExport(true)}
              disabled={loading || logs.length === 0}
            >
              <Download size={14} className="mr-1.5" />
              Export CSV
            </Button>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />
              Log Observation
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-[--radius-md] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty-state tips */}
      {!loading && logs.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Start with planting (0 GDD)",
              tip: "Log the Plant stage on your planting date to begin tracking heat accumulation.",
            },
            {
              title: "Observe each milestone",
              tip: "Log VE → V-stages → VT/R1 (tasseling & silking) → R-stages as you walk the field.",
            },
            {
              title: "Maturity at R6 (2,700 GDD)",
              tip: "Black layer forms at the base of kernels. Final yield is set. Grain is 30–35% moisture.",
            },
          ].map((c) => (
            <div key={c.title} className="tip-card card border-dashed p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-1">
                {c.title}
              </h3>
              <p className="text-xs text-[--text-muted] leading-relaxed">
                {c.tip}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary strip */}
      {!loading && logs.length > 0 && (
        <div className="animate-section grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            const latestGdd = latest
              ? latest.growth_progress_in_gdd || 0
              : null;
            const latestStage =
              latestGdd !== null
                ? CORN_STAGES.reduce(
                    (best, s) =>
                      Math.abs(s.gdd - latestGdd) <=
                      Math.abs(best.gdd - latestGdd)
                        ? s
                        : best,
                    CORN_STAGES[0],
                  )
                : null;
            return [
              {
                label: "Total Entries",
                value: logs.length.toString(),
                unit: "logs",
              },
              {
                label: "Planting Date",
                value: planting
                  ? format(new Date(planting.created_at), "d MMM")
                  : "—",
                unit: "",
              },
              {
                label: "Last Observation",
                value: latest
                  ? format(new Date(latest.created_at), "d MMM")
                  : "—",
                unit: "",
              },
              {
                label: "Current Stage",
                value: latestStage ? latestStage.label : "—",
                unit: latestGdd ? `${latestGdd} GDD` : "",
              },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="label-caps mb-1.5">{s.label}</p>
                <p className="data-num text-2xl font-semibold text-[--text-primary]">
                  {s.value}{" "}
                  <span className="text-xs font-normal text-[--text-muted]">
                    {s.unit}
                  </span>
                </p>
              </div>
            ));
          })()}
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
            <h2 className="display text-2xl text-[--text-primary] mb-2">
              No growth data yet
            </h2>
            <p className="text-sm text-[--text-muted] mb-6 max-w-sm mx-auto">
              Start by logging the Plant stage on your planting date.
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />
              Log First Entry
            </Button>
          </div>
        ) : (
          <GrowthTimeline logs={logs} />
        )}
      </Card>

      {/* About GDD */}
      <div className="animate-section rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border] p-6">
        <p className="text-sm font-semibold text-[--text-primary] mb-3">
          About Growing Degree Days (GDD)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[--text-muted] leading-relaxed">
          <p>
            GDD measures heat accumulation needed for plant development.
            Standard formula:{" "}
            <strong className="text-[--text-secondary]">
              ((T_max + T_min) / 2) − T_base
            </strong>{" "}
            where T_base = 10 °C. Values are based on a corn product that
            produces 20 leaves and requires{" "}
            <strong className="text-[--text-secondary]">
              2,700 GDD to black layer
            </strong>{" "}
            with a normal planting date.
          </p>
          <p>
            Key milestones: Plant (0) → VE (110) → V6 (520) → VT Tasseling
            (1,350) → R1 Silking (1,500) → R2 Blister (1,700) → R3 Milk (1,875)
            → R4 Dough (1,950) → R5 Dent (2,300) → R6 Black Layer (2,700).
            Source: standard USDA corn agronomy data (GDD base 10 °C).
          </p>
        </div>
      </div>

      {showExport && (
        <ExportCsvModal
          config={growthExportConfig}
          onClose={() => setExport(false)}
        />
      )}

      {showForm && farmId && (
        <GrowthLogForm
          farmId={farmId}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {showForm && !farmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-[--bg-surface] rounded-[--radius-xl] p-8 max-w-sm w-full text-center shadow-[--shadow-lg]">
            <p className="text-[--text-muted] text-sm mb-4">
              No farm found in the database. Add sensor data first.
            </p>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
