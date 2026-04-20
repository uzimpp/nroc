"use client";

import { useState } from "react";
import { Download, Calendar, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { downloadCSV, todayStr } from "@/lib/csv";
import Button from "./ui/Button";

// ── Public config type ────────────────────────────────────────────────────────

export interface ExportConfig {
  title: string;
  description: string;
  filenamePrefix: string;
  /** Pre-loaded rows used for "All time" instant preview. Pass [] if none. */
  preloaded: Record<string, unknown>[];
  /** Return rows for "All time". Receives the preloaded array to avoid re-fetch. */
  fetchAll: (preloaded: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>;
  /** Return rows for a custom range. Args are full ISO-8601 strings. */
  fetchRange: (startIso: string, endIso: string) => Promise<Record<string, unknown>[]>;
  /** Pre-fill the "From" date input (e.g. planting date). */
  defaultStart?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT = [
  "w-full rounded-[--radius-sm] border border-[--border] bg-[--bg-elevated]",
  "px-3 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted]",
  "focus:outline-none focus:ring-2 focus:ring-[--brand-mid] focus:border-transparent",
  "focus:bg-[--bg-surface] transition-all",
].join(" ");

type RangeMode = "all" | "custom";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps block mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[--text-muted]">{hint}</p>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  config: ExportConfig;
  onClose: () => void;
}

export default function ExportCsvModal({ config, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [mode, setMode]         = useState<RangeMode>("all");
  const [startDate, setStart]   = useState(config.defaultStart ?? "");
  const [endDate, setEnd]       = useState(today);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [exported, setExported] = useState<number | null>(null);

  function previewCount(): number {
    if (mode === "all") return config.preloaded.length;
    const s = startDate ? new Date(startDate).getTime() : -Infinity;
    const e = endDate   ? new Date(endDate + "T23:59:59").getTime() : Infinity;
    return config.preloaded.filter(row => {
      const ts = (row as { created_at?: string; record_date?: string }).created_at
        ?? (row as { record_date?: string }).record_date;
      if (!ts) return true;
      const t = new Date(ts as string).getTime();
      return t >= s && t <= e;
    }).length;
  }

  function validate(): string {
    if (mode === "custom" && startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return "Start date must be before or equal to end date.";
    }
    return "";
  }

  async function handleExport() {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    setExported(null);

    try {
      let rows: Record<string, unknown>[];

      if (mode === "all") {
        rows = await config.fetchAll(config.preloaded);
      } else {
        const startIso = startDate
          ? new Date(startDate + "T00:00:00").toISOString()
          : new Date(0).toISOString();
        const endIso = endDate
          ? new Date(endDate + "T23:59:59").toISOString()
          : new Date().toISOString();
        rows = await config.fetchRange(startIso, endIso);
      }

      if (rows.length === 0) {
        setError("No records found for the selected date range.");
        return;
      }

      setExported(rows.length);

      const suffix = mode === "all"
        ? "all"
        : [startDate, endDate].filter(Boolean).join("_to_");

      downloadCSV(rows, `${config.filenamePrefix}_${suffix}_${todayStr()}.csv`);

      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  const rowCount        = previewCount();
  const validationError = validate();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[--radius-xl] overflow-hidden shadow-[--shadow-lg] bg-white">

        <div className="bg-[--brand] px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="display-italic text-2xl text-[--text-on-dark]">{config.title}</h2>
            <p className="text-[--text-on-dark]/60 text-xs mt-0.5">{config.description}</p>
          </div>
          {/* <button */}
          {/*   onClick={onClose} */}
          {/*   aria-label="Close export dialog" */}
          {/*   className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" */}
          {/* > */}
          {/*   <X size={14} /> */}
          {/* </button> */}
        </div>

        <div className="bg-[--bg-surface] p-6 flex flex-col gap-5">

          <Field label="Date Range">
            <div className="grid grid-cols-2 gap-2">
              {(["all", "custom"] as RangeMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(""); setExported(null); }}
                  className={[
                    "flex items-center gap-2 rounded-[--radius-sm] border px-4 py-3 text-left transition-all duration-150",
                    mode === m
                      ? "border-[--brand-mid] bg-[--brand-light] text-[--brand]"
                      : "border-[--border] bg-[--bg-elevated] text-[--text-secondary] hover:border-[--brand-light]",
                  ].join(" ")}
                >
                  <Calendar size={14} className="shrink-0" />
                  <span className="text-sm font-semibold">
                    {m === "all" ? "All time" : "Custom range"}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          {mode === "custom" && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
              <Field label="From" hint="Leave blank for earliest records">
                <input
                  type="date"
                  value={startDate}
                  max={endDate || today}
                  onChange={e => { setStart(e.target.value); setError(""); setExported(null); }}
                  className={INPUT}
                />
              </Field>
              <Field label="To" hint="Defaults to today">
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  max={today}
                  onChange={e => { setEnd(e.target.value); setError(""); setExported(null); }}
                  className={INPUT}
                />
              </Field>
            </div>
          )}

          {exported !== null ? (
            <div className="flex items-center gap-2 rounded-[--radius-sm] bg-[--brand-light] border border-[--brand-light] px-3 py-2.5 text-xs">
              <CheckCircle2 size={14} className="text-[--brand-mid] shrink-0" />
              <span className="text-[--brand] font-semibold">
                Downloaded {exported} record{exported !== 1 ? "s" : ""} — check your downloads folder.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[--radius-sm] bg-[--bg-elevated] border border-[--border] px-3 py-2.5 text-xs text-[--text-secondary]">
              <Download size={13} className="text-[--text-muted] shrink-0" />
              <span>
                {rowCount > 0
                  ? <><strong className="text-[--text-primary] font-semibold">{rowCount}</strong>{" "}record{rowCount !== 1 ? "s" : ""} will be exported.</>
                  : <span className="text-[--text-muted]">No records match this range.</span>
                }
              </span>
            </div>
          )}

          {(error || validationError) && (
            <div className="flex items-start gap-2 rounded-[--radius-sm] bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-600">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{error || validationError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              onClick={handleExport}
              loading={loading}
              disabled={!!validationError || rowCount === 0}
            >
              <Download size={14} className="mr-1.5" />
              Export {rowCount > 0 ? `(${rowCount})` : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
