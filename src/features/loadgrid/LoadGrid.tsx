// Small-multiples grid, one mini-chart per cell, years-as-rows. Columns switch
// between the 12 months and the 9 climate seasons. Each cell expands to fullscreen or
// ticks for side-by-side compare. Ported from the EPM `/demand/grid` (line) and
// `/demand/box` (box) views; data comes from epm-ai's own DC dataset, and the
// series shown depends on the Planning-horizon module (demand / supply / opt).

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { Chart } from "@highcharts/react"
import "@highcharts/react/series/BoxPlot" // registers the boxplot series type
import { MONTHS, monthName } from "./constants"
import { fullMonthOptions, miniMonthOptions, type Kind } from "./monthCharts"
import { useChartTheme } from "./theme"
import type { DayRow } from "./types"
import { buildDataset, LG_SETS, SEASONS, useDcData, type GridDataset } from "./data"
import {
  ChartCard, CompareProvider, CompareTray, ChartViewer, LazyChart, Segmented,
  useCompare, type ChartSpec,
} from "./compare"
import "./LoadGrid.css"

type Size = "S" | "M" | "L"
type Period = "month" | "season"

const SIZES: Record<Size, { w: number; h: number }> = {
  S: { w: 240, h: 185 },
  M: { w: 320, h: 250 },
  L: { w: 440, h: 340 },
}
// Short "Apr 03" day label for season cells (which span several months).
const dayDateLabel = (d: DayRow) => `${MONTHS[d.month - 1]} ${String(d.day).padStart(2, "0")}`

/** Live clientWidth of an element (for fitting the Small grid to the screen). */
function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/** Module id → series set; unknown modules fall back to demand. */
function setFor(mod: string) {
  return LG_SETS[mod] ?? LG_SETS.demand
}

/** Whether the load grid applies to this Planning-horizon module. */
export function hasLoadGrid(mod: string): boolean {
  return mod in LG_SETS
}

export default function LoadGrid({ kind, mod }: { kind: Kind; mod: string }) {
  const { D, err } = useDcData()
  const cfg = setFor(mod)
  const ds = useMemo<GridDataset | null>(() => (D ? buildDataset(D, cfg.series) : null), [D, cfg.series])

  if (err) return <p className="lg-note">Could not load the load-profile data. Reload the page to try again.</p>
  if (!ds) return <p className="lg-note">Loading load profiles…</p>

  return (
    <CompareProvider>
      <div className="lg-root">
        <Grid ds={ds} kind={kind} cfg={cfg} />
        <CompareTray />
        <ChartViewer />
      </div>
    </CompareProvider>
  )
}

function Grid({ ds, kind, cfg }: { ds: GridDataset; kind: Kind; cfg: ReturnType<typeof setFor> }) {
  const { openCompare } = useCompare()
  const t = useChartTheme()
  const [size, setSize] = useState<Size>("M")
  const [period, setPeriod] = useState<Period>("month")
  const scrollRef = useRef<HTMLDivElement>(null)
  const availW = useElementWidth(scrollRef)

  // Build the column set, a (year, colKey) -> days lookup, and a spec per
  // populated cell — all keyed on the current period. The flat spec list is the
  // navigation pool when a single cell is expanded, and the compare source.
  const model = useMemo(() => {
    const columns: { key: number; label: string; title?: string }[] = []
    const dayMap = new Map<string, DayRow[]>() // `${year}:${key}` -> days
    // Per-column: the cell/chart title and, for seasons, the "Apr 03"-style day label.
    const titleOf = new Map<number, (y: number) => string>()
    const dayLabel = period === "season" ? dayDateLabel : (d: DayRow) => String(d.day)
    const xTitle = period === "season" ? "Day" : "Day of month"

    if (period === "month") {
      for (let m = 1; m <= 12; m++) columns.push({ key: m, label: MONTHS[m - 1] })
      for (const y of ds.years) {
        for (let m = 1; m <= 12; m++) {
          const days = ds.daysOf(y, m)
          if (days.length) dayMap.set(`${y}:${m}`, days)
        }
      }
      for (let m = 1; m <= 12; m++) titleOf.set(m, (y) => `${monthName(m)} ${y}`)
    } else {
      for (const s of SEASONS) {
        columns.push({ key: s.id, label: s.name, title: `${s.name} · ${s.range}` })
        titleOf.set(s.id, (y) => `${s.name} ${y}`)
      }
      for (const y of ds.years) {
        for (const s of SEASONS) {
          const days = ds.days.filter((d) => d.year === y && s.months.includes(d.month))
          if (days.length) dayMap.set(`${y}:${s.id}`, days)
        }
      }
    }

    const specs = new Map<string, ChartSpec>()
    for (const y of ds.years) {
      for (const c of columns) {
        const days = dayMap.get(`${y}:${c.key}`)
        if (!days || !days.length) continue
        const id = `${kind}-${cfg.series}-${period}-${y}-${c.key}`
        specs.set(id, {
          id,
          title: titleOf.get(c.key)?.(y) ?? `${c.label} ${y}`,
          subtitle: cfg.label + (kind === "line" ? " · load profiles" : " · distribution")
            + (period === "season" ? ` · ${c.title?.split("· ")[1] ?? ""}` : ""),
          options: fullMonthOptions(t, kind, days, cfg.label + " · MW", dayLabel, xTitle),
        })
      }
    }
    return { columns, dayMap, specs }
  }, [ds, kind, period, cfg.series, cfg.label, t])

  const pool = useMemo(() => [...model.specs.values()], [model])
  const unit = period === "month" ? "month" : "season"

  // Small = fit the whole grid on one screen: shrink each cell so every column fits
  // the available width (no horizontal scroll). Medium / Large keep fixed sizes.
  const tiny = size === "S"
  const cols = Math.max(1, model.columns.length)
  // Prefer the observed width; fall back to the live container width, then the window.
  const liveW = availW || scrollRef.current?.clientWidth || (typeof window !== "undefined" ? window.innerWidth - 80 : 0)
  const w = tiny
    ? (liveW > 0 ? Math.max(84, Math.floor((liveW - 60) / cols) - 16) : 120)
    : SIZES[size].w
  const h = tiny ? Math.max(64, Math.round(w * 0.72)) : SIZES[size].h

  return (
    <div className="lg-view">
      <div className="lg-view-head">
        <p className="lg-view-sub">
          one mini-chart per {unit} · hover a cell to <b>⤢ expand</b> or <b>+ compare</b>
        </p>
        <div className="lg-controls">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { label: "Month", value: "month" },
              { label: "Season", value: "season" },
            ]}
          />
          <Segmented
            value={size}
            onChange={setSize}
            options={[
              { label: "Small", value: "S" },
              { label: "Medium", value: "M" },
              { label: "Large", value: "L" },
            ]}
          />
          <button
            type="button"
            className="lg-ghost-btn"
            onClick={() => openCompare(pool.slice(0, 12), 6)}
            title={`Open the first 12 ${unit}s of this grid in a comparison view`}
          >
            Compare first 12 ▦
          </button>
        </div>
      </div>

      {period === "season" && (
        <div className="lg-season-key" aria-label="Season definitions">
          {SEASONS.map((s) => (
            <span className="lg-season-chip" key={s.id}>
              <b>{s.name}</b> <span>{s.range}</span>
            </span>
          ))}
        </div>
      )}

      <div className="lg-grid-scroll" ref={scrollRef}>
        <table className="lg-sm-grid">
          <thead>
            <tr>
              <th className="lg-corner" />
              {model.columns.map((c) => (
                <th key={c.key} title={c.title}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ds.years.map((year) => (
              <tr key={year}>
                <th className="lg-row-head">{year}</th>
                {model.columns.map((c) => {
                  const days = model.dayMap.get(`${year}:${c.key}`) ?? []
                  const spec = model.specs.get(`${kind}-${cfg.series}-${period}-${year}-${c.key}`)
                  return (
                    <td key={c.key}>
                      {days.length && spec ? (
                        <div className="lg-sm-cell" style={{ width: w }}>
                          <ChartCard spec={spec} pool={pool}>
                            {/* w − 14 = cell width minus padding + border, so the
                                chart gets an exact width and never renders squished.
                                key forces a fresh chart when the series type or basis
                                flips, since an in-place update leaves stale artifacts. */}
                            <LazyChart height={h}>
                              <Chart key={`${kind}-${cfg.series}-${period}`} options={miniMonthOptions(t, kind, days, h, w - 14, tiny)} />
                            </LazyChart>
                          </ChartCard>
                        </div>
                      ) : (
                        <div className="lg-cell-empty" style={{ width: w, height: h }}>—</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
