// Per-day load model for the small-multiples grid, ported from the EPM Demand
// workbook. One row per day, each day carrying 96 fifteen-minute readings.

export const INTERVALS = 96 // 96 x 15-min blocks = 24h

export interface DayRow {
  /** Global index into the full, date-sorted dataset (0-based). */
  index: number
  /** ISO date string, e.g. "2018-04-01". */
  date: string
  year: number
  month: number // 1-12
  day: number // 1-31
  weekday: string // Mon..Sun
  /** 96 raw 15-min readings (MW) for the active module's series. */
  values: number[]
  // Derived per-day stats
  sum: number // energy for the day
  avg: number
  min: number
  max: number
  median: number
  sd: number // population standard deviation
}
