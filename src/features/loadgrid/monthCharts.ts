// Chart option builders for a single (year, month/week) slice — used both by the
// small-multiple grid cells (mini) and the fullscreen viewer (full detail).
// Ported from the EPM Demand views; values are MW (epm-ai declared-capacity data).
// Colours come from the resolved app theme so the grid follows the chosen palette.

import type { ChartOptions } from "@highcharts/react"
import type { DayRow } from "./types"
import { boxStats, INTERVAL_LABELS } from "./stats"
import { baseChart, sideLegend, type ChartTheme } from "./theme"
import { SERIES_COLORS } from "./constants"

export type Kind = "line" | "box"

const BLOCK_LABELS = Array.from({ length: 96 }, (_, i) => String(i + 1))
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
/** "01-Mar-2027" from "2027-03-01". */
const dayDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}-${MON[Number(m) - 1]}-${y}` }

/* eslint-disable @typescript-eslint/no-explicit-any -- Highcharts formatter context */
/** Load-profile tooltip: the day's date, the block with its 15-min range, then "● day: value MW". */
function profileTooltip(this: any): string {
  const p = this.point ?? this, s = p.series, b = p.index as number
  const date = s.options.custom?.date as string | undefined
  return (date ? `<span style="font-size:11px;font-weight:600">${dayDate(date)}</span><br/>` : "")
    + `<span style="font-size:11px">Block ${b + 1} ${hhmm(b * 15)}-${hhmm(b * 15 + 15)}</span><br/>`
    + `<span style="color:${p.color}">●</span> ${s.name}: <b>${Math.round(p.y).toLocaleString("en-IN")} MW</b>`
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Compact chart for a grid cell. Pass `width` (the cell's settled inner width)
 * so Highcharts sizes deterministically — without it, a chart mounted before its
 * container has laid out can measure a wrong width and never reflow.
 */
export function miniMonthOptions(t: ChartTheme, kind: Kind, days: DayRow[], height = 150, width?: number, tiny = false): ChartOptions {
  const common = baseChart(t, {
    chart: { height, width, spacing: tiny ? [4, 4, 3, 3] : [6, 8, 6, 4], type: kind === "line" ? "line" : "boxplot" },
    legend: { enabled: false },
    xAxis: { visible: false },
    // When the cells are tiny (Small, fit-to-screen) drop the y-axis labels so the
    // whole plot area reads as a clean sparkline.
    yAxis: { title: { text: undefined }, labels: { enabled: !tiny, style: { fontSize: "10px" } }, tickAmount: tiny ? 3 : 4 },
    tooltip: { enabled: kind === "box", valueDecimals: 0 },
    plotOptions: {
      line: { lineWidth: 0.6, marker: { enabled: false }, enableMouseTracking: false, animation: false },
      boxplot: { animation: false },
    },
  })
  if (kind === "line") {
    return {
      ...common,
      xAxis: { visible: false, min: 0, max: 95 },
      series: days.map((d) => ({ type: "line", data: d.values, color: t.accentLine })),
    }
  }
  return {
    ...common,
    xAxis: { visible: false, categories: days.map((d) => String(d.day)) },
    series: [
      {
        type: "boxplot",
        color: t.accent,
        fillColor: t.accentFill,
        medianColor: t.median,
        data: days.map((d) => {
          const b = boxStats(d.values)
          return [b.low, b.q1, b.median, b.q3, b.high]
        }),
      },
    ],
  }
}

/** A group plotted on the "Graph Type" grouped charts (Category / Technology /
 *  Variable cost / Plants) — see ./breakdown.ts. */
export interface BoxGroup { name: string; color: string }

/** Grouped load-profile line for a grid cell / viewer: one line per group,
 *  averaged across the cell's days (per-day-per-group lines would be too busy),
 *  over the 96 blocks of a day. `splitDay` returns, for one day, the per-group
 *  96-block series in the same order as `groups`. */
function groupedDayProfiles(days: DayRow[], groups: BoxGroup[], splitDay: (d: DayRow) => number[][]): number[][] {
  const n = days.length || 1
  const sums = groups.map(() => new Array(96).fill(0))
  for (const d of days) {
    const split = splitDay(d)
    groups.forEach((_, gi) => { for (let b = 0; b < 96; b++) sums[gi][b] += split[gi][b] })
  }
  return sums.map((s) => s.map((v) => v / n))
}

export function miniGroupedLineOptions(
  t: ChartTheme, days: DayRow[], groups: BoxGroup[], splitDay: (d: DayRow) => number[][],
  height = 150, width?: number, tiny = false,
): ChartOptions {
  const common = baseChart(t, {
    chart: { height, width, spacing: tiny ? [4, 4, 3, 3] : [6, 8, 6, 4], type: "line" },
    legend: { enabled: false },
    xAxis: { visible: false, min: 0, max: 95 },
    yAxis: { title: { text: undefined }, labels: { enabled: !tiny, style: { fontSize: "10px" } }, tickAmount: tiny ? 3 : 4 },
    tooltip: { enabled: true, shared: true, valueDecimals: 0 },
    plotOptions: { line: { lineWidth: 1.1, marker: { enabled: false }, enableMouseTracking: true, animation: false } },
  })
  const profiles = groupedDayProfiles(days, groups, splitDay)
  return {
    ...common,
    series: groups.map((g, gi) => ({ type: "line", name: g.name, color: g.color, data: profiles[gi] })),
  }
}

export function fullGroupedLineOptions(
  t: ChartTheme, days: DayRow[], groups: BoxGroup[], splitDay: (d: DayRow) => number[][], yLabel = "MW",
): ChartOptions {
  const profiles = groupedDayProfiles(days, groups, splitDay)
  return baseChart(t, {
    chart: { type: "line", zooming: { type: "x" } },
    xAxis: { categories: INTERVAL_LABELS, tickInterval: 8, title: { text: "Time of day" } },
    yAxis: { title: { text: yLabel } },
    legend: sideLegend(t, 520),
    plotOptions: { series: { lineWidth: 1.6, marker: { enabled: false }, animation: false } },
    tooltip: { shared: true, valueSuffix: " MW", valueDecimals: 0 },
    series: groups.map((g, gi) => ({ type: "line", name: g.name, color: g.color, data: profiles[gi] })),
  })
}

/** Compact grouped-box chart for a grid cell: one boxplot series per group
 *  (Category / Technology / Variable cost / Plants), sharing the day axis.
 *  `splitDay` returns, for one day, the per-group 96-block series in the same
 *  order as `groups`. */
export function miniGroupedBoxOptions(
  t: ChartTheme, days: DayRow[], groups: BoxGroup[], splitDay: (d: DayRow) => number[][],
  height = 150, width?: number, tiny = false,
): ChartOptions {
  const common = baseChart(t, {
    chart: { height, width, spacing: tiny ? [4, 4, 3, 3] : [6, 8, 6, 4], type: "boxplot" },
    legend: { enabled: false },
    xAxis: { visible: false, categories: days.map((d) => String(d.day)) },
    yAxis: { title: { text: undefined }, labels: { enabled: !tiny, style: { fontSize: "10px" } }, tickAmount: tiny ? 3 : 4 },
    tooltip: { enabled: true, valueDecimals: 0 },
    plotOptions: { boxplot: { animation: false } },
  })
  const perDay = days.map((d) => splitDay(d).map(boxStats))
  return {
    ...common,
    series: groups.map((g, gi) => ({
      type: "boxplot",
      name: g.name,
      color: g.color,
      data: perDay.map((stats) => {
        const b = stats[gi]
        return [b.low, b.q1, b.median, b.q3, b.high]
      }),
    })),
  }
}

/** Full-detail grouped-box chart for the fullscreen / comparison viewer — the
 *  "Graph Type" counterpart to `fullMonthOptions`'s single-series box plot. */
export function fullGroupedBoxOptions(
  t: ChartTheme, days: DayRow[], groups: BoxGroup[], splitDay: (d: DayRow) => number[][],
  yLabel = "MW", dayLabel: (d: DayRow) => string = (d) => String(d.day), xTitle = "Day of month",
): ChartOptions {
  const perDay = days.map((d) => splitDay(d).map(boxStats))
  return baseChart(t, {
    chart: { type: "boxplot" },
    xAxis: { categories: days.map(dayLabel), title: { text: xTitle } },
    yAxis: { title: { text: yLabel } },
    legend: sideLegend(t, 520),
    tooltip: { valueDecimals: 0 },
    series: groups.map((g, gi) => ({
      type: "boxplot",
      name: g.name,
      color: g.color,
      data: perDay.map((stats) => {
        const b = stats[gi]
        return [b.low, b.q1, b.median, b.q3, b.high]
      }),
    })),
  })
}

/** Full-detail chart for the fullscreen / comparison viewer. `dayLabel` names each
 *  day (series name for lines, x category for the box plot) — for a month it is the
 *  day number; for a season spanning several months it is "Apr 03". */
export function fullMonthOptions(
  t: ChartTheme, kind: Kind, days: DayRow[], yLabel = "MW",
  dayLabel: (d: DayRow) => string = (d) => String(d.day),
  xTitle = "Day of month",
): ChartOptions {
  if (kind === "line") {
    return baseChart(t, {
      chart: { type: "line", zooming: { type: "x" } },
      // x-axis in block numbers (1–96); the tooltip still gives each block's time range.
      xAxis: { categories: BLOCK_LABELS, tickInterval: 4, title: { text: "Block" } },
      yAxis: { title: { text: yLabel } },
      legend: sideLegend(t, 520),
      plotOptions: { series: { lineWidth: 1.3, marker: { enabled: false }, animation: false } },
      tooltip: { formatter: profileTooltip },
      series: days.map((d, i) => ({
        type: "line",
        name: dayLabel(d),
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        data: d.values,
        custom: { date: d.date },
      })),
    })
  }
  return baseChart(t, {
    chart: { type: "boxplot" },
    xAxis: { categories: days.map(dayLabel), title: { text: xTitle } },
    yAxis: { title: { text: yLabel } },
    legend: { enabled: false },
    tooltip: { valueDecimals: 0 },
    series: [
      {
        type: "boxplot",
        name: yLabel,
        color: t.accent,
        fillColor: t.accentFill,
        medianColor: t.median,
        data: days.map((d) => {
          const b = boxStats(d.values)
          return [b.low, b.q1, b.median, b.q3, b.high]
        }),
      },
    ],
  })
}
