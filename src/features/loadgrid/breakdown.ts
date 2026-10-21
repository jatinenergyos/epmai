// Declared-capacity breakdown for the Supply box-plot grid ("Graph Type" dropdown).
// The real feed (public/dc/data.json) only carries one aggregate declared-capacity
// number per block — there's no per-plant series. To let the box-plot grid compare
// Category / Technology / Variable cost / Plants, each day's aggregate value is
// split across the engine's plant catalogue (@/data/engine PLANTS) in proportion to
// each plant's declared capacity, then regrouped by the chosen dimension. Sample
// data only — exactly in the spirit of the rest of this app's simulated figures.

import { PLANTS, type Plant } from "@/data/engine"
import { SERIES_COLORS } from "./constants"

export type GroupBy = "category" | "technology" | "vc" | "plants"

export const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "technology", label: "Technology" },
  { id: "vc", label: "Variable Cost" },
  { id: "plants", label: "Plants" },
]

/** Plant -> technology. The plant catalogue only tags ISGS / State / IPP
 *  ownership, not fuel type, so this fixed map is used only for this grid's
 *  "Technology" grouping. */
const TECHNOLOGY: Record<string, string> = {
  SINGRAULI: "Thermal", RIHAND: "Thermal", BARH: "Thermal", FARAKKA: "Thermal",
  "STATE TPS-1": "Thermal", "STATE TPS-2": "Thermal", "GADARWARA-I": "Thermal", DADRI_RF: "Thermal",
  SOLAPUR: "Solar",
  "IPP-A": "Gas", "IPP-B": "Gas", TORRENT_GUVNL: "Gas",
}

function vcBucket(vc: number): string {
  if (vc < 2500) return "Low (< ₹2,500/MWh)"
  if (vc < 4500) return "Mid (₹2,500–4,500/MWh)"
  if (vc < 7000) return "High (₹4,500–7,000/MWh)"
  return "Very high (> ₹7,000/MWh)"
}

function keyOf(p: Plant, by: GroupBy): string {
  if (by === "category") return p.cat === "ISGS" ? "ISGS" : p.cat === "State" ? "State sector" : "IPP / PPA"
  if (by === "technology") return TECHNOLOGY[p.name] ?? "Thermal"
  if (by === "vc") return vcBucket(p.vc)
  return p.name
}

export interface Group {
  name: string
  color: string
  /** This group's share of total declared capacity across all plants (0-1). */
  share: number
}

/** The groups for a dimension, in a stable order, each with a colour and its
 *  share of total declared capacity (used to split the aggregate series). */
export function groupsFor(by: GroupBy): Group[] {
  const totalDc = PLANTS.reduce((s, p) => s + p.dc, 0)
  const dcByKey = new Map<string, number>()
  const order: string[] = []
  for (const p of PLANTS) {
    const k = keyOf(p, by)
    if (!dcByKey.has(k)) { dcByKey.set(k, 0); order.push(k) }
    dcByKey.set(k, dcByKey.get(k)! + p.dc)
  }
  return order.map((name, i) => ({ name, color: SERIES_COLORS[i % SERIES_COLORS.length], share: dcByKey.get(name)! / totalDc }))
}

/** Split one day's 96-block declared-capacity series into one series per group,
 *  proportional to each group's share of total declared capacity. */
export function splitByGroup(values: number[], groups: Group[]): number[][] {
  return groups.map((g) => values.map((v) => v * g.share))
}
