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
      xAxis: { categories: INTERVAL_LABELS, tickInterval: 8, title: { text: "Time of day" } },
      yAxis: { title: { text: yLabel } },
      legend: sideLegend(t, 520),
      plotOptions: { series: { lineWidth: 1.3, marker: { enabled: false }, animation: false } },
      tooltip: { valueSuffix: " MW", valueDecimals: 0 },
      series: days.map((d, i) => ({
        type: "line",
        name: dayLabel(d),
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        data: d.values,
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
