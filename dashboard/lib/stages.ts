import type { ComponentType } from "react";
import {
  CircleDot, Sprout, Leaf, Wheat, FlaskConical, Scissors,
  Sun, Droplets, Layers,
} from "lucide-react";

export type StageGroup = "vegetative" | "reproductive";

export interface CornStage {
  id: string;
  label: string;
  gdd: number;
  desc: string;
  detail: string;
  group: StageGroup;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: "green" | "amber" | "red";
}

export const CORN_STAGES: CornStage[] = [
  // ── Vegetative ──────────────────────────────────────────────────────────
  {
    id: "plant", label: "Plant", gdd: 0,
    desc: "Planting date", detail: "Seed in the ground. Day 0.",
    group: "vegetative", icon: CircleDot, color: "green",
  },
  {
    id: "VE", label: "VE", gdd: 110,
    desc: "Emergence", detail: "Coleoptile breaks soil surface. Photosynthesis begins. ~100–120 GDD.",
    group: "vegetative", icon: Sprout, color: "green",
  },
  {
    id: "V1", label: "V1", gdd: 150,
    desc: "1st Leaf Collar", detail: "First collar visible. Rounded leaf tip. Nodal roots developing.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V2", label: "V2", gdd: 200,
    desc: "2nd Leaf Collar", detail: "Plant relies on seed energy. Seminal roots at max size. ~200 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V3", label: "V3", gdd: 280,
    desc: "3rd Leaf Collar", detail: "Seed no longer supplying energy. Plant self-sustains via photosynthesis.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V4", label: "V4", gdd: 360,
    desc: "4th Leaf Collar", detail: "Critical weed control window. Yield loss risk from competition. ~360 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V5", label: "V5", gdd: 430,
    desc: "5th Leaf Collar", detail: "8–12 inches tall. Growing point still below ground. Leaf & ear shoot number being set.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V6", label: "V6", gdd: 520,
    desc: "6th Leaf Collar", detail: "Growing point now above soil. Susceptible to hail/frost/wind. ~520 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V7", label: "V7", gdd: 590,
    desc: "7th Leaf Collar", detail: "Kernel rows around the cob fixed. Plant begins determining kernels per row.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V8", label: "V8–V9", gdd: 680,
    desc: "8th–9th Leaf Collar", detail: "Rapid growth phase. Brace roots begin. Plant ~36 in tall. ~680–760 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V10", label: "V10–V11", gdd: 820,
    desc: "10th–11th Leaf Collar", detail: "New leaf every 2–3 days. Rapid nutrient uptake. Greensnap risk begins.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V12", label: "V12", gdd: 900,
    desc: "12th Leaf Collar", detail: "~10% total dry matter. All leaves formed. Half exposed to sunlight. ~900 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V13", label: "V13–V16", gdd: 955,
    desc: "13th–16th Leaf Collar", detail: "Kernels per row near final count. V15 ≈ 25% DM, ~2 weeks from silking. 955–1,150 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "V17", label: "V17+", gdd: 1300,
    desc: "17th+ Leaf Collar", detail: "Increasingly vulnerable to yield loss from hail/moisture stress. ~1,300 GDD.",
    group: "vegetative", icon: Leaf, color: "green",
  },
  {
    id: "VT", label: "VT", gdd: 1350,
    desc: "Tasseling", detail: "Pollen shed 4–6 days. 65% N, 50% P, 85% K absorbed. Hail very damaging. ~1,350 GDD.",
    group: "vegetative", icon: Wheat, color: "amber",
  },
  // ── Reproductive ────────────────────────────────────────────────────────
  {
    id: "R1", label: "R1", gdd: 1500,
    desc: "Silking", detail: "Silks visible. Pollination base→tip. Most critical yield stage. PM ≈ 50–55 days away. ~1,500 GDD.",
    group: "reproductive", icon: Sun, color: "amber",
  },
  {
    id: "R2", label: "R2", gdd: 1700,
    desc: "Blister", detail: "10–14 days post-silk. White kernels with clear fluid. 85% moisture. Drought kills kernels. ~1,700 GDD.",
    group: "reproductive", icon: Droplets, color: "amber",
  },
  {
    id: "R3", label: "R3", gdd: 1875,
    desc: "Milk", detail: "~20 days post-silk. Yellow kernels, milky fluid. 80% moisture. ~1,875 GDD.",
    group: "reproductive", icon: Droplets, color: "amber",
  },
  {
    id: "R4", label: "R4", gdd: 1950,
    desc: "Dough", detail: "~28 days post-silk. Dough-like starch. 70% moisture. ~50% max dry weight. ~1,950 GDD.",
    group: "reproductive", icon: Layers, color: "amber",
  },
  {
    id: "R5", label: "R5", gdd: 2300,
    desc: "Dent", detail: "~40 days post-silk. Kernels dented. 55–60% moisture. Milk line visible. ~90% DM by half-milk-line. ~2,300 GDD.",
    group: "reproductive", icon: Layers, color: "amber",
  },
  {
    id: "R6", label: "R6", gdd: 2700,
    desc: "Black Layer (Maturity)", detail: "~55 days post-silk. Black layer at kernel base. 100% DM. 30–35% moisture. Final yield set. ~2,700 GDD.",
    group: "reproductive", icon: FlaskConical, color: "amber",
  },
  {
    id: "harvest", label: "Harvest", gdd: 2700,
    desc: "Ready to harvest", detail: "Grain at target moisture. Field dry-down or mechanical harvest.",
    group: "reproductive", icon: Scissors, color: "red",
  },
];
