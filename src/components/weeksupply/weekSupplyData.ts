// Week-ahead Supply Availability: week helpers, graph types, colours and mock day data.
// The data is mock (seeded per date, so it is stable across reloads) until the supply API exists.

import { istNow } from "@/data/engine";

export type SupplyGraphType = "category" | "technology" | "vc" | "plants";

export const GRAPH_TYPES: { id: SupplyGraphType; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "technology", label: "Technology" },
  { id: "vc", label: "Variable Cost" },
  { id: "plants", label: "Plants" },
];
export const isGraphType = (v: unknown): v is SupplyGraphType => GRAPH_TYPES.some((g) => g.id === v);

export const BLOCKS = 96;
export const DEMAND_COLOR = "#ef4444";
export const ROSTERING_COLOR = "#f472b6";
export const PLANT_ROSTERING_COLOR = "#334155";
export const SG_COLOR = "#60a5fa";
export const CUMULATIVE_COLOR = "#fed7aa";

/** Fixed palette: soft blue, slate, light green, orange, periwinkle, coral, sea green, teal. */
const PALETTE = [
  "#93c5fd", "#475569", "#bef264", "#fdba74", "#a5b4fc", "#fca5a5", "#7fc8a9", "#14b8a6",
  // Extra slots for the API graphs, which have more series than the base eight.
  "#c4b5fd", "#67e8f9", "#f9a8d4", "#86efac", "#f0abfc", "#94a3b8", "#5eead4", "#fb7185", "#a3a3a3",
];

/** Supply series per graph type with their base MW (first = top of the stack). */
const SERIES: Record<Exclude<SupplyGraphType, "plants">, [string, number][]> = {
  category: [["NTPC Ltd", 140], ["SECI", 120], ["NPCIL", 50], ["NLC India Ltd", 130], ["TSGENCO", 8], ["NTPC", 65], ["PPCL", 15], ["UDM", 12]],
  technology: [["Thermal", 290], ["Nuclear", 120], ["Hydro", 45], ["Solar", 65], ["Wind", 20]],
  vc: [["A", 35], ["B", 450], ["C", 30], ["E", 25]],
};

const PLANTS = [
  "PPCLGPP", "KUDGI", "NLCEXP", "NLCIIST1", "NLCIIST2", "NLCTS2EXP", "NNTPS", "NTPL", "RSTPSU1TO6", "RSTPSU7",
  "SIMHST2", "TALST2", "TLSTPS", "VALLURNTECL", "KGSU1AND2", "KGSU3AND4", "KKNP", "KKNPPU2", "MAPS", "ADPPL_FTG",
  "NTPCS", "APRAAVA_KHKRDA_JAM1_W", "APRAAVA_KHKRDA_JAM2_W", "APRAAVA_KHKRDA_JAM3_W", "SITAC",
];

/** Supply series names for a graph type (Plants: its two column series). */
export const seriesNames = (type: SupplyGraphType) =>
  type === "plants" ? ["Cumulative", "SG"] : SERIES[type].map(([n]) => n);

/** The same colour for a name every time: palette slot by its position in its graph type. */
export function colorOf(type: SupplyGraphType, name: string, names?: string[]): string {
  if (type === "plants") return name === "SG" ? SG_COLOR : CUMULATIVE_COLOR;
  const i = names ? names.indexOf(name) : SERIES[type].findIndex(([n]) => n === name);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

/* ---------- dates ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const todayIso = () => isoOf(istNow());

/** The Monday–Sunday week containing `date`. */
export function getWeekRange(date: Date): { monday: Date; sunday: Date; days: Date[] } {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  return { monday, sunday: days[6], days };
}

/** "26 Oct – 01 Nov 2026", "02 – 08 Nov 2026" or "28 Dec 2026 – 03 Jan 2027". */
function rangeText(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear()) return `${pad(a.getDate())} ${MON[a.getMonth()]} ${a.getFullYear()} – ${pad(b.getDate())} ${MON[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${pad(a.getDate())} ${MON[a.getMonth()]} – ${pad(b.getDate())} ${MON[b.getMonth()]} ${b.getFullYear()}`;
  return `${pad(a.getDate())} – ${pad(b.getDate())} ${MON[b.getMonth()]} ${b.getFullYear()}`;
}

/** "Current Week, …" / "Previous Week, …" / "Next Week, …", or just the range further out. */
export function weekLabel(monday: Date): string {
  const cur = getWeekRange(istNow()).monday;
  const diff = Math.round((monday.getTime() - cur.getTime()) / (7 * 86400000));
  const { sunday } = getWeekRange(monday);
  const range = rangeText(monday, sunday);
  const rel = diff === 0 ? "Current Week" : diff === -1 ? "Previous Week" : diff === 1 ? "Next Week" : null;
  return rel ? `${rel}, ${range}` : range;
}

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** First day of the month containing `date`. */
export const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
/** Every date of the month that starts on `first`. */
export const monthDays = (first: Date) =>
  Array.from({ length: new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate() }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1));
export const isMonthParam = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
export const monthParam = (first: Date) => `${first.getFullYear()}-${pad(first.getMonth() + 1)}`;

/** "Current Month, October 2026" / "Previous Month, …" / "Next Month, …", or just "August 2026". */
export function monthLabel(first: Date): string {
  const cur = monthStart(istNow());
  const diff = (first.getFullYear() - cur.getFullYear()) * 12 + first.getMonth() - cur.getMonth();
  const name = `${MONTH_FULL[first.getMonth()]} ${first.getFullYear()}`;
  const rel = diff === 0 ? "Current Month" : diff === -1 ? "Previous Month" : diff === 1 ? "Next Month" : null;
  return rel ? `${rel}, ${name}` : name;
}

export const dayTitle = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()}`;
export const dayLong = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
/** "12:30–12:45" for block index b (0-based). */
export const blockRange = (b: number) => {
  const t = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  return `${t(b * 15)}–${t(b * 15 + 15)}`;
};

/** Current 15-minute block (0-based) in IST. */
export function currentBlock(): number {
  const n = istNow();
  return Math.min(BLOCKS - 1, Math.floor((n.getHours() * 60 + n.getMinutes()) / 15));
}

/* ---------- mock data ---------- */

export type SeriesData = { name: string; data: number[] };
export type PlantRow = { name: string; sg: number; cumulative: number };
export type DayData = {
  date: string;
  seriesList: SeriesData[];
  demand: number[];
  rostering: number[];
  plants: PlantRow[];
  peak: number;
  surplus: number;
};

/** Small deterministic RNG seeded from a string. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 96 smoothed noise values in [-1, 1]. */
function wave(r: () => number) {
  const raw = Array.from({ length: BLOCKS }, () => r() * 2 - 1);
  return raw.map((_, i) => (raw[Math.max(0, i - 1)] + raw[i] * 2 + raw[Math.min(BLOCKS - 1, i + 1)]) / 4);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Mock day: supply series for the graph type, demand, rostering and the plant columns. */
export function mockDay(date: string, type: SupplyGraphType): DayData {
  const stack = SERIES[type === "plants" ? "category" : type];
  const seriesList = stack.map(([name, base]) => {
    const r = rng(date + name), w = wave(r), ph = r() * Math.PI * 2;
    return { name, data: w.map((n, b) => round1(Math.max(0, base * (1 + 0.05 * Math.sin((b / BLOCKS) * Math.PI * 2 + ph) + 0.06 * n)))) };
  });
  const total = Array.from({ length: BLOCKS }, (_, b) => seriesList.reduce((s, x) => s + x.data[b], 0));

  const rd = rng(date + "demand"), wd = wave(rd);
  const demand = wd.map((n, b) => round1(395 + 30 * Math.sin((b / BLOCKS) * Math.PI * 4 + 1) + 45 * n));
  const rr = rng(date + "rostering"), wr = wave(rr);
  const rostering = wr.map((n) => round1(Math.min(5, -18 + 22 * n)));

  // Plants: each plant's average SG for the day, and the running total across plants.
  const avgTotal = total.reduce((a, b) => a + b, 0) / BLOCKS;
  const rp = rng(date + "plants");
  const weights = PLANTS.map(() => 0.2 + rp());
  const wsum = weights.reduce((a, b) => a + b, 0);
  let cum = 0;
  const plants = PLANTS.map((name, i) => {
    const sg = round1((weights[i] / wsum) * avgTotal);
    cum = round1(cum + sg);
    return { name, sg, cumulative: cum };
  });

  return withStats({ date, seriesList: type === "plants" ? [] : seriesList, demand, rostering, plants, peak: 0, surplus: 0 }, total);
}

/** Peak demand and average surplus (total supply − demand) for a day. */
export function withStats(d: DayData, total: number[]): DayData {
  return {
    ...d,
    peak: Math.round(Math.max(...d.demand)),
    surplus: Math.round(total.reduce((s, v, b) => s + (v - d.demand[b]), 0) / BLOCKS),
  };
}

/** "Remarks" card: the block-by-block average of several days (Mon–Fri, or Sat–Sun). */
export function averageDays(days: DayData[], label: string): DayData | null {
  if (!days.length) return null;
  const avg = (pick: (d: DayData) => number[]) =>
    Array.from({ length: BLOCKS }, (_, b) => round1(days.reduce((s, d) => s + pick(d)[b], 0) / days.length));
  const seriesList = days[0].seriesList.map((s, k) => ({ name: s.name, data: avg((d) => d.seriesList[k].data) }));
  // API days carry no rostering (empty array) — keep it empty in the average too.
  const demand = avg((d) => d.demand), rostering = days[0].rostering.length ? avg((d) => d.rostering) : [];
  let cum = 0;
  const plants = days[0].plants.map((p, k) => {
    const sg = round1(days.reduce((s, d) => s + d.plants[k].sg, 0) / days.length);
    cum = round1(cum + sg);
    return { name: p.name, sg, cumulative: cum };
  });
  // Plants mode has no block series, so its surplus uses the plants' total SG.
  const total = seriesList.length
    ? Array.from({ length: BLOCKS }, (_, b) => seriesList.reduce((s, x) => s + x.data[b], 0))
    : Array.from({ length: BLOCKS }, () => cum);
  return withStats({ date: label, seriesList, demand, rostering, plants, peak: 0, surplus: 0 }, total);
}

/** An API day (plant-supply/by-category) as a card's data: the week's series in `names` order
 *  (missing ones as zeros), demand, and no rostering (the API has none). */
export function fromApiDay(day: { date: string; series: SeriesData[]; demand: number[] }, names: string[]): DayData {
  const seriesList = names.map((name) => ({ name, data: day.series.find((s) => s.name === name)?.data ?? new Array(BLOCKS).fill(0) }));
  const total = Array.from({ length: BLOCKS }, (_, b) => seriesList.reduce((s, x) => s + x.data[b], 0));
  return withStats({ date: day.date, seriesList, demand: day.demand, rostering: [], plants: [], peak: 0, surplus: 0 }, total);
}

/** Mock plant attributes for the Plant Generation table: central / state and variable cost (₹/kWh). */
export function plantMeta(name: string): { cs: "central" | "state"; vc: number } {
  const r = rng("meta" + name);
  return { cs: r() < 0.2 ? "state" : "central", vc: Math.round((1.5 + r() * 8.5) * 100) / 100 };
}
