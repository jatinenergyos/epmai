export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function monthName(m: number): string {
  return MONTHS[m - 1] ?? String(m)
}

// A calm, accessible categorical palette — mid-tone so lines read clearly.
export const SERIES_COLORS = [
  "#0d9488", "#2563eb", "#16a34a", "#ea580c", "#db2777", "#7c3aed",
  "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#65a30d", "#9333ea",
]

export const ACCENT = "#0d9488"
