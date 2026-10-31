import { istNow } from "@/data/engine";
import BASE_URL from "../../../BASE_URL";
import { cachedJson } from "@/lib/idbCache";

export const MARKETS = ["DAM", "RTM", "GDAM", "HPDAM"] as const;
export const EXCHANGES = ["IEX", "PXIL", "HPX"] as const;
export type Market = (typeof MARKETS)[number];
export type Exchange = (typeof EXCHANGES)[number];

export const BLOCKS = 96;
/** Smallest market-row height; rows otherwise share the window so three fit on screen. */
export const MIN_ROW_H = 200;

/** One 15-min block of one market on one exchange. null = no value for that block yet (e.g. RTM
 *  blocks still to come today), so the lines stop there. */
export type BlockPoint = {
  block: number;
  buyMW: number | null;
  sellMW: number | null;
  mcvMW: number | null;
  acvMW: number | null;
  mcpPrice: number | null;
  acpPrice: number | null;
};

/** 96 blocks per market per exchange. */
export type MarketDetailData = Record<Market, Record<Exchange, BlockPoint[]>>;

export const SERIES = [
  { key: "buyMW", name: "Buy", color: "#10b981" },
  { key: "sellMW", name: "Sell", color: "#ef4444" },
  { key: "mcpPrice", name: "MCP", color: "#111827" },
  { key: "acpPrice", name: "ACP", color: "#f43f5e" },
  { key: "acvMW", name: "ACV", color: "#2563eb" },
  { key: "mcvMW", name: "MCV", color: "#8b5cf6" },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** Today (IST) as yyyy-mm-dd. */
export function getTodayDate(): string {
  const d = istNow();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The current 15-minute block, 1–96 (IST). */
export function getCurrentBlock(): number {
  const d = istNow();
  return Math.min(BLOCKS, Math.floor((d.getHours() * 60 + d.getMinutes()) / 15) + 1);
}

/** Block 46 → ["11:15", "11:30"]. */
export function blockToTime(n: number): [string, string] {
  const start = (n - 1) * 15;
  return [hhmm(start), hhmm(start + 15)];
}

/** "2026-10-29" → "29 Oct 2026". */
export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------- market-graph API ---------- */

type ApiBlock = { Block: number; mcp: number | null; acp: number | null; mcv: number | null; acv?: number | null; sv?: number | null; sell: number | null; purchase: number | null };
type ApiMarket = { Market: string; dates: { Date: string; blocks: ApiBlock[] }[] };
type ApiResponse = Partial<Record<"iex" | "pxil" | "hpx", ApiMarket[]>>;

const nullBlock = (b: number): BlockPoint => ({ block: b, buyMW: null, sellMW: null, mcvMW: null, acvMW: null, mcpPrice: null, acpPrice: null });

/** A day with nothing from the API: every chart shows "No data available". */
export function emptyMarketDetail(): MarketDetailData {
  const out = {} as MarketDetailData;
  for (const m of MARKETS) {
    out[m] = {} as Record<Exchange, BlockPoint[]>;
    for (const e of EXCHANGES) out[m][e] = Array.from({ length: BLOCKS }, (_, i) => nullBlock(i + 1));
  }
  return out;
}

/** API → 96 blocks per market per exchange. Blocks the API doesn't send are null. PXIL sends its
 *  ACV as "sv"; a null price is shown as 0. */
function fromApi(json: ApiResponse, date: string): MarketDetailData {
  const out = {} as MarketDetailData;
  for (const m of MARKETS) {
    out[m] = {} as Record<Exchange, BlockPoint[]>;
    for (const e of EXCHANGES) {
      const blocks = Array.from({ length: BLOCKS }, (_, i) => nullBlock(i + 1));
      const day = json[e.toLowerCase() as "iex"]?.find((x) => x.Market === m)?.dates.find((d) => d.Date === date) ?? null;
      for (const b of day?.blocks ?? []) {
        if (b.Block < 1 || b.Block > BLOCKS) continue;
        blocks[b.Block - 1] = {
          block: b.Block,
          buyMW: b.purchase ?? 0, sellMW: b.sell ?? 0, mcvMW: b.mcv ?? 0, acvMW: b.acv ?? b.sv ?? 0,
          mcpPrice: b.mcp ?? 0, acpPrice: b.acp ?? 0,
        };
      }
      out[m][e] = blocks;
    }
  }
  return out;
}

async function fetchMarketGraph(from: string, to: string): Promise<ApiResponse> {
  const query = new URLSearchParams({ from_date: from, to_date: to });
  const res = await fetch(`${BASE_URL}market-graph?${query.toString()}`, { headers: { accept: "*/*" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`.trim());
  return res.json();
}

/** Loads a day of market detail from /market-graph (all markets, all exchanges). Not cached:
 *  today's RTM fills in through the day. */
export async function loadMarketDetail(date: string): Promise<MarketDetailData> {
  return fromApi(await fetchMarketGraph(date, date), date);
}

/** Every date in from..to (inclusive), as yyyy-mm-dd. */
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (let t = new Date(y, m - 1, d); ; t.setDate(t.getDate() + 1)) {
    const iso = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    out.push(iso);
    if (iso >= to) break;
  }
  return out;
}

/** A date range of market detail (Week / Month ahead), one /market-graph call for all markets
 *  and exchanges, saved in IndexedDB (key market-graph:<from>:<to>). `sync` (Sync DB) re-calls
 *  the API; `changed` says whether the saved copy differed. */
export async function loadMarketRange(from: string, to: string, sync = false): Promise<{ days: Record<string, MarketDetailData>; changed: boolean }> {
  const { value, changed } = await cachedJson(`market-graph:${from}:${to}`, () => fetchMarketGraph(from, to), sync);
  const days: Record<string, MarketDetailData> = {};
  for (const date of datesBetween(from, to)) days[date] = fromApi(value, date);
  return { days, changed };
}

/** Block-by-block average of several days (a Remarks card): each value averages the days that
 *  have it; null where none do. */
export function averageBlocks(days: BlockPoint[][]): BlockPoint[] {
  const keys = ["buyMW", "sellMW", "mcvMW", "acvMW", "mcpPrice", "acpPrice"] as const;
  return Array.from({ length: BLOCKS }, (_, i) => {
    const p = nullBlock(i + 1);
    for (const k of keys) {
      const vals = days.map((d) => d[i][k]).filter((v): v is number => v !== null);
      p[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
    }
    return p;
  });
}

/** Peak MCP and cleared energy (MCV, MW per 15 min → MU) of one day's blocks; null without data. */
export function dayStats(data: BlockPoint[]): { peakMcp: number; mu: number } | null {
  const sent = data.filter((d) => d.mcpPrice !== null);
  if (!sent.length) return null;
  return {
    peakMcp: Math.max(...sent.map((d) => d.mcpPrice ?? 0)),
    mu: sent.reduce((s, d) => s + (d.mcvMW ?? 0), 0) / 4 / 1000,
  };
}
