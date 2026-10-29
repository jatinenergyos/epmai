// Cross-chart comparison + fullscreen viewing for the load-profile / box grid.
// Ported from the EPM Demand compare subsystem (CompareContext, ChartCard,
// CompareTray, ChartViewer) plus the LazyChart / StyledChart / Segmented helpers,
// bundled here so the grid feature is self-contained.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Chart, type ChartOptions } from "@highcharts/react"
import "@highcharts/react/series/BoxPlot"

/* ---------------- Compare context ---------------- */

export interface ChartSpec {
  id: string
  title: string
  subtitle?: string
  /** Full-size options (axes/legend/tooltip on), used in the viewer. */
  options: ChartOptions
}

export type Layout = 1 | 2 | 4 | 6

interface ViewerState {
  specs: ChartSpec[]
  focus: number
  layout: Layout
}

interface CompareApi {
  selected: ChartSpec[]
  isSelected: (id: string) => boolean
  toggle: (spec: ChartSpec) => void
  remove: (id: string) => void
  clear: () => void
  openSingle: (spec: ChartSpec, pool?: ChartSpec[]) => void
  openCompare: (specs?: ChartSpec[], layout?: Layout) => void
  viewer: ViewerState | null
  closeViewer: () => void
  setViewer: (patch: Partial<ViewerState>) => void
}

const Ctx = createContext<CompareApi | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<ChartSpec[]>([])
  const [viewer, setViewerState] = useState<ViewerState | null>(null)

  const isSelected = useCallback((id: string) => selected.some((s) => s.id === id), [selected])

  const toggle = useCallback((spec: ChartSpec) => {
    setSelected((cur) =>
      cur.some((s) => s.id === spec.id) ? cur.filter((s) => s.id !== spec.id) : [...cur, spec],
    )
  }, [])

  const remove = useCallback((id: string) => {
    setSelected((cur) => cur.filter((s) => s.id !== id))
  }, [])

  const clear = useCallback(() => setSelected([]), [])

  const openSingle = useCallback((spec: ChartSpec, pool?: ChartSpec[]) => {
    const specs = pool && pool.length ? pool : [spec]
    const focus = Math.max(0, specs.findIndex((s) => s.id === spec.id))
    setViewerState({ specs, focus, layout: 1 })
  }, [])

  const openCompare = useCallback(
    (specs?: ChartSpec[], layout: Layout = 2) => {
      const list = specs && specs.length ? specs : selected
      if (!list.length) return
      setViewerState({ specs: list, focus: 0, layout: list.length === 1 ? 1 : layout })
    },
    [selected],
  )

  const closeViewer = useCallback(() => setViewerState(null), [])
  const setViewer = useCallback(
    (patch: Partial<ViewerState>) => setViewerState((v) => (v ? { ...v, ...patch } : v)),
    [],
  )

  const api = useMemo<CompareApi>(
    () => ({
      selected, isSelected, toggle, remove, clear,
      openSingle, openCompare, viewer, closeViewer, setViewer,
    }),
    [selected, isSelected, toggle, remove, clear, openSingle, openCompare, viewer, closeViewer, setViewer],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useCompare(): CompareApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useCompare must be used within <CompareProvider>")
  return ctx
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string | number>({
  options, value, onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="lg-segmented" role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- LazyChart (mount on scroll into view) ---------------- */

export function LazyChart({
  height = 180, children, placeholder, className,
}: {
  height?: number
  children: ReactNode
  placeholder?: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "300px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <div ref={ref} className={className} style={{ height }}>
      {visible ? children : (placeholder ?? <div className="lg-chart-skeleton" />)}
    </div>
  )
}

/* ---------------- StyledChart (line thickness by value, block by block) ---------------- */

const LINE_TYPES = new Set(["line", "spline", "area", "areaspline"])
/** Number of value bands; each band has its own line width (see .lg-varwidth in LoadGrid.css). */
const WIDTH_BANDS = 8

/** Numeric y of a data point (plain number or [x, y]). */
function yOf(p: unknown): number | null {
  if (typeof p === "number") return p
  if (Array.isArray(p)) return typeof p[1] === "number" ? p[1] : null
  return null
}

/** Each line's width follows its own value at every block: higher MW draws thicker, lower MW
 *  thinner. Highcharts can't vary width along one line, so the value range is split into
 *  WIDTH_BANDS zones; each zone's path gets a class (highcharts-zone-graph-N) that the CSS under
 *  .lg-varwidth gives a stroke width. */
function applySeriesStyle(options: ChartOptions): ChartOptions {
  const series = (options.series ?? []) as Array<Record<string, unknown>>
  const stylable = series.filter((s) => LINE_TYPES.has(s.type as string))
  if (!stylable.length) return options

  let lo = Infinity, hi = -Infinity
  for (const s of stylable) {
    for (const p of (s.data as unknown[]) ?? []) {
      const y = yOf(p)
      if (y == null) continue
      if (y < lo) lo = y
      if (y > hi) hi = y
    }
  }
  if (!isFinite(lo) || hi <= lo) return options

  const step = (hi - lo) / WIDTH_BANDS
  const zones = Array.from({ length: WIDTH_BANDS }, (_, i) =>
    i < WIDTH_BANDS - 1 ? { value: lo + step * (i + 1) } : {},
  )
  const newSeries = series.map((s) => (LINE_TYPES.has(s.type as string) ? { ...s, zoneAxis: "y", zones } : s))
  const chart = (options.chart ?? {}) as Record<string, unknown>
  const className = [chart.className, "lg-varwidth"].filter(Boolean).join(" ")
  return { ...options, chart: { ...chart, className }, series: newSeries as ChartOptions["series"] }
}

function StyledChart({ options }: { options: ChartOptions }) {
  const styled = useMemo(() => applySeriesStyle(options), [options])
  return <Chart options={styled} />
}

/* ---------------- ChartCard (grid-cell toolbar) ---------------- */

export function ChartCard({
  spec, pool, label, children,
}: {
  spec: ChartSpec
  pool?: ChartSpec[]
  label?: string
  children: ReactNode
}) {
  const { isSelected, toggle, openSingle } = useCompare()
  const selected = isSelected(spec.id)

  return (
    <div className={`lg-chart-card ${selected ? "selected" : ""}`}>
      {children}
      {label && <div className="lg-chart-card-label">{label}</div>}
      <div className="lg-chart-card-tools">
        <button type="button" className="lg-cc-btn" title="Expand" onClick={() => openSingle(spec, pool)}>
          ⤢
        </button>
        <button
          type="button"
          className={`lg-cc-btn lg-cc-check ${selected ? "on" : ""}`}
          title={selected ? "Remove from comparison" : "Add to comparison"}
          onClick={() => toggle(spec)}
        >
          {selected ? "✓" : "+"}
        </button>
      </div>
    </div>
  )
}

/* ---------------- CompareTray (floating action bar) ---------------- */

export function CompareTray() {
  const { selected, clear, openCompare, remove } = useCompare()
  if (!selected.length) return null

  const defaultLayout: Layout = selected.length <= 2 ? 2 : selected.length <= 4 ? 4 : 6

  return (
    <div className="lg-compare-tray">
      <div className="lg-tray-chips">
        {selected.map((s) => (
          <span className="lg-tray-chip" key={s.id} title={s.title}>
            {s.title}
            <button type="button" onClick={() => remove(s.id)} aria-label={`Remove ${s.title}`}>✕</button>
          </span>
        ))}
      </div>
      <div className="lg-tray-actions">
        <span className="lg-tray-count">{selected.length} selected</span>
        <button type="button" className="lg-tray-clear" onClick={clear}>Clear</button>
        <button
          type="button"
          className="lg-tray-compare"
          disabled={selected.length < 2}
          onClick={() => openCompare(selected, defaultLayout)}
        >
          Compare ▦
        </button>
      </div>
    </div>
  )
}

/* ---------------- ChartViewer (fullscreen / N-up) ---------------- */

const VIEWER_COLS: Record<Layout, number> = { 1: 1, 2: 2, 4: 2, 6: 3 }
const VIEWER_HEIGHTS: Record<Layout, number> = { 1: 560, 2: 430, 4: 340, 6: 270 }

function bigOptions(options: ChartOptions, height: number): ChartOptions {
  const legend = options.legend
    ? { ...options.legend, maxHeight: Math.max(90, height - 60) }
    : options.legend
  return {
    ...options,
    chart: { ...(options.chart ?? {}), height },
    legend,
    credits: { enabled: false },
  }
}

export function ChartViewer() {
  const { viewer, closeViewer, setViewer, remove } = useCompare()

  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer()
      if (viewer.layout === 1) {
        if (e.key === "ArrowRight") setViewer({ focus: Math.min(viewer.specs.length - 1, viewer.focus + 1) })
        if (e.key === "ArrowLeft") setViewer({ focus: Math.max(0, viewer.focus - 1) })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewer, closeViewer, setViewer])

  if (!viewer) return null
  const { specs, focus, layout } = viewer
  const single = layout === 1
  const shown = single ? [specs[focus]] : specs
  const height = VIEWER_HEIGHTS[layout]
  const layoutOpts: Layout[] = [1, 2, 4, 6]

  return (
    <div className="lg-viewer-backdrop" onClick={closeViewer}>
      <div className="lg-viewer" onClick={(e) => e.stopPropagation()}>
        <header className="lg-viewer-head">
          <div className="lg-viewer-title">
            {single ? (
              <>
                <strong>{specs[focus]?.title}</strong>
                {specs[focus]?.subtitle && <span> · {specs[focus].subtitle}</span>}
                {specs.length > 1 && <span className="lg-viewer-count">{focus + 1} / {specs.length}</span>}
              </>
            ) : (
              <strong>Comparing {specs.length} charts</strong>
            )}
          </div>

          <div className="lg-viewer-tools">
            <span className="lg-viewer-tools-label">Layout</span>
            <div className="lg-segmented">
              {layoutOpts.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={l === layout ? "active" : ""}
                  disabled={l !== 1 && specs.length < 2}
                  onClick={() => setViewer({ layout: l })}
                >
                  {l === 1 ? "Single" : `${l}-up`}
                </button>
              ))}
            </div>
            <button type="button" className="lg-viewer-close" onClick={closeViewer} aria-label="Close">✕</button>
          </div>
        </header>

        <div className={`lg-viewer-body cols-${VIEWER_COLS[layout]}`}>
          {shown.map((spec) => (
            <div className="lg-viewer-cell" key={spec.id}>
              <div className="lg-viewer-cell-head">
                <span>{spec.title}</span>
                {!single && (
                  <button
                    type="button"
                    className="lg-cell-remove"
                    title="Remove from comparison"
                    onClick={() => {
                      const rest = specs.filter((s) => s.id !== spec.id)
                      remove(spec.id)
                      if (rest.length) setViewer({ specs: rest, focus: 0 })
                      else closeViewer()
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <StyledChart options={bigOptions(spec.options, height)} />
            </div>
          ))}
        </div>

        {single && specs.length > 1 && (
          <div className="lg-viewer-nav">
            <button type="button" onClick={() => setViewer({ focus: Math.max(0, focus - 1) })} disabled={focus === 0}>
              ‹ Prev
            </button>
            <div className="lg-viewer-dots">
              {specs.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={i === focus ? "active" : ""}
                  onClick={() => setViewer({ focus: i })}
                  aria-label={`Go to ${s.title}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setViewer({ focus: Math.min(specs.length - 1, focus + 1) })}
              disabled={focus === specs.length - 1}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
