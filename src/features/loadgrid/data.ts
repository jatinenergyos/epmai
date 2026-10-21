// Data adapter for the load-profile / box-plot grid.
//
// Feeds the ported EPM grid from epm-ai's OWN data — the UP declared-capacity /
// demand dataset in public/dc/data.json (the same source the Demand Calendar
// uses). Each day carries 96 fifteen-minute blocks of demand-met (`dem`) and
// declared-capacity supply (`av`). We reshape those into the grid's DayRow model,
// picking a different 96-block series per Planning-horizon module:
//   demand  -> demand met            (dem)
//   supply  -> declared capacity     (av)
//   opt     -> surplus / deficit     (av - dem)
//   overview-> demand met            (dem)

import { useEffect, useState } from "react"
import type { DayRow } from "./types"
import { mean, median, stdevP, sum } from "./stats"

const base = import.meta.env.BASE_URL || "/"

/** The subset of public/dc/data.json this grid needs. */
interface DcData {
  dates: string[] // "YYYY-MM-DD"
  dem: number[][] // [day][96] demand met (MW)
  av: number[][] // [day][96] declared-capacity supply (MW)
}

/** Which 96-block series a module charts, plus its axis label. */
export type Series = "dem" | "av" | "sur"
export const LG_SETS: Record<string, { series: Series; label: string; sub: string }> = {
  overview: { series: "dem", label: "Demand", sub: "demand met per block, MW" },
  demand: { series: "dem", label: "Demand", sub: "demand met per block, MW" },
  supply: { series: "av", label: "Declared capacity", sub: "available DC supply per block, MW" },
  opt: { series: "sur", label: "Surplus / deficit", sub: "supply − demand per block, MW" },
  // Market Intelligence reuses Supply's declared-capacity (Total supply DC) series —
  // same grid, same data; the Market/Exchange picker is a placeholder (see Horizon.tsx).
  mi: { series: "av", label: "Declared capacity", sub: "available DC supply per block, MW" },
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** The nine climate seasons used for the season-wise grid grouping. Each season
 *  is a run of whole calendar months; `range` is the human label for its span. */
export interface Season {
  id: number
  name: string
  months: number[] // 1-12
  range: string
}
export const SEASONS: Season[] = [
  { id: 1, name: "Winter", months: [1, 2], range: "Jan – Feb" },
  { id: 2, name: "Spring Onset", months: [3], range: "Mar" },
  { id: 3, name: "Summer Peak", months: [4, 5], range: "Apr – May" },
  { id: 4, name: "SW Monsoon Onset", months: [6], range: "Jun" },
  { id: 5, name: "SW Monsoon", months: [7, 8], range: "Jul – Aug" },
  { id: 6, name: "Monsoon Retreat", months: [9], range: "Sep" },
  { id: 7, name: "Post-Monsoon", months: [10], range: "Oct" },
  { id: 8, name: "NE Monsoon", months: [11], range: "Nov" },
  { id: 9, name: "Late Winter", months: [12], range: "Dec" },
]
/** Month (1-12) -> season id. */
export const MONTH_SEASON: Record<number, number> =
  SEASONS.reduce((m, s) => { s.months.forEach((mo) => (m[mo] = s.id)); return m }, {} as Record<number, number>)

/** The MW series for a given day under the chosen module mode. */
function seriesOf(D: DcData, i: number, series: Series): number[] {
  if (series === "dem") return D.dem[i]
  if (series === "av") return D.av[i]
  return D.av[i].map((v, b) => v - D.dem[i][b]) // surplus / deficit
}

function buildDay(D: DcData, i: number, series: Series): DayRow {
  const iso = D.dates[i]
  const [y, m, d] = iso.split("-").map(Number)
  const vals = seriesOf(D, i, series)
  return {
    index: i,
    date: iso,
    year: y,
    month: m,
    day: d,
    weekday: WEEKDAY[new Date(y, m - 1, d).getDay()],
    values: vals,
    sum: Math.round(sum(vals) / 4), // /4 converts 15-min MW blocks to MWh
    avg: Math.round(mean(vals)),
    min: Math.min(...vals),
    max: Math.max(...vals),
    median: Math.round(median(vals)),
    sd: Math.round(stdevP(vals)),
  }
}

export interface GridDataset {
  days: DayRow[]
  years: number[]
  /** Day rows for a given (year, month), in date order. */
  daysOf: (year: number, month: number) => DayRow[]
}

/** Build the grid dataset for one module's series from the raw DC data. */
export function buildDataset(D: DcData, series: Series): GridDataset {
  const days = D.dates.map((_, i) => buildDay(D, i, series))
  const years = [...new Set(days.map((x) => x.year))].sort((a, b) => a - b)
  const daysOf = (year: number, month: number) =>
    days.filter((x) => x.year === year && x.month === month)
  return { days, years, daysOf }
}

/** Load the raw DC data once (cached across the session). */
let cache: DcData | null = null
let inflight: Promise<DcData> | null = null
function loadDc(): Promise<DcData> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetch(base + "dc/data.json")
      .then((r) => r.json())
      .then((d: DcData) => (cache = d))
  }
  return inflight
}

export function useDcData(): { D: DcData | null; err: boolean } {
  const [D, setD] = useState<DcData | null>(cache)
  const [err, setErr] = useState(false)
  useEffect(() => {
    if (D) return
    let alive = true
    loadDc()
      .then((d) => alive && setD(d))
      .catch(() => alive && setErr(true))
    return () => { alive = false }
  }, [D])
  return { D, err }
}
