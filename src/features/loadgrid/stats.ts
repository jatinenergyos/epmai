// Statistics helpers for the load-profile / box-plot grid.

/** Interval label for a 15-min block index (0-based): 0 -> "00:00", 95 -> "23:45". */
export function intervalLabel(i: number): string {
  const mins = i * 15
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export const INTERVAL_LABELS = Array.from({ length: 96 }, (_, i) => intervalLabel(i))

export function sum(xs: number[]): number {
  let s = 0
  for (const x of xs) s += x
  return s
}

export function mean(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : 0
}

export function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Population standard deviation. */
export function stdevP(xs: number[]): number {
  if (!xs.length) return 0
  const m = mean(xs)
  let acc = 0
  for (const x of xs) acc += (x - m) ** 2
  return Math.sqrt(acc / xs.length)
}

/** Linear-interpolation quantile (Excel PERCENTILE.INC / QUARTILE.INC). */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

export interface BoxStats {
  low: number
  q1: number
  median: number
  q3: number
  high: number
}

export function boxStats(xs: number[]): BoxStats {
  const s = [...xs].sort((a, b) => a - b)
  return {
    low: s[0] ?? 0,
    q1: quantile(s, 0.25),
    median: quantile(s, 0.5),
    q3: quantile(s, 0.75),
    high: s[s.length - 1] ?? 0,
  }
}

export function fmt(x: number | null | undefined): string {
  if (x == null || Number.isNaN(x)) return "—"
  return Math.round(x).toLocaleString("en-IN")
}
