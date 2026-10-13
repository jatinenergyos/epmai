import {
  AGG, ARR_RATE, BL, BLR, DEM, DR, LT, MARKET, MO, MPS, NOW, PLANTS, REPORTS, SEASON, TFS, TGT, TODAY, TOM, WK, YR,
  addDays, avg, crore, dLabel, dayOf, hm, inr, is96f, isN, lakh, layerCfg, maxI, minI, money, mw, nowB, nowMin,
  pct, ptH, sliceNow, smooth, sum, tfIdx, tfName, todayMape, ALL_REPORTS,
  type ModId, type Num, type Status, type TfId,
} from "./engine";
import { G, catSplit, getAna, getMI, zoneSplit, type ChartSpec } from "./model";

/* ---------- presentational building blocks (rendered by components/blocks.tsx) ---------- */
export type Cell = string | { tag: string; st: Status } | { report: string };
export type Step = { label: string; state: "done" | "run" | "pending"; time: string; note?: string };
export type HItem = { n: string; v: number; lab?: string; c?: string };
export type Block =
  | { kind: "table"; title?: string; note?: string; head: string[]; rows: Cell[][] }
  | { kind: "hbars"; title?: string; note?: string; items: HItem[]; unit?: string }
  | { kind: "steps"; title?: string; steps: Step[] }
  | { kind: "text"; title?: string; text: string }
  | { kind: "chart"; title?: string; note?: string; spec: ChartSpec; h?: number }
  | { kind: "stats"; items: { l: string; v: string }[] };
export type Viz =
  | { kind: "meter"; pct: number; color: string; marker?: number }
  | { kind: "stack"; parts: { n: string; v: number; c: string }[] }
  | { kind: "vbars"; items: { n: string; v: number }[] }
  | { kind: "squares"; on: boolean[] }
  | { kind: "buysell"; b: number; s: number }
  | { kind: "spark"; spec: ChartSpec }
  | { kind: "list"; items: string[] };
export type SubVal = { big: string; u?: string; sub?: string; tag?: [string, Status]; viz?: Viz };
export type Sub = { id: string; n: string; d: string; f: (tf: TfId) => SubVal };

const nn = (v: Num) => v ?? 0;
const tag = (t: string, st: Status): Cell => ({ tag: t, st });
const meter = (v: number, t: number): Viz => ({ kind: "meter", pct: Math.min(100, (v / t) * 60), color: v > t ? "--warn" : "--pos", marker: 60 });
const spark = (lines: { v: Num[]; color: string; dash?: string }[], zero = false): Viz => ({
  kind: "spark", spec: { x: lines[0].v.map((_, i) => String(i)), lines: lines.map((l, i) => ({ name: String(i), ...l })), zero },
});
const tbl = (head: string[], rows: Cell[][], title?: string): Block => ({ kind: "table", head, rows, title });
const pkI = (tf: TfId) => (tf === "dr" ? nowB : is96f(tf) ? maxI(dayOf(tf).dem) : maxI(AGG[tf].F));
const peakMW = (tf: TfId) => (tf === "dr" ? nn(DR.act[DR.nowI]) : is96f(tf) ? Math.max(...dayOf(tf).dem) : Math.max(...AGG[tf].F));
const mapeFor = (tf: TfId) => (tf === "id" ? todayMape() : MPS[tfIdx(tf)]);

/* ---------- detail metrics per module ---------- */
const VENUES: Record<TfId, [string, number, string][]> = {
  dr: [["AMI feeder control", 100, "--accent"]], id: [["IEX", 86, "--c-isgs"], ["PXIL", 8, "--c-wind"], ["HPX", 6, "--c-solar"]],
  da: [["IEX", 88, "--c-isgs"], ["PXIL", 7, "--c-wind"], ["HPX", 5, "--c-solar"]], wk: [["IEX TAM", 70, "--c-isgs"], ["PXIL TAM", 30, "--c-wind"]],
  mo: [["DEEP", 100, "--c-ipp"]], yr: [["DEEP", 80, "--c-ipp"], ["Banking", 20, "--c-hydro"]], lt: [["TBCB PPA", 65, "--c-ipp"], ["Bilateral", 35, "--c-state"]],
};
const OUT: Record<TfId, [number, string, Status]> = {
  dr: [250, "TPS-2 U3 forced", "crit"], id: [250, "TPS-2 U3 forced since 14:30", "crit"], da: [250, "TPS-2 U3 back by 10:00", "warn"],
  wk: [450, "TPS-1 U1 planned, 2 days", "warn"], mo: [1250, "TPS-1 U1 + BARH U2 planned", "warn"], yr: [350, "Monsoon maintenance avg", "ok"],
  lt: [650, "TPS-1 retirement " + LT.x[4], "ok"],
};
function meritOn(tf: TfId) {
  const so = [...PLANTS].sort((a, b) => a.vc - b.vc);
  if (tf === "dr" || is96f(tf)) {
    const D = tf === "da" ? TOM : TODAY, i = tf === "dr" ? nowB : minI(D.o.gap);
    return { so, sched: so.map((p) => Math.round(D.o.sched[p.name][i])) };
  }
  const A = AGG[tf], j = minI(A.gap);
  let need = A.F[j] - A.layers[3][j] - A.layers[4][j] - A.layers[5][j];
  return { so, sched: so.map((p) => { const x = Math.max(0, Math.min(p.dc, need)); need -= x; return Math.round(x); }) };
}
function mktPos(tf: TfId) {
  if (tf === "dr") return { b: sum(DR.gap.map((g) => Math.max(0, -g))) / 12 / 1000, s: sum(DR.gap.map((g) => Math.max(0, g))) / 12 / 1000 };
  if (is96f(tf)) { const o = dayOf(tf).o; return { b: (sum(o.buy) * 0.25) / 1000, s: (sum(o.sell) * 0.25) / 1000 }; }
  const A = AGG[tf];
  return { b: (sum(A.gap.map((g) => Math.max(0, -g))) * ptH[tf]) / 1000, s: (sum(A.gap.map((g) => Math.max(0, g))) * ptH[tf]) / 1000 };
}
function tradePL(tf: TfId) {
  if (tf === "dr") return 4.8e5;
  if (is96f(tf)) {
    const D = dayOf(tf), pr = tf === "id" ? D.rtm : D.price;
    return sum(D.o.sell.map((s, t) => s * 0.25 * (pr[t] - 3150))) + sum(D.o.buy.map((b, t) => b * 0.25 * Math.max(0, 4946 - pr[t])));
  }
  const A = AGG[tf];
  return sum(A.gap.map((g, i) => Math.abs(g) * ptH[tf] * (g > 0 ? Math.max(0, A.price[i] - 3150) : 250)));
}
const tradePrice = (tf: TfId) => (tf === "dr" ? sliceNow(TODAY.rtm) : (G("trade", tf).chart!.lines![0].v as number[]));
const GATE: () => Record<TfId, [string, string, Status]> = () => ({
  dr: ["Live", "12 feeders armed", "ok"], id: [hm((nowB + 2) * 15), "4 RTM bids queued", "warn"], da: ["10:00", "96 blocks staged", "warn"],
  wk: ["11:00", "7 TAM contracts", "ok"], mo: [dLabel(addDays(NOW, 5)), "DEEP tender draft", "ok"], yr: ["Q3", "RfP · SERC approval", "ok"],
  lt: [LT.x[2], "PPA tender plan", "ok"],
});

export const SUBS: Record<ModId, Sub[]> = {
  demand: [
    { id: "acc", n: "Forecast accuracy", d: "How close the forecast is (MAPE)", f: (tf) => {
      const i = tfIdx(tf), mp = mapeFor(tf);
      return { big: mp.toFixed(1), u: "% MAPE", tag: mp > TGT[i] ? ["High", "warn"] : ["OK", "ok"], viz: meter(mp, TGT[i]), sub: "Target ≤ " + TGT[i] + "% · bias " + (tf === "dr" ? "+1.1" : tf === "id" ? "+0.6" : "+0.3") + "%" };
    } },
    { id: "zone", n: "Zone-wise demand", d: "Peak split across 5 zones", f: (tf) => {
      const pk = peakMW(tf), z = zoneSplit(pk);
      return { big: mw(z[0].v), u: "MW North", viz: { kind: "vbars", items: z.map((x) => ({ n: x.n[0], v: x.v })) }, sub: "5 zones · peak " + mw(pk) + " MW" };
    } },
    { id: "cat", n: "Consumer category mix", d: "Domestic, agriculture, industrial…", f: (tf) => {
      const h = tf === "dr" ? nowMin / 60 : is96f(tf) ? pkI(tf) / 4 : ({ wk: 9.5, mo: 5.5, yr: 3.5, lt: 12 } as Record<string, number>)[tf], c = catSplit(h);
      return { big: c[0][1].toFixed(0), u: "% domestic", viz: { kind: "stack", parts: c.map((x) => ({ n: x[0], v: x[1], c: x[2] })) }, sub: "Agri " + c[1][1].toFixed(0) + "% · Industrial " + c[2][1].toFixed(0) + "%" };
    } },
  ],
  supply: [
    { id: "re", n: "Renewable availability", d: "Solar, wind and hydro", f: (tf) => {
      let so: number[], wi: number[], hy: number[];
      if (tf === "dr") { so = sliceNow(TODAY.solar); wi = sliceNow(TODAY.wind); hy = sliceNow(TODAY.hydro); }
      else if (is96f(tf)) { const D = dayOf(tf); so = D.solar; wi = D.wind; hy = D.hydro; }
      else { const A = AGG[tf]; so = A.layers[5]; wi = A.layers[4]; hy = A.layers[3]; }
      const re = so.map((v, i) => v + wi[i] + hy[i]);
      return { big: mw(Math.max(...re)), u: "MW max RE", viz: spark([{ v: so, color: "--c-solar" }, { v: wi, color: "--c-wind" }, { v: hy, color: "--c-hydro" }], true), sub: "Solar " + mw(Math.max(...so)) + " · Wind " + mw(Math.max(...wi)) };
    } },
    { id: "conv", n: "Thermal & central (ISGS)", d: "State, ISGS and IPP at peak", f: (tf) => {
      const S = tf === "dr" || is96f(tf) ? (tf === "da" ? TOM : TODAY) : AGG[tf], i = pkI(tf), L = [0, 1, 2].map((k) => S.layers[k][i]);
      return { big: mw(sum(L)), u: "MW", viz: { kind: "stack", parts: [{ n: "State", v: L[0], c: "--c-state" }, { n: "ISGS", v: L[1], c: "--c-isgs" }, { n: "IPP", v: L[2], c: "--c-ipp" }] }, sub: "State " + mw(L[0]) + " · ISGS " + mw(L[1]) + " · IPP " + mw(L[2]) };
    } },
    { id: "out", n: "Outages & derating", d: "Forced and planned", f: (tf) => {
      const O = OUT[tf];
      return { big: mw(O[0]), u: "MW out", tag: [O[2] === "crit" ? "Forced" : O[2] === "warn" ? "Planned" : "Plan", O[2]], sub: O[1] };
    } },
  ],
  opt: [
    { id: "mo", n: "Merit-order dispatch", d: "Plants running at the worst block", f: (tf) => {
      const { so, sched } = meritOn(tf), on = sched.map((s) => s > 0), mg = so[on.lastIndexOf(true)];
      return { big: on.filter(Boolean).length + "/" + on.length, u: "plants on", viz: { kind: "squares", on }, sub: "Marginal plant: " + (mg ? mg.name + " ₹" + inr(mg.vc) : "—") };
    } },
    { id: "mkt", n: "Market position", d: "Energy to buy vs sell", f: (tf) => {
      const { b, s } = mktPos(tf), d = (v: number) => inr(v, v < 10 ? 2 : 0);
      return { big: d(b), u: "MU buy", viz: { kind: "buysell", b, s }, sub: d(s) + " MU sell" };
    } },
    { id: "sav", n: "Optimisation savings", d: "Compared with merit-order only", f: (tf) => {
      let a: number[];
      if (tf === "dr") a = DR.ach.map((x) => ((nn(x) * 5) / 60) * 8000);
      else if (is96f(tf)) { const o = dayOf(tf).o; a = o.bcost.map((b, t) => b - o.ocost[t]); }
      else { const A = AGG[tf]; a = A.gap.map((g) => Math.abs(g) * ptH[tf] * (g < 0 ? 320 : 180)); }
      let c = 0;
      const cum = a.map((v) => (c += v)), [v, u] = money(c);
      return { big: v, u, viz: spark([{ v: cum, color: "--pos" }], true), sub: tf === "dr" ? "DSM charges avoided" : is96f(tf) ? "Running total through the day" : "Est. hedge + surplus sale" };
    } },
  ],
  trade: [
    { id: "px", n: "Price forecast", d: "Expected clearing price", f: (tf) => {
      const c = G("trade", tf).chart!, v = tradePrice(tf), pi = maxI(v);
      return { big: inr(avg(v)), u: "₹/MWh avg", viz: spark([{ v, color: "--demand" }]), sub: "Peak ₹" + inr(v[pi]) + (tf === "dr" ? " · RTM" : is96f(tf) ? " at " + BL[pi] : " · " + c.x[pi]) };
    } },
    { id: "venue", n: "Exchange / venue", d: "Where volume is placed", f: (tf) => {
      const V = VENUES[tf];
      return { big: V[0][1] + "%", u: V[0][0], viz: { kind: "stack", parts: V.map((x) => ({ n: x[0], v: x[1], c: x[2] })) }, sub: V.slice(1).map((x) => x[0] + " " + x[1] + "%").join(" · ") || "Single venue" };
    } },
    { id: "pl", n: "Trade P&L", d: "Sale margin + purchase savings", f: (tf) => {
      const v = tradePL(tf), [a, u] = money(v);
      return { big: a, u, tag: v < 0 ? ["Loss", "crit"] : ["Profit", "ok"], sub: tf === "dr" ? "DSM penalty avoided" : tf === "lt" ? "10-year total margin" : "Margin over variable cost" };
    } },
    { id: "gate", n: "Gate closure & bids", d: "Next deadline and status", f: (tf) => {
      const g = GATE()[tf];
      return { big: g[0], u: "", tag: [g[2] === "warn" ? "Due" : "On track", g[2]], sub: g[1] };
    } },
  ],
  reports: (
    [["opr", "Operational reports", "Demand, supply, outages", ["Demand performance", "Supply", "Plant outages"], ["DSM deviation", "Frequency profile"]],
     ["com", "Commercial reports", "Trade and profit", ["Trade analysis", "Trade profit"], ["DSM charges"]],
     ["perf", "Performance reports", "Shift, PLF, RE", ["Shift performance", "Plant load factor", "RE analysis"], ["DR compliance", "Shift performance"]]] as [string, string, string, string[], string[]][]
  ).map(([id, n, d, l, ldr]) => ({
    id, n, d, f: (tf: TfId): SubVal => {
      const L = tf === "dr" ? ldr : l;
      return { big: String(L.length), u: "reports", tag: tf === "dr" || is96f(tf) ? ["Ready", "ok"] : ["On demand", "info"], viz: { kind: "list", items: L }, sub: tf === "dr" ? "Every 15 min" : is96f(tf) ? "Auto-generated" : "As required" };
    },
  })),
  mi: [
    { id: "mcp", n: "Price forecast band", d: "MCP with P10–P90", f: (tf) => {
      const M = getMI(tf).M;
      return { big: inr(avg(M.price)), u: "₹/MWh avg", viz: spark([{ v: M.hi, color: "--demand", dash: "2 2" }, { v: M.price, color: "--demand" }, { v: M.lo, color: "--demand", dash: "2 2" }]), sub: "Range ₹" + inr(Math.min(...M.lo)) + "–" + inr(Math.max(...M.hi)) };
    } },
    { id: "mcv", n: "Probable market volume", d: "Expected cleared volume", f: (tf) => {
      const M = getMI(tf).M, viz: Viz = { kind: "spark", spec: { x: M.x, bars: { name: "MCV", v: M.mcv, pos: "--c-ipp", neg: "--c-ipp" }, zero: true } };
      if (tf === "lt") return { big: inr(avg(M.mcv) / 1000, 0), u: "BU/yr avg", viz, sub: M.x[9] + ": " + inr(M.mcv[9] / 1000, 0) + " BU" };
      const s = sum(M.mcv);
      return { big: M.uV === "MW" ? inr(avg(M.mcv) / 1000, 1) : inr(s / (s > 1e4 ? 1000 : 1), s > 1e4 ? 1 : 0), u: M.uV === "MW" ? "GW avg" : s > 1e4 ? "BU" : "MU", viz, sub: "Peak " + inr(Math.max(...M.mcv)) + " " + M.uV };
    } },
    { id: "ratio", n: "Buy vs sell bids", d: "How tight the market is", f: (tf) => {
      const g = getMI(tf);
      return { big: g.ratio.toFixed(2), u: "× buy/sell", tag: g.ratio > 1.05 ? ["Tight", "warn"] : g.ratio < 0.95 ? ["Surplus", "ok"] : ["Balanced", "info"], viz: { kind: "buysell", b: sum(g.M.buyB), s: sum(g.M.sellB) }, sub: g.ratio > 1 ? "Buyers exceed sellers" : "Sellers exceed buyers" };
    } },
    { id: "spike", n: "Price spike risk", d: "Chance of hitting the ₹10,000 cap", f: (tf) => {
      const g = getMI(tf), n = g.M.price.length, p = Math.min(95, Math.round((g.cap / n) * 100 + (tf === "yr" ? 20 : tf === "lt" ? 5 : 0)));
      return { big: String(p), u: "% of periods", tag: p > 20 ? ["High", "crit"] : p > 5 ? ["Medium", "warn"] : ["Low", "ok"], viz: meter(p, 30), sub: g.cap + " period(s) with P90 at cap" };
    } },
    { id: "spread", n: "Cross-market spread", d: "Price gap between segments", f: (tf) => {
      const S: Record<TfId, [string, number]> = {
        dr: ["RTM − DAM", Math.round(avg(sliceNow(TODAY.rtm)) - avg(sliceNow(TOM.price)))], id: ["RTM − DAM", Math.round(avg(TODAY.rtm) - avg(TODAY.price))],
        da: ["DAM − RTM (hist.)", -180], wk: ["TAM − DAM", 420], mo: ["DEEP − DAM", -310], yr: ["DEEP − DAM", -450],
        lt: ["PPA − exchange", Math.round(avg(LT.price) - avg(getMI("lt").M.price))],
      };
      const s = S[tf];
      return { big: (s[1] > 0 ? "+" : "") + inr(s[1]), u: "₹/MWh", tag: s[1] > 0 ? ["Premium", "warn"] : ["Discount", "ok"], sub: s[0] };
    } },
    { id: "share", n: "Our share of market", d: "Our requirement ÷ MCV", f: (tf) => {
      const g = getMI(tf);
      return { big: g.share.toFixed(1), u: "% of MCV", viz: meter(g.share, 25), tag: g.share > 15 ? ["Price-maker", "warn"] : ["Price-taker", "ok"], sub: g.share > 15 ? "Split bids to limit price impact" : "Low price impact" };
    } },
  ],
  analytics: [
    { id: "lf", n: "Load factor & peak ratio", d: "Shape of the load curve", f: (tf) => {
      const a = getAna(tf), d = [...a.dem].sort((p, q) => q - p);
      return { big: a.lf.toFixed(1), u: "% load factor", viz: spark([{ v: d, color: "--accent" }]), sub: "Peak ÷ average " + (100 / a.lf).toFixed(2) + "×" };
    } },
    { id: "rate", n: "Cost per kWh trend", d: "Average landed cost", f: (tf) => {
      const a = getAna(tf);
      return { big: a.rt.toFixed(2), u: "₹/kWh", viz: spark([{ v: a.C.rate, color: "--demand" }, { v: a.C.rate.map(() => ARR_RATE), color: "--muted", dash: "3 3" }]), sub: "Dashed line: ARR ₹" + ARR_RATE.toFixed(2) };
    } },
    { id: "err", n: "Forecast error distribution", d: "Share of periods by error size", f: (tf) => {
      const m = MPS[tfIdx(tf)], b = [Math.max(5, 60 - m * 7), 28, Math.min(30, 6 + m * 3), Math.min(25, 2 + m * 2), Math.max(1, m * 1.5 - 2)], s = sum(b), v = b.map((x) => (x / s) * 100);
      return { big: v[0].toFixed(0), u: "% within 1%", viz: { kind: "vbars", items: ["<1", "1–2", "2–3", "3–5", ">5"].map((n, k) => ({ n, v: v[k] })) }, sub: "Error buckets in %" };
    } },
    { id: "var", n: "Variance vs plan (ARR)", d: "Cost rate vs approved rate", f: (tf) => {
      const a = getAna(tf);
      return { big: pct(a.var_), u: "", tag: a.var_ > 2 ? ["Over", "crit"] : a.var_ > 0 ? ["Watch", "warn"] : ["Under", "ok"], viz: { kind: "meter", pct: Math.min(100, Math.abs(a.var_) * 8), color: a.var_ > 0 ? "--neg" : "--pos" }, sub: "₹" + a.rt.toFixed(2) + " vs ₹" + ARR_RATE.toFixed(2) + "/kWh" };
    } },
    { id: "anom", n: "Anomalies detected", d: "Exceptions flagged by AI", f: (tf) => {
      const A: Record<TfId, [number, string, Status]> = {
        dr: [3, "Over-drawal ramp +2.8%", "crit"], id: [2, "RTM price spike 19:30", "warn"], da: [1, "Low wind vs forecast", "warn"],
        wk: [2, "Sunday holiday effect", "ok"], mo: [1, "Hydro inflow above normal", "ok"], yr: [2, "May–Jun price cap risk", "warn"], lt: [1, "Evening peak growth 7%", "ok"],
      };
      const x = A[tf];
      return { big: String(x[0]), u: "flagged", tag: [x[2] === "crit" ? "Act" : x[2] === "warn" ? "Review" : "Info", x[2] === "ok" ? "info" : x[2]], sub: x[1] };
    } },
  ],
};

/* ---------- detail block behind each metric ---------- */
export function det(mod: ModId, tf: TfId, id: string): Block | null {
  const ti = tfIdx(tf), pk = peakMW(tf), i = pkI(tf), D = tf === "da" ? TOM : TODAY, A = AGG[tf];
  switch (mod + "." + id) {
    case "demand.acc":
      return { kind: "hbars", title: "Accuracy across horizons (MAPE / target)", items: TFS.map((t, k) => ({ n: t.name, v: mapeFor(t.id), lab: mapeFor(t.id).toFixed(1) + "% / " + TGT[k] + "%", c: k === ti ? "--accent" : "--c-state" })) };
    case "demand.zone":
      return tbl(["Zone", "Demand (MW)", "Share"], zoneSplit(pk).map((z) => [z.n, mw(z.v), ((z.v / pk) * 100).toFixed(0) + "%"]));
    case "demand.cat": {
      const h = tf === "dr" ? nowMin / 60 : is96f(tf) ? i / 4 : ({ wk: 9.5, mo: 5.5, yr: 3.5, lt: 12 } as Record<string, number>)[tf];
      return tbl(["Category", "Share", "MW"], catSplit(h).map((c) => [c[0], c[1].toFixed(1) + "%", mw((c[1] * pk) / 100)]));
    }
    case "supply.re": {
      const L: [string, number[]][] = tf === "dr" || is96f(tf) ? [["Solar", D.solar], ["Wind", D.wind], ["Hydro", D.hydro]] : [["Solar", A.layers[5]], ["Wind", A.layers[4]], ["Hydro", A.layers[3]]];
      return tbl(["Source", "Max (MW)", "Average (MW)", "At peak"], L.map(([n, v]) => [n, mw(Math.max(...v)), mw(avg(v)), mw(v[i])]));
    }
    case "supply.conv":
      return tbl(["Plant", "Type", "DC (MW)"], PLANTS.map((p) => [p.name, p.cat, mw(tf === "dr" || is96f(tf) ? D.dc[p.name][i] : p.dc)]));
    case "supply.out":
      return tbl(["Unit", "MW", "Type", "Window"], [
        ["STATE TPS-2 U3", "250", tag("Forced", "crit"), "Today 14:30 → tomorrow 10:00"],
        ["STATE TPS-1 U1", "450", tag("Planned", "warn"), dLabel(addDays(NOW, 3)) + " → " + dLabel(addDays(NOW, 5))],
        ["BARH U2 (share)", "180", tag("Planned", "warn"), dLabel(addDays(NOW, 21)) + " → " + dLabel(addDays(NOW, 26))],
        ["FARAKKA U4", "120", tag("Partial", "info"), "Till today 20:00"]]);
    case "opt.mo": {
      const { so, sched } = meritOn(tf);
      return tbl(["Plant", "VC ₹/MWh", "Scheduled (MW)", "Status"], so.map((p, k) => [p.name, inr(p.vc), mw(sched[k]), sched[k] >= p.dc - 1 ? tag("Full", "ok") : sched[k] > 0 ? tag("Partial", "warn") : tag("Off bar", "info")]));
    }
    case "opt.mkt": {
      const v = SUBS.opt[1].f(tf);
      return tbl(["Item", "Value"], [["Buy energy", v.big + " MU"], ["Sell energy", v.sub ?? ""], ["Market", MARKET[tf]], ["Buy cap / sell cap", "3,500 / 2,500 MW"]]);
    }
    case "opt.sav":
      if (is96f(tf) || tf === "dr") { const o = D.o; return tbl(["Cost view", "₹ Cr"], [["Merit-order only (baseline)", inr(o.base / 1e7, 2)], ["Optimised (with market)", inr(o.cost / 1e7, 2)], ["Saving", inr(o.saving / 1e7, 2)]]); }
      return tbl(["Driver", "Share"], [["Hedging deficit periods", "64%"], ["Surplus sale", "24%"], ["Maintenance rescheduling", "12%"]]);
    case "trade.px": {
      const v = tradePrice(tf);
      return tbl(["Statistic", "₹/MWh"], [["Minimum", inr(Math.min(...v))], ["Average", inr(avg(v))], ["Maximum", inr(Math.max(...v))], ["Buffer applied", "50"]]);
    }
    case "trade.venue":
      return tbl(["Venue", "Share"], VENUES[tf].map((x) => [x[0], x[1] + "%"]));
    case "trade.pl": {
      const v = SUBS.trade[2].f(tf);
      return tbl(["Component", "Value"], [["Sale margin over VC", "~60%"], ["Purchase below own VC", "~40%"], ["Total", v.big + " " + v.u]]);
    }
    case "trade.gate":
      return { kind: "steps", steps: steps(tf) };
    case "mi.mcp": {
      const M = getMI(tf).M;
      return tbl(["Statistic", "₹/MWh"], [["P10 low", inr(Math.min(...M.lo))], ["Average MCP", inr(avg(M.price))], ["Peak MCP", inr(Math.max(...M.price))], ["P90 high", inr(Math.max(...M.hi))], ["Band width", "±" + Math.round(((M.hi[0] - M.price[0]) / M.price[0]) * 100) + "%"]]);
    }
    case "mi.mcv": {
      const M = getMI(tf).M, pi = maxI(M.mcv), mi = minI(M.mcv);
      return tbl(["Statistic", "Volume"], [["Average", inr(avg(M.mcv)) + " " + M.uV], ["Highest · " + M.xt[pi], inr(M.mcv[pi]) + " " + M.uV], ["Lowest · " + M.xt[mi], inr(M.mcv[mi]) + " " + M.uV], ["Clearing ratio", "~83% of min(buy, sell)"]]);
    }
    case "mi.ratio": {
      const M = getMI(tf).M;
      return tbl(["Side", "Total " + M.uV], [["Buy bids", inr(sum(M.buyB))], ["Sell bids", inr(sum(M.sellB))], ["Cleared", inr(sum(M.mcv))]]);
    }
    case "mi.spike": {
      const M = getMI(tf).M;
      return tbl(["Riskiest periods", "P90 ₹/MWh"], M.hi.map((v, k) => [v, k] as [number, number]).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([v, k]) => [M.xt[k], inr(v)]));
    }
    case "mi.spread":
      return tbl(["Segment", "Avg ₹/MWh"], [["DAM (tomorrow)", inr(avg(TOM.price))], ["RTM (today)", inr(avg(TODAY.rtm))], ["TAM (week)", inr(avg(WK.tprice!))], ["DEEP (month)", inr(avg(MO.wprice!))]]);
    case "mi.share": {
      const g = getMI(tf);
      return tbl(["Item", "Value"], [["Our requirement", inr(sum(g.M.own)) + " " + g.M.uV], ["Market MCV", inr(sum(g.M.mcv)) + " " + g.M.uV], ["Share", g.share.toFixed(1) + "%"]]);
    }
    case "analytics.lf": {
      const a = getAna(tf), d = [...a.dem].sort((p, q) => q - p), q = (f: number) => d[Math.min(d.length - 1, Math.floor(d.length * f))];
      return tbl(["Statistic", "MW"], [["Peak", mw(d[0])], ["Exceeded 10% of time", mw(q(0.1))], ["Median", mw(q(0.5))], ["Exceeded 90% of time", mw(q(0.9))], ["Minimum", mw(d[d.length - 1])]]);
    }
    case "analytics.rate": {
      const C = getAna(tf).C;
      return tbl(["Costliest periods", "₹/kWh", "Net cost"], C.rate.map((r, k) => [r, k] as [number, number]).sort((p, q) => q[0] - p[0]).slice(0, 5).map(([r, k]) => [C.xt[k], r.toFixed(2), inr(C.own[k] + C.mkt[k] + C.fix[k] - C.sell[k], 2) + " " + C.unit]));
    }
    case "analytics.err":
      return tbl(["Horizon", "MAPE", "Target"], TFS.map((t, k) => [t.name, MPS[k].toFixed(1) + "%", TGT[k] + "%"]));
    case "analytics.var": {
      const a = getAna(tf);
      return tbl(["Item", "Value"], [["Actual / forecast rate", "₹" + a.rt.toFixed(2) + "/kWh"], ["ARR approved rate", "₹" + ARR_RATE.toFixed(2) + "/kWh"], ["Variance", pct(a.var_)], ["Main driver", a.var_ > 0 ? "Market purchase at peak" : "Cheap solar-hour buys"]]);
    }
    case "analytics.anom":
      return tbl(["Anomaly", "Severity"], [["Over-drawal ramp vs forecast", tag("High", "crit")], ["RTM price spike (evening)", tag("Medium", "warn")], ["Wind below forecast", tag("Medium", "warn")], ["Holiday effect not in calendar", tag("Low", "info")]]);
  }
  if (mod === "reports") {
    const L = ({ opr: ["dp", "sp", "po"], com: ["ta", "tp"], perf: ["sh", "plf", "re"] } as Record<string, string[]>)[id];
    const Ld = ({ opr: ["dsm"], com: ["dsm"], perf: ["drc", "sh"] } as Record<string, string[]>)[id];
    return tbl(["Report", ""], (tf === "dr" ? Ld : L).map((r) => [ALL_REPORTS.find((x) => x.id === r)!.name, { report: r }]));
  }
  return null;
}

/* ---------- AI: recommendations ---------- */
export type Rec = { t: string; imp: string; w: string; cf: number; why: string };
export function recs(mod: ModId, tf: TfId): Rec[] {
  void mod;
  const D = tf === "id" ? TODAY : TOM, o = D.o, md = minI(o.gap), ms = maxI(o.gap);
  if (tf === "dr")
    return [
      { t: "Trigger demand response on 12 feeders (" + mw(DR.tgt[DR.nowI]) + " MW)", imp: "₹1.9 L", w: "Over-drawal beyond the DSM band is expected for the next 4 blocks", cf: 88, why: "Actual demand is running 2.8% above schedule due to a temperature spike. Shedding agri pumping load on priority-3 feeders avoids DSM charges at a high deviation rate." },
      { t: "Buy 150 MW in the next RTM session", imp: "₹0.6 L", w: "RTM price is below the DSM normal rate for 20:00–21:00", cf: 81, why: "The RTM forecast price is lower than the DSM rate; buying closes the remaining gap after demand response." },
      { t: "Request 120 MW hydro ramp-up", imp: "₹0.4 L", w: "Hydro pondage is available for the evening peak", cf: 74, why: "Reservoir level allows extra evening generation without breaching water-release constraints." },
    ];
  if (is96f(tf)) {
    const mk = tf === "id" ? "RTM" : "DAM", pr = tf === "id" ? D.rtm : D.price;
    return [
      { t: mk + " buy " + mw(-o.gap[md]) + " MW at " + BLR[md], imp: lakh(o.buy[md] * 0.25 * pr[md] * 0.08), w: "Deficit after merit order; " + mk + " price ₹" + inr(pr[md]) + "/MWh", cf: 91, why: "Own plants are fully scheduled in this block. Market purchase is cheaper than DSM exposure and cheaper than the gas plant (₹10,273/MWh)." },
      { t: "Sell " + mw(o.gap[ms]) + " MW surplus at " + BL[ms], imp: lakh(o.sell[ms] * 0.25 * (pr[ms] - 3150)), w: "Cheap ISGS capacity would otherwise be backed down", cf: 86, why: "Plants with variable cost below the forecast market price can be scheduled and sold, earning the spread." },
      { t: "Back down TORRENT_GUVNL and DADRI_RF", imp: lakh(sum(o.buy) * 0.25 * 120), w: "Variable cost above market price in 80+ blocks", cf: 93, why: "Replacing high-cost gas and liquid-fuel generation with market power reduces total purchase cost." },
      { t: "Revise schedule for the STATE TPS-2 outage", imp: "—", w: "250 MW forced outage from 14:30 reflected in declared capacity", cf: 97, why: "Declared capacity was revised by SLDC; schedules must be re-optimised to avoid under-supply." },
    ];
  }
  const A = AGG[tf], gp = A.gap, mn = minI(gp);
  return [
    { t: "Contract " + mw(Math.max(0, -gp[mn] * 0.7)) + " MW for " + A.xt[mn], imp: "₹" + inr(Math.max(0, -gp[mn]) * 0.7 * 0.012, 1) + " Cr", w: "Largest deficit in this horizon (" + mw(-gp[mn]) + " MW)", cf: tf === "lt" ? 68 : 79, why: "Hedging 70% of the forecast deficit via a bilateral contract limits exposure to price spikes; the rest stays open for short-term markets." },
    { t: "Schedule planned maintenance in the surplus window", imp: "₹" + inr(0.8 + tfIdx(tf) * 0.3, 1) + " Cr", w: "Surplus of " + mw(Math.max(...gp)) + " MW at " + A.xt[maxI(gp)], cf: 77, why: "Moving maintenance outages to surplus periods reduces the need for market purchases during deficits." },
    { t: tf === "lt" ? "Add 1,000 MW solar + 500 MW / 2 h BESS" : "Sell surplus via " + MARKET[tf], imp: tf === "lt" ? "₹210 Cr/yr" : "₹" + inr(1.1 + tfIdx(tf) * 0.4, 1) + " Cr", w: tf === "lt" ? "Covers the growing evening peak and RPO target" : "Surplus periods with prices above ISGS variable cost", cf: 72, why: "Based on the portfolio gap, price outlook and variable costs of contracted plants." },
  ];
}

/* ---------- AI: workflow (orchestrated operation) ---------- */
export function steps(tf: TfId): Step[] {
  const S = (label: string, state: Step["state"], time: string, note?: string): Step => ({ label, state, time, note });
  if (tf === "dr") return [S("SCADA / RTU telemetry", "done", "live", "5-min"), S("AMI head-end feeder status", "done", "live"), S("Gap detection vs schedule", "done", "live"), S("DR signal to feeders", "run", "", "12 feeders · agri + C&I"), S("Compliance verification", "pending", "+15 min"), S("DSM settlement", "pending", "weekly")];
  if (tf === "id") return [S("Data ingest: SCADA · MDMS · AMI", "done", hm(nowB * 15)), S("Weather nowcast", "done", hm(nowB * 15 + 2)), S("Forecast revision #" + (nowB + 1), "done", hm(nowB * 15 + 5)), S("SLDC DC sync", "done", hm(nowB * 15 + 6)), S("Re-optimisation", "done", hm(nowB * 15 + 8)), S("RTM bid preparation", "run", "", "auto-queued"), S("RTM submission", "pending", hm((nowB + 2) * 15)), S("Schedule revision to SLDC", "pending", hm((nowB + 4) * 15))];
  if (tf === "da") return [S("Data ingest: SCADA · MDMS · AMI", "done", "09:05"), S("Weather & calendar feeds", "done", "09:12"), S("Forecast model run", "done", "09:30"), S("Forecast to SLDC (before 10 am)", "done", "09:42"), S("Plant DC received", "done", "09:40"), S("Merit-order optimisation", "done", "09:48"), S("DAM bid review & approval", "run", "", "awaiting trader"), S("IEX DAM submission", "pending", "10:00"), S("Schedule from SLDC", "pending", "13:00")];
  return [S("Historical data refresh", "done", "Mon 05:40"), S("Forecast model run", "done", "Mon 06:00"), S("Availability & outage plan", "done", "Mon 06:20"), S("Portfolio optimisation", "done", "Mon 06:35"), S("Procurement plan approval", "run", "", "with power purchase cell"),
    S(tf === "wk" ? "TAM order placement" : tf === "lt" ? "PPA tender / SERC approval" : "DEEP tender publication", "pending", tf === "wk" ? "Tue 11:00" : tf === "lt" ? "Q3" : "next week"), S("Contract & scheduling", "pending", "")];
}

/* ---------- AI: four lens headlines ---------- */
export type LensId = "dec" | "ops" | "rep" | "ana";
export const LENSES: { id: LensId; name: string; hint: string }[] = [
  { id: "dec", name: "Decide", hint: "What to do next" },
  { id: "ops", name: "Operate", hint: "Where the workflow is" },
  { id: "rep", name: "Report", hint: "Reports for this view" },
  { id: "ana", name: "Analyse", hint: "Why it's happening" },
];
const LENS_REPORTS: Record<ModId, string[]> = {
  demand: ["dp", "sh", "re"], supply: ["sp", "po", "plf", "re"], opt: ["op", "sp", "po"], trade: ["ta", "tp", "op"],
  reports: ["dp", "ta", "tp", "sh"], analytics: ["dp", "tp", "plf", "re"], mi: ["ta", "tp", "op"],
};
export function lensLine(l: LensId, tf: TfId, mod: ModId): string {
  const i = tfIdx(tf);
  if (l === "ops") {
    const S = steps(tf), dn = S.filter((x) => x.state === "done").length, run = (S.find((x) => x.state === "run") ?? S[0]).label;
    return dn + " of " + S.length + " steps done · now: " + run;
  }
  if (l === "rep") return REPORTS.filter((r) => LENS_REPORTS[mod].includes(r.id)).map((r) => r.name).join(", ") + (tf === "dr" || is96f(tf) ? " · auto" : " · on demand");
  if (mod === "demand") {
    const md = minI(TOM.o.gap);
    const dec: Record<TfId, string> = {
      dr: "Shed " + mw(DR.tgt[DR.nowI]) + " MW on 12 DR feeders now", id: "Buy " + mw(-Math.min(...TODAY.o.gap.slice(nowB))) + " MW in RTM for the next deficit block",
      da: "Bid " + mw(-TOM.o.gap[md]) + " MW DAM buy at " + BL[md], wk: "Book TAM RTC " + mw(Math.max(...WK.tbuy!)) + " MW on " + WK.tx![maxI(WK.tbuy!)],
      mo: "Float DEEP tender " + mw(Math.max(...MO.wbuy!)) + " MW for " + MO.wx![maxI(MO.wbuy!)].split(" ")[0], yr: "Hedge " + mw(-Math.min(...YR.gap) * 0.75) + " MW for the " + YR.xt[minI(YR.gap)] + " peak",
      lt: "Contract " + mw(-LT.gap[4]) + " MW RE + storage by " + LT.x[4],
    };
    const ana: Record<TfId, string> = {
      dr: "Anomaly: +2.8% ramp vs forecast (temperature spike)", id: "MAPE " + todayMape().toFixed(2) + "% · bias correcting", da: "Top driver: temperature (+1 °C ≈ +135 MW)",
      wk: "Holiday & weekend effect −7% on Sunday", mo: "Paddy / rabi season sensitivity", yr: "Seasonality + 5% growth scenario", lt: "EV & rooftop solar scenarios",
    };
    return l === "dec" ? dec[tf] : ana[tf];
  }
  const dec: Partial<Record<ModId, string>> = {
    supply: ["Request 120 MW hydro ramp-up now", "Revise DC: TPS-2 U3 −250 MW from 14:30", "Confirm TPS-2 U3 return at 10:00 tomorrow", "Shift TPS-1 U1 maintenance to Sunday", "Defer BARH U2 overhaul to a surplus week", "Plan unit overhauls in the Nov–Dec surplus", "Add 1,000 MW solar + 500 MW BESS by " + LT.x[4]][i],
    opt: tf === "dr" ? "Close " + mw(Math.max(0, -DR.gap[DR.nowI])) + " MW gap with DR + RTM" : recs("opt", tf)[is96f(tf) ? 2 : 1].t,
    trade: recs("trade", tf)[0].t, mi: recs("trade", tf)[0].t,
    analytics: ["Tighten DR trigger to 120 MW", "Cut RTM exposure 18:00–20:00", "Shift 300 MW buy into solar hours", "Rebalance TAM vs DAM mix", "Renegotiate IPP-B fixed cost", "File ARR true-up for cost variance", "Exit high-cost PPAs at expiry"][i],
    reports: ["Alert shift-in-charge on DSM band breach", "Send shift report at 14:00", "Share tomorrow's forecast note with SLDC", "Weekly TAM analysis to finance", "Monthly procurement pack to management", "ARR cost report for SERC filing", "Resource adequacy plan to CEA"][i],
  };
  const ana: Partial<Record<ModId, string>> = {
    supply: ["Solar ramp −180 MW in next 30 min (cloud)", "Solar forecast error ±6.2% · cloud cover", "Wind forecast ±9% · tomorrow's weather model", "TPS-2 trip risk 18% next week", "Hydro inflow +12% vs normal", "Monsoon hydro + wind upside ~900 MW", "RE share reaches ~45% by " + LT.x[9]][i],
    opt: ["Deviation risk in 3 of next 12 slots", "Shadow price ₹" + inr(TODAY.rtm[nowB]) + "/MWh now", "MILP solve 0.8 s · 96 blocks · 12 plants", "Reserve margin thin on " + WK.tx![maxI(WK.tbuy!)], "Optimal hedge ratio ~70% (VaR)", "Deficit concentrated Apr–Jul", "Least-cost mix: RE + storage"][i],
    trade: ["DR cheaper than RTM above ₹9,000", "RTM price spike risk around 19:30", "DAM price MAPE 8.2% · evening cap risk", "TAM vs DAM spread ₹420/MWh", "DEEP tariffs trending −3%", "Summer ₹10,000 cap risk in May–Jun", "PPA tariffs falling ~2.3%/yr"][i],
    mi: ["RTM clearing tight in evening slots", "RTM price spike risk around 19:30", "Solar-hour sell bids keep midday cheap", "TAM vs DAM spread ₹420/MWh", "DEEP tariffs trending −3%", "Summer ₹10,000 cap risk in May–Jun", "Exchange volume growing ~8.5%/yr"][i],
    analytics: ["Cost rate spikes with over-drawal", "Evening hours drive ~40% of daily cost", "Tomorrow's cost " + getAna("da").rt.toFixed(2) + " ₹/kWh forecast", "Weekend cost ~6% lower", "Monthly cost sensitive to hydro", "Summer drives most of annual cost", "Storage cuts ~₹0.3/kWh by " + LT.x[5]][i],
    reports: ["DSM penalty up 18% week-on-week", "Shift B has the highest deviation", "Forecast error clustered 18:00–20:00", "Weekend accuracy lower by 0.6 pp", "IPP-B PLF below 45%", "Cost per kWh trending +2.1% YoY", "Contracted capacity short from " + LT.x[3]][i],
  };
  return (l === "dec" ? dec[mod] : ana[mod]) ?? "";
}
export const lensReports = (mod: ModId) => REPORTS.filter((r) => LENS_REPORTS[mod].includes(r.id));
export function analysisBlocks(tf: TfId): Block[] {
  return [
    { kind: "hbars", title: "Forecast accuracy by horizon (MAPE)", items: TFS.map((t, k) => ({ n: t.name, v: MPS[k], lab: MPS[k].toFixed(1) + "%", c: t.id === tf ? "--accent" : "--c-state" })) },
    { kind: "hbars", title: "What drives demand", unit: "%", items: [{ n: "Temperature", v: 38 }, { n: "Time of day", v: 22 }, { n: "Humidity", v: 12 }, { n: "Day type / holiday", v: 11 }, { n: "Agri supply roster", v: 9 }, { n: "Rainfall", v: 8 }] },
  ];
}

/* ---------- context panel per module ---------- */
export function contextBlocks(mod: ModId, tf: TfId): Block[] {
  const is96 = is96f(tf), D = tf === "id" ? TODAY : TOM;
  if (mod === "demand")
    return [
      { kind: "hbars", title: "Demand by consumer category", note: "Share at forecast peak", items: catSplit(9.5).map((x) => ({ n: x[0], v: x[1], lab: x[1].toFixed(0) + "%", c: x[2] })) },
      tbl(["Weather input", "Value"], [["Max temperature", "34.6 °C"], ["Humidity", "71%"], ["Rainfall probability", "20%"], ["Day type", "Working day"]], "Weather inputs"),
    ];
  if (mod === "supply")
    return [tbl(["Plant", "Type", "DC (MW)", "Status"], PLANTS.map((p) => [p.name, p.cat, String(p.name === "STATE TPS-2" && is96 ? 650 : p.dc),
      p.name === "STATE TPS-2" && (is96 || tf === "wk") ? tag("Outage 250", "crit") : p.name === "STATE TPS-1" && (tf === "wk" || tf === "mo") ? tag("Planned", "warn") : tag("Available", "ok")]), "Plant availability & outages")];
  if (mod === "opt") {
    const ap = avg(D.price);
    return [{ kind: "hbars", title: "Merit order (variable cost)", note: "Cheapest runs first. Red bars cost more than the average market price (₹" + inr(ap) + "/MWh) and are replaced by market purchase.", items: [...PLANTS].sort((a, b) => a.vc - b.vc).map((p) => ({ n: p.name, v: p.vc, lab: "₹" + inr(p.vc), c: p.vc > ap ? "--neg" : "--c-isgs" })) }];
  }
  if (mod === "trade")
    return [tbl(["Market desk", MARKET[tf]], [
      ["Exchange", tf === "lt" ? "Bilateral / TBCB" : tf === "mo" || tf === "yr" ? "DEEP portal (MoP)" : tf === "dr" ? "AMI / feeder control" : "IEX · PXIL · HPX"],
      ["Gate closure", tf === "id" ? "Every 30 min (RTM)" : tf === "da" ? "10:00–12:00 IST" : tf === "wk" ? "Daily 11:00" : tf === "dr" ? "Real time" : "Per tender"],
      ["Buffer price", "₹50/MWh"], ["Bid mode", tf === "dr" ? "Priority curtailment" : "Portfolio, block-wise"]])];
  if (mod === "mi") {
    const M = getMI(tf).M, top = M.price.map((p, k) => [p, k] as [number, number]).sort((a, b) => b[0] - a[0]).slice(0, 4);
    return [
      { kind: "hbars", title: "Exchange share · " + M.mk, items: [{ n: "IEX", v: 88, lab: "88%", c: "--c-isgs" }, { n: "PXIL", v: 7, lab: "7%", c: "--c-wind" }, { n: "HPX", v: 5, lab: "5%", c: "--c-solar" }] },
      tbl(["Highest-price periods", "₹/MWh", "Volume"], top.map(([p, k]) => [M.xt[k], "₹" + inr(p), inr(M.mcv[k]) + " " + M.uV])),
      tbl(["Market driver", "Outlook"], [["All-India demand", tf === "lt" ? "+6.5%/yr" : "+4.2% YoY"], ["Solar sell bids (midday)", "High"], ["Coal stock at plants", "14 days"], ["Hydro reservoir", "+8% vs normal"], ["Price cap", "₹10,000/MWh"]]),
    ];
  }
  if (mod === "analytics") {
    const a = getAna(tf), C = a.C, top = C.rate.map((r, k) => [r, k] as [number, number]).sort((p, q) => q[0] - p[0]).slice(0, 3);
    const d = [...a.dem].sort((p, q) => q - p);
    return [
      { kind: "chart", title: "Load duration curve", note: "Demand sorted high to low · load factor " + a.lf.toFixed(1) + "%", h: 180,
        spec: { x: d.map((_, k) => Math.round((k / d.length) * 100) + "%"), xt: d.map((_, k) => "Exceeded " + Math.round((k / d.length) * 100) + "% of time"), lines: [{ name: "Demand", v: d, color: "--accent", w: 2 }], unit: "MW", yl: "MW" } },
      tbl(["Insight", "Value"], [...top.map(([r, k], j) => [(j === 0 ? "Costliest: " : "Next: ") + C.xt[k], "₹" + r.toFixed(2) + "/kWh"] as Cell[]), ["Variance vs ARR rate", pct(a.var_)], ["Peak ÷ average demand", (100 / a.lf).toFixed(2) + "×"]]),
    ];
  }
  return [];
}
export const contextTitle: Record<ModId, string> = {
  demand: "Inputs behind the forecast", supply: "Plants and outages", opt: "How the merit order works", trade: "Market desk",
  mi: "Market snapshot", analytics: "Load shape and cost insights", reports: "",
};

/* ---------- drill-down for one period ---------- */
const stat = (l: string, v: string) => ({ l, v });
function subSeries(tf: TfId, i: number, val: number): ChartSpec {
  if (tf === "wk" || tf === "mo") {
    const pk = Math.max(...DEM), f = tf === "wk" ? Math.max(...WK.F.slice(Math.floor(i / 24) * 24, Math.floor(i / 24) * 24 + 24)) / pk : val / pk;
    const v = DEM.map((d) => Math.round(d * f));
    return { x: BL, xt: BLR, lines: [{ name: "Demand", v, color: "--demand", w: 2 }], band: { lo: v.map((x) => x * 0.96), hi: v.map((x) => x * 1.04), name: "Range" }, unit: "MW", yl: "MW" };
  }
  if (tf === "yr") {
    const nz = smooth(30, i * 13, 0.04, 2), v = nz.map((z, d) => Math.round(val * (0.94 + z) * (d % 7 === 6 ? 0.93 : 1)));
    return { x: v.map((_, d) => String(d + 1)), lines: [{ name: "Daily peak", v, color: "--demand", w: 2 }], unit: "MW", yl: "MW" };
  }
  const v = SEASON.map((s) => Math.round((val * s) / 1.15));
  return { x: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"], lines: [{ name: "Monthly peak", v: [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2].map((k) => v[k]), color: "--demand", w: 2 }], unit: "MW", yl: "MW" };
}
export type Drill = { label: string; blocks: Block[]; bid?: { side: "Buy" | "Sell" } };
export function drill(mod: ModId, tf: TfId, i: number): Drill {
  const g = G(mod, tf), c = g.chart!, label = (c.xt ?? c.x)[i], is96 = is96f(tf), D = tf === "id" ? TODAY : TOM;
  const hr = is96 ? i / 4 : tf === "wk" ? (i % 24) + 0.5 : 9.5;
  const B: Block[] = [];
  if (tf === "dr" && mod !== "mi" && mod !== "analytics") {
    if (mod === "trade" || mod === "opt") {
      B.push({ kind: "stats", items: [stat("Gap", mw(DR.gap[i]) + " MW"), stat("DR target", mw(DR.tgt[i]) + " MW"), stat("Achieved", isN(DR.ach[i]) ? mw(DR.ach[i] as number) + " MW" : "planned")] });
      B.push(tbl(["Feeder", "Zone", "Class", "Load", "Status"], ["11kV Rampur Agri-1", "11kV Kheri Agri-3", "11kV Sonpur Agri-2", "33kV Ind. Estate-4", "11kV Bela Agri-5", "11kV Nagar C&I-2"].map((f, k) => [f, ["North", "East", "South", "West", "Central", "North"][k], k === 3 || k === 5 ? "C&I (contract)" : "Agri (roster)", [42, 38, 35, 60, 31, 28][k] + " MW", k < 4 ? tag("Curtailed", "ok") : tag("Standby", "info")]), "Feeders on demand response"));
    } else {
      const v = DR.act[i] ?? DR.fc[i];
      B.push({ kind: "stats", items: [stat("Actual", isN(DR.act[i]) ? mw(DR.act[i] as number) + " MW" : "—"), stat("Forecast", mw(DR.fc[i]) + " MW"), stat("Schedule", mw(DR.sch[i]) + " MW"), stat("Deviation", isN(DR.dev[i]) ? mw(DR.dev[i] as number) + " MW" : "—")] });
      B.push({ kind: "hbars", title: "Demand by zone", unit: "MW", items: zoneSplit(v) });
      B.push({ kind: "hbars", title: "By consumer category", unit: "MW", items: catSplit((((nowMin - 120 + i * 5) / 60) + 24) % 24).map((x) => ({ n: x[0], v: (x[1] * v) / 100, c: x[2] })) });
    }
    return { label, blocks: B };
  }
  if (mod === "demand") {
    const val = is96 ? D.dem[i] : (c.lines![0].v[i] as number);
    B.push({ kind: "stats", items: [stat("Forecast", mw(is96 ? D.F[i] : val) + " MW"), stat("Likely range", mw(c.band!.lo[i]) + "–" + mw(c.band!.hi[i])),
      ...(tf === "id" && isN(D.act[i]) ? [stat("Actual", mw(D.act[i] as number) + " MW"), stat("Error", pct((((D.act[i] as number) - D.F[i]) / D.F[i]) * 100, 2))] : [stat("Temperature", (28 + 7 * Math.sin((Math.PI * (hr - 8)) / 12)).toFixed(1) + " °C")])] });
    if (!is96) B.push({ kind: "chart", title: tf === "wk" ? "Same day, 96 blocks" : tf === "mo" ? "Day profile (96 blocks)" : tf === "yr" ? "Daily peaks in " + label : "Monthly peaks in " + label, spec: subSeries(tf, i, val), h: 190 });
    B.push({ kind: "hbars", title: "Demand by zone", unit: "MW", items: zoneSplit(val) });
    B.push({ kind: "hbars", title: "By consumer category", unit: "MW", items: catSplit(hr).map((x) => ({ n: x[0], v: (x[1] * val) / 100, c: x[2] })) });
  } else if (mod === "supply") {
    const L = c.layers!, tot = sum(L.map((l) => l.v[i])), dem = c.lines![0].v[i] as number;
    B.push({ kind: "stats", items: [stat("Total available", mw(tot) + " MW"), stat("Demand", mw(dem) + " MW"), stat("Margin", mw(tot - dem) + " MW"), stat("RE share", (((L[3].v[i] + L[4].v[i] + L[5].v[i] + (L[6] ? L[6].v[i] : 0)) / tot) * 100).toFixed(1) + "%")] });
    B.push({ kind: "hbars", title: "By source", unit: "MW", items: L.map((l) => ({ n: l.name, v: l.v[i], c: l.color })) });
    if (is96) B.push(tbl(["Plant", "Type", "DC (MW)", ""], [...PLANTS.map((p) => [p.name, p.cat, String(D.dc[p.name][i]), D.dc[p.name][i] < p.dc ? tag("−" + (p.dc - D.dc[p.name][i]) + " outage", "crit") : ""] as Cell[]),
      ["Solar (state + ISTS)", "RE", String(D.solar[i]), ""], ["Wind", "RE", String(D.wind[i]), ""], ["Hydro", "RE", String(D.hydro[i]), ""]], "Plant-wise declared capacity"));
  } else if (mod === "opt") {
    if (is96) {
      const o = D.o, p = (tf === "id" ? D.rtm : D.price)[i];
      B.push({ kind: "stats", items: [stat("Demand", mw(D.dem[i]) + " MW"), stat("RE must-run", mw(D.re[i]) + " MW"), stat("Market price", "₹" + inr(p)), stat("Gap", mw(o.gap[i]) + " MW"), stat("Block saving", lakh(o.bcost[i] - o.ocost[i]))] });
      B.push(tbl(["Plant", "VC ₹/MWh", "DC", "Scheduled", "Status"], [...[...PLANTS].sort((a, b) => a.vc - b.vc).map((pl) => {
        const s = Math.round(o.sched[pl.name][i]), dc = D.dc[pl.name][i];
        const st = s >= dc - 1 ? tag("Full", "ok") : s > 0 ? tag("Partial", "warn") : pl.vc > p ? tag("Replaced by market", "crit") : tag("Backed down", "info");
        return [pl.name, inr(pl.vc), inr(dc), inr(s), st] as Cell[];
      }), ["Market buy", inr(p), "", inr(o.buy[i]), o.buy[i] ? tag(tf === "id" ? "RTM" : "DAM", "info") : ""], ["Market sell", inr(p), "", inr(o.sell[i]), o.sell[i] ? tag("Sell", "ok") : ""]], "Merit-order schedule for this block"));
    } else {
      const A = AGG[tf];
      B.push({ kind: "stats", items: [stat("Available", mw(A.avail[i]) + " MW"), stat("Demand", mw(A.F[i]) + " MW"), stat("Gap", mw(A.gap[i]) + " MW")] });
      B.push({ kind: "hbars", title: "Contribution by source", unit: "MW", items: layerCfg(A.layers).map((l) => ({ n: l.name, v: l.v[i], c: l.color })) });
      B.push(tbl(["Option to close the gap", "Up to"], [[MARKET[tf], mw(Math.max(0, -A.gap[i])) + " MW"], ["Reschedule maintenance", "450 MW"], ["Demand response", "300 MW"], ["Banking / swap", "500 MW"]]));
    }
  } else if (mod === "mi") {
    const M = getMI(tf).M, r = M.buyB[i] / M.sellB[i];
    const imp = (d: number) => Math.min(10000, M.price[i] * (1 + (d / (M.mcv[i] * (M.uV === "MW" ? 1 : 40))) * 0.9 * r));
    B.push({ kind: "stats", items: [stat("MCP forecast", "₹" + inr(M.price[i])), stat("P10–P90", "₹" + inr(M.lo[i]) + "–" + inr(M.hi[i])), stat("Probable MCV", inr(M.mcv[i]) + " " + M.uV), stat("Buy ÷ sell", r.toFixed(2) + "×"), stat("Our requirement", inr(+M.own[i], M.uV === "MW" ? 0 : 1) + " " + M.uV)] });
    B.push({ kind: "hbars", title: "Bid stack at the exchange", unit: M.uV, items: [{ n: "Buy bids", v: M.buyB[i], c: "--buy" }, { n: "Sell bids", v: M.sellB[i], c: "--sell" }, { n: "Cleared (MCV)", v: M.mcv[i], c: "--c-ipp" }] });
    B.push({ kind: "hbars", title: "Price impact of our bid", note: "Estimated MCP if we add extra buy volume in this period", items: [0, 250, 500, 1000].map((d) => ({ n: "+" + d + " MW", v: imp(d), lab: "₹" + inr(imp(d)), c: d ? "--demand" : "--c-state" })) });
    B.push({ kind: "text", title: "Suggested approach", text: M.price[i] >= 8000 ? "High-price period: limit exposure, use demand response or own ramp-up, and bid at P50 with a price ceiling." : M.price[i] <= 3500 ? "Low-price period: buy more here and back down costly plants; consider charging storage." : "Normal period: bid the portfolio at forecast price plus a ₹50 buffer." });
  } else if (mod === "analytics") {
    const C = getAna(tf).C, u = C.unit, net = C.own[i] + C.mkt[i] + C.fix[i] - C.sell[i], big = C.en[i] > 1e4;
    B.push({ kind: "stats", items: [stat("Net cost", inr(net, 2) + " " + u), stat("Avg cost", "₹" + C.rate[i].toFixed(2) + "/kWh"), stat("Energy", inr(C.en[i] / (big ? 1000 : 1), big ? 1 : 0) + (big ? " MU" : " MWh")), stat("vs ARR", pct((C.rate[i] / ARR_RATE - 1) * 100))] });
    B.push({ kind: "hbars", title: "Cost components", items: [...(C.dsm ? [] : [{ n: "Fixed + transmission", v: C.fix[i], lab: inr(C.fix[i], 2) + " " + u, c: "--c-state" }]), { n: "Own generation", v: C.own[i], lab: inr(C.own[i], 2) + " " + u, c: "--c-isgs" }, { n: C.dsm ? "DSM charge" : "Market purchase", v: C.mkt[i], lab: inr(C.mkt[i], 2) + " " + u, c: C.dsm ? "--neg" : "--c-ipp" }, { n: "Sale revenue (credit)", v: C.sell[i], lab: "−" + inr(C.sell[i], 2) + " " + u, c: "--pos" }] });
    B.push({ kind: "hbars", title: "Cost drivers", unit: "%", items: [{ n: "Fuel / variable cost", v: 46 }, { n: "Market price level", v: 24 }, { n: "Demand level", v: 15 }, { n: "RE availability", v: 9 }, { n: "Outages", v: 6 }] });
    B.push({ kind: "chart", title: "Compare with other periods", h: 190, spec: { x: C.x, xt: C.xt, bars: { name: "₹/kWh", v: C.rate.map((v) => +v.toFixed(2)), pos: "--c-state", neg: "--c-state" }, lines: [{ name: "ARR rate", v: C.x.map(() => ARR_RATE), color: "--demand", dash: "4 3", w: 1.4 }], unit: "₹/kWh", yl: "₹/kWh", zero: true } });
  } else if (mod === "trade") {
    const b = c.bars!.v[i] as number, p = c.lines![0].v[i] as number, side = b >= 0 ? "Buy" : "Sell", bp = b >= 0 ? p + 50 : p - 50;
    B.push({ kind: "stats", items: [stat("Side", side), stat("Volume", mw(Math.abs(b)) + " MW"), stat("Forecast price", "₹" + inr(p)), stat("Bid price", "₹" + inr(bp)), stat("Value", crore(Math.abs(b) * (is96 ? 0.25 : tf === "wk" ? 24 : tf === "lt" ? 8760 * 0.25 : 168) * bp))] });
    B.push(tbl(["Bid ticket · " + MARKET[tf], ""], [["Period", label], ["Bid volume", inr(b) + " MW"], ["Buffer price", "₹50/MWh"], ["Forceful " + side.toLowerCase(), "No"], ["(N−1) quantum", "0"], ["Min sell price", b < 0 ? "₹" + inr(3150) : "—"]]));
    B.push({ kind: "hbars", title: "Price sensitivity", unit: "MW", items: [-10, -5, 0, 5, 10].map((d) => ({ n: "Price " + (d > 0 ? "+" : "") + d + "%", v: Math.abs(b) * (1 - (d / 100) * (b >= 0 ? 0.8 : -0.8)), c: d === 0 ? "--accent" : "--c-state" })) });
    return { label, blocks: B, bid: { side } };
  }
  return { label, blocks: B };
}

/* ---------- reports ---------- */
export function repChart(id: string, tf: TfId): ChartSpec | null {
  const t: TfId = tf === "dr" ? "id" : tf, M: Record<string, ModId> = { dp: "demand", sp: "supply", op: "opt", ta: "trade" };
  if (M[id]) return G(M[id], t).chart ?? null;
  if (id === "tp") {
    if (is96f(t)) {
      const D = dayOf(t), v = Array.from({ length: 24 }, (_, h) => Math.round(sum(D.o.bcost.slice(h * 4, h * 4 + 4)) - sum(D.o.ocost.slice(h * 4, h * 4 + 4))));
      return { x: v.map((_, h) => String(h).padStart(2, "0") + ":00"), bars: { name: "Profit / saving (₹)", v, pos: "--pos", neg: "--neg" }, unit: "₹", yl: "₹ per hour", zero: true };
    }
    const A = AGG[t], v = A.gap.map((g, k) => Math.round(Math.abs(g) * (g > 0 ? 120 : 60) * (k % 3 ? 1 : 0.6)));
    return { x: A.x, xt: A.xt, bars: { name: "Saving (₹ '000)", v, pos: "--pos", neg: "--neg" }, unit: "₹ '000", zero: true };
  }
  if (id === "re") {
    if (is96f(t)) {
      const D = dayOf(t), n = smooth(96, 5, 0.06, 3);
      return { x: BL, xt: BLR, lines: [{ name: "Solar forecast", v: D.solar, color: "--c-solar", w: 2 }, { name: "Solar actual", v: D.solar.map((s, k) => (t === "id" && k <= nowB ? Math.round(s * (1 + n[k])) : null)), color: "--ink", w: 1.4, dash: "3 2" }, { name: "Wind forecast", v: D.wind, color: "--c-wind", w: 2 }], unit: "MW", yl: "MW", zero: true };
    }
    const A = AGG[t];
    return { x: A.x, xt: A.xt, lines: [{ name: "Solar", v: A.layers[5], color: "--c-solar", w: 2 }, { name: "Wind", v: A.layers[4], color: "--c-wind", w: 2 }], unit: "MW", yl: "MW", zero: true };
  }
  if (id === "dsm")
    return { x: DR.x, xt: DR.xt, bars: { name: "Deviation (actual − schedule)", v: DR.dev, pos: "--neg", neg: "--pos" }, lines: [{ name: "+150 MW band", v: DR.x.map(() => 150), color: "--warn", dash: "4 3", w: 1.4 }, { name: "−150 MW band", v: DR.x.map(() => -150), color: "--warn", dash: "4 3", w: 1.4 }], unit: "MW", yl: "Deviation (MW)", zero: true, now: DR.nowI };
  if (id === "drc") return G("trade", "dr").chart ?? null;
  return null;
}
export const REPORT_ABOUT: Record<string, string> = {
  dp: "Forecast vs actual demand with the confidence band, for accuracy reviews.", sp: "Declared capacity by source against demand.",
  po: "Every forced and planned outage with expected return time.", op: "Gap after merit-order optimisation, block by block.",
  ta: "Bid volumes and prices placed in each market.", tp: "Money saved or earned by optimisation and trading.",
  sh: "How each operating shift did on accuracy, deviation and DSM.", plf: "How hard each contracted plant is being used.",
  re: "Solar and wind: forecast vs actual.", dsm: "Deviation from schedule against the ±150 MW DSM band.", drc: "Demand-response target vs load actually shed.",
};
export function reportBlocks(id: string, tf: TfId): Block[] {
  const B: Block[] = [];
  const c = repChart(id, tf);
  if (c) B.push({ kind: "chart", spec: c, h: 260 });
  if (id === "po") B.push(tbl(["Plant / unit", "MW", "Type", "From", "Expected back"], [
    ["STATE TPS-2 U3", "250", tag("Forced", "crit"), "Today 14:30", dLabel(addDays(NOW, 1)) + " 10:00"],
    ["STATE TPS-1 U1", "450", tag("Planned", "warn"), dLabel(addDays(NOW, 3)), dLabel(addDays(NOW, 5))],
    ["BARH U2", "800 (share 180)", tag("Planned", "warn"), dLabel(addDays(NOW, 21)), dLabel(addDays(NOW, 26))],
    ["FARAKKA U4", "120", tag("Partial", "info"), "Yesterday 22:10", "Today 20:00"]]));
  if (id === "sh") B.push(tbl(["Shift", "Hours", "MAPE", "Max deviation", "DSM (₹ L)", "Bids"], [["A", "06–14", "2.1%", "182 MW", "1.2", "14"], ["B", "14–22", "2.9%", "241 MW", "2.6", "19"], ["C", "22–06", "1.7%", "96 MW", "0.4", "6"]]));
  if (id === "plf") B.push({ kind: "hbars", items: PLANTS.slice(0, 10).map((p, k) => { const v = [88, 86, 79, 74, 68, 61, 55, 52, 47, 39][k]; return { n: p.name, v, lab: v + "%", c: k < 4 ? "--pos" : k < 7 ? "--c-isgs" : "--warn" }; }) });
  return B;
}
export { tfName };
