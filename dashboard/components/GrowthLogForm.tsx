"use client";

import { useState } from "react";
import {
  Sprout, Leaf, Wheat, Scissors, FlaskConical, CircleDot,
} from "lucide-react";
import { postGrowthLog } from "@/lib/api";
import Button from "./ui/Button";

interface Props { farmId: string; onSuccess: () => void; onClose: () => void; }

const INPUT = `w-full rounded-[--radius-sm] border border-[--border] bg-[--bg-elevated]
  px-3 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted]
  focus:outline-none focus:ring-2 focus:ring-[--brand-mid] focus:border-transparent
  focus:bg-[--bg-surface] transition-all`;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// Corn growth stages — corrected thresholds for tropical sweet corn (base 10°C)
// Modified GDD method: T_max capped at 30°C to prevent overestimation in Thailand's climate
const GROWTH_STAGES = [
  { gdd: 0,   icon: CircleDot,   label: "Plant",  desc: "Planting date"        },
  { gdd: 100, icon: Sprout,      label: "VE",     desc: "Emergence"            },
  { gdd: 200, icon: Leaf,        label: "V4",     desc: "4-leaf stage"         },
  { gdd: 350, icon: Leaf,        label: "V8",     desc: "8-leaf stage"         },
  { gdd: 560, icon: Wheat,       label: "VT/R1",  desc: "Tasseling / Silking"  },
  { gdd: 720, icon: FlaskConical, label: "R3",    desc: "Milk stage — harvest" },
  { gdd: 750, icon: Scissors,    label: "Harvest", desc: "Ready to harvest"    },
] as const;

export default function GrowthLogForm({ farmId, onSuccess, onClose }: Props) {
  const [stageIdx, setStageIdx] = useState<number>(0);
  const [height, setHeight]     = useState("");
  const [ears, setEars]         = useState("");
  const [notes, setNotes]       = useState("");
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const selectedStage = GROWTH_STAGES[stageIdx];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await postGrowthLog({
        farm_id: farmId,
        growth_progress_in_gdd: String(selectedStage.gdd),
        height: height ? parseFloat(height) : undefined,
        n_ears: ears   ? parseInt(ears, 10) : undefined,
        notes:  notes.trim() || undefined,
        observation_date: date ? new Date(date).toISOString() : undefined,
      });
      onSuccess();
    } catch { setError("Failed to save. Is the API running?"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[--radius-xl] overflow-hidden shadow-[--shadow-lg]">
        {/* Header */}
        <div className="bg-[--brand] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="display-italic text-2xl text-[--text-on-dark]">Log Observation</h2>
              <p className="text-[--text-on-dark]/60 text-xs mt-0.5">Select any date to backfill past records.</p>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="bg-[--bg-surface] p-6 flex flex-col gap-4">
          <Field label="Observation Date">
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
          </Field>

          <Field label="Growth Stage Reached" required>
            <div className="grid grid-cols-2 gap-2">
              {GROWTH_STAGES.map((s, i) => {
                const Icon = s.icon;
                const active = i === stageIdx;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setStageIdx(i)}
                    className={`
                      flex items-center gap-2.5 rounded-[--radius-sm] border px-3 py-2.5 text-left transition-all
                      ${active
                        ? "border-[--brand-mid] bg-[--brand-light] text-[--brand]"
                        : "border-[--border] bg-[--bg-elevated] text-[--text-secondary] hover:border-[--brand-light]"}
                    `}
                  >
                    <Icon size={16} className={active ? "text-[--brand-mid]" : "text-[--text-muted]"} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">{s.label}</p>
                      <p className="text-[10px] text-[--text-muted] leading-tight truncate">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[10px] text-[--text-muted]">
              Selected: <span className="font-semibold text-[--brand-mid]">{selectedStage.label} — {selectedStage.gdd} GDD</span>
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)">
              <input type="number" min="0" step="0.1" placeholder="e.g. 85"
                value={height} onChange={e => setHeight(e.target.value)} className={INPUT} />
            </Field>
            <Field label="No. of Ears">
              <input type="number" min="0" placeholder="e.g. 2"
                value={ears} onChange={e => setEars(e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea rows={3} placeholder="V8 stage confirmed, tasseling visible…"
              value={notes} onChange={e => setNotes(e.target.value)}
              className={INPUT + " resize-none"} />
          </Field>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-[--radius-sm] px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>Save Entry</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
