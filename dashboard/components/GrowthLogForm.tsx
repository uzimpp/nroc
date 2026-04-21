"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { postGrowthLog } from "@/lib/api";
import { CORN_STAGES, type CornStage, type StageGroup } from "@/lib/stages";
import Button from "./ui/Button";

interface Props { farmId: string; onSuccess: () => void; onClose: () => void; }

const INPUT = `w-full rounded-[--radius-sm] border border-[--border] bg-[--bg-elevated]
  px-3 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted]
  focus:outline-none focus:ring-2 focus:ring-[--brand-mid] focus:border-transparent
  focus:bg-[--bg-surface] transition-all`;

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-caps block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[--text-muted]">{hint}</p>}
    </div>
  );
}

const GROUP_LABELS: Record<StageGroup, string> = {
  vegetative: "Vegetative (V)",
  reproductive: "Reproductive (R)",
};

export default function GrowthLogForm({ farmId, onSuccess, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string>("plant");
  const [height, setHeight]         = useState("");
  const [ears, setEars]             = useState("");
  const [notes, setNotes]           = useState("");
  const [date, setDate]             = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [openGroup, setOpenGroup]   = useState<StageGroup>("vegetative");

  const selected = CORN_STAGES.find(s => s.id === selectedId) ?? CORN_STAGES[0];

  const vStages = CORN_STAGES.filter(s => s.group === "vegetative");
  const rStages = CORN_STAGES.filter(s => s.group === "reproductive");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await postGrowthLog({
        farm_id: farmId,
        growth_progress_in_gdd: selected.gdd,
        height: height ? parseFloat(height) : undefined,
        n_ears: ears   ? parseInt(ears, 10)  : undefined,
        notes:  notes.trim() || undefined,
        observation_date: date || undefined,
      });
      onSuccess();
    } catch { setError("Failed to save. Is the API running?"); }
    finally  { setSaving(false); }
  }

  function StageButton({ stage }: { stage: CornStage }) {
    const Icon   = stage.icon;
    const active = stage.id === selectedId;
    return (
      <button
        type="button"
        onClick={() => setSelectedId(stage.id)}
        title={stage.detail}
        className={`
          flex items-center gap-2 rounded-[--radius-sm] border px-2.5 py-2 text-left
          transition-all duration-150 hover:shadow-sm
          ${active
            ? "border-[--brand-mid] bg-[--brand-light] shadow-sm"
            : "border-[--border] bg-[--bg-elevated] hover:border-[--brand-light]"}
        `}
      >
        <Icon size={14} className={active ? "text-[--brand-mid] shrink-0" : "text-[--text-muted] shrink-0"} />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold leading-tight ${active ? "text-[--brand]" : "text-[--text-secondary]"}`}>
            {stage.label}
          </p>
          <p className="text-[9px] text-[--text-muted] leading-tight truncate">{stage.desc}</p>
        </div>
        {active && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[--brand-mid]" />
        )}
      </button>
    );
  }

  function GroupSection({ group, stages }: { group: StageGroup; stages: CornStage[] }) {
    const isOpen = openGroup === group;
    const hasSelected = stages.some(s => s.id === selectedId);
    return (
      <div className={`rounded-[--radius-sm] border overflow-hidden ${hasSelected ? "border-[--brand-light]" : "border-[--border]"}`}>
        <button
          type="button"
          onClick={() => setOpenGroup(isOpen ? (group === "vegetative" ? "reproductive" : "vegetative") : group)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors
            ${isOpen ? "bg-[--brand-light]" : "bg-[--bg-elevated] hover:bg-[--bg-surface]"}`}
        >
          <span className="label-caps">{GROUP_LABELS[group]}</span>
          <div className="flex items-center gap-2">
            {hasSelected && (
              <span className="text-[10px] font-semibold text-[--brand-mid]">
                {stages.find(s => s.id === selectedId)?.label}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-[--text-muted] transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {isOpen && (
          <div className="p-2 grid grid-cols-3 gap-1.5 bg-[--bg-surface]">
            {stages.map(s => <StageButton key={s.id} stage={s} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[--radius-xl] overflow-hidden shadow-[--shadow-lg] max-h-[95svh] flex flex-col">

        {/* Header */}
        <div className="bg-[--brand] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="display-italic text-2xl text-[--text-on-dark]">Log Observation</h2>
              <p className="text-[--text-on-dark]/60 text-xs mt-0.5">
                Select any date to backfill past records.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={submit} className="bg-[--bg-surface] overflow-y-auto flex flex-col gap-4 p-6">

          <Field label="Observation Date">
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={INPUT}
            />
          </Field>

          {/* Stage picker */}
          <div>
            <label className="label-caps block mb-1.5">
              Growth Stage Reached <span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="flex flex-col gap-1.5">
              <GroupSection group="vegetative" stages={vStages} />
              <GroupSection group="reproductive" stages={rStages} />
            </div>

            {/* Selected stage detail card */}
            <div className="mt-2 rounded-[--radius-sm] bg-[--brand-light] border border-[--brand-light] px-3 py-2.5 flex items-start gap-2.5">
              {(() => { const Icon = selected.icon; return <Icon size={15} className="text-[--brand-mid] mt-0.5 shrink-0" />; })()}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[--brand]">
                  {selected.label} — {selected.desc}
                  <span className="ml-2 font-normal text-[--brand-muted]">({selected.gdd} GDD)</span>
                </p>
                <p className="text-[10px] text-[--text-muted] leading-relaxed mt-0.5">{selected.detail}</p>
              </div>
            </div>

            {/* Reference link */}
            <p className="mt-1.5 text-[10px] text-[--text-muted]">
              Not sure which stage?{" "}
              <a
                href="https://www.cropscience.bayer.us/articles/bayer/corn-growth-stages-and-gdu-requirements"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--brand-mid] underline underline-offset-2 hover:text-[--brand] transition-colors"
              >
                See the corn growth stages guide
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)" hint="Measure from base to top leaf">
              <input
                type="number" min="0" step="0.1" placeholder="e.g. 85"
                value={height} onChange={e => setHeight(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="No. of Ears" hint="Count visible ear shoots">
              <input
                type="number" min="0" placeholder="e.g. 2"
                value={ears} onChange={e => setEars(e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              placeholder="e.g. V6 confirmed, growing point above soil, nodal roots visible…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={INPUT + " resize-none"}
            />
          </Field>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-[--radius-sm] px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>Save Entry</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
