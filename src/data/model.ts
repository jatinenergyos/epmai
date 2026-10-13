import {
  AGG, ARR_RATE, BL, BLR, CAD, DR, LT, MARKET, MO, PLANTS, TFS, TODAY, TOM, WK,
  avg, crore, dayOf, inr, is96f, isN, lakh, layerCfg, maxI, maxOf, minI, minOf, mw, nowB, nowMin,
  pct, ptH, smooth, solarH, sum, tfIdx, todayMape,
  type ModId, type Num, type Series, type Status, type TfId,
} from "./engine";

/* ---------- shared types ---------- */
export type Line = { name: string; v: Series; color: string; w?: number; dash?: string; y2?: boolean };
export type Layer = { name: string; color: string; v: number[] };
export type ChartSpec = {
  x: string[]; xt?: string[]; layers?: Layer[];
  bars?: { name: string; v: Series; pos: string; neg: string };
  band?: { lo: number[]; hi: number[]; name: string };
  lines?: Line[]; now?: number | null; unit?: string; unit2?: string; yl?: string; y2l?: string;
  zero?: boolean;
};
export type Kpi = { l: string; v: string; u?: string; s?: string; st?: Status };
export type Summary = { big: string; u: string; sub: string; st: Status };
export type Row = { n: string; v: Series; sign?: boolean };
export type ModData = { chart?: ChartSpec; kpis?: Kpi[]; rows?: Row[]; sum: Summary };

const nn = (v: Num) => v ?? 0;

/* ---------- module × horizon ---------- */
const cache = new Map<string, ModData>();
export function G(mod: ModId, tf: TfId): ModData {
  const key = mod + "|" + tf;
  const hit = cache.get(key);
  if (hit) return hit;
  let r: ModData;
  const is96 = is96f(tf);
  if (mod === "mi") r = getMI(tf);
  else if (mod === "analytics") r = getAna(tf);
  else if (tf === "dr") r = gDR(mod);
  else if (mod === "demand") r = gDemand(tf, is96);
  else if (mod === "supply") r = gSupply(tf, is96);
  else if (mod === "opt") r = gOpt(tf, is96);
  else if (mod === "trade") r = gTrade(tf, is96);
  else r = { sum: { big: is96 ? "9" : "On demand", u: is96 ? "reports" : "", sub: is96 ? "Auto-generated" : "Generated as required", st: "ok" } };
  cache.set(key, r);
  return r;
}

function gDemand(tf: TfId, is96: boolean): ModData {
  if (is96) {
    const D = dayOf(tf), pk = maxI(D.dem), mn = minI(D.dem), mu = (sum(D.dem) * 0.25) / 1000;
    const lines: Line[] = tf === "id"
      ? [{ name: "Actual", v: D.act, color: "--ink", w: 2.2 }, { name: "Revised forecast", v: D.rev, color: "--demand", w: 2.2 },
         { name: "Day-ahead forecast", v: D.F, color: "--demand", dash: "4 3", w: 1.3 }]
      : [{ name: "Forecast", v: D.F, color: "--demand", w: 2.4 }];
    const mape = tf === "id" ? todayMape() : 2.8;
    const a = nn(D.act[nowB]), dv = (a - D.F[nowB]) / D.F[nowB];
    return {
      chart: { x: BL, xt: BLR, band: { lo: D.lo, hi: D.hi, name: "P10–P90" }, lines, now: tf === "id" ? nowB : null, unit: "MW", yl: "Demand (MW)" },
      kpis: [
        { l: "Peak demand", v: mw(D.dem[pk]), u: "MW", s: "at " + BL[pk] },
        { l: "Minimum", v: mw(D.dem[mn]), u: "MW", s: "at " + BL[mn] },
        { l: "Energy", v: inr(mu, 1), u: "MU", s: tf === "id" ? "today (actual + revised)" : "tomorrow" },
        { l: tf === "id" ? "MAPE so far" : "Expected MAPE", v: mape.toFixed(2), u: "%", s: "target ≤ 3%", st: mape < 3 ? "ok" : "warn" },
        tf === "id"
          ? { l: "Actual now", v: mw(a), u: "MW", s: pct(dv * 100) + " vs day-ahead", st: Math.abs(dv) > 0.02 ? "warn" : "ok" }
          : { l: "Forecast issued", v: "09:42", u: "IST", s: "SLDC cutoff 10:00", st: "ok" },
      ],
      rows: [...(tf === "id" ? [{ n: "Actual", v: D.act }] : []), { n: tf === "id" ? "Revised / DA" : "Forecast", v: tf === "id" ? D.dem : D.F },
        { n: "P90 (upper)", v: D.hi }, { n: "P10 (lower)", v: D.lo }],
      sum: { big: mw(D.dem[pk]), u: "MW peak", sub: (tf === "id" ? "Now " + mw(a) + " MW · " : "") + "at " + BL[pk], st: tf === "id" && Math.abs(dv) > 0.02 ? "warn" : "ok" },
    };
  }
  const A = AGG[tf], pk = maxI(A.F);
  return {
    chart: { x: A.x, xt: A.xt, band: { lo: A.lo, hi: A.hi, name: "P10–P90" }, lines: [{ name: tf === "wk" ? "Hourly forecast" : "Peak forecast", v: A.F, color: "--demand", w: 2.2 }], unit: "MW", yl: (tf === "wk" ? "Demand" : "Peak demand") + " (MW)" },
    kpis: [
      { l: "Peak", v: mw(A.F[pk]), u: "MW", s: A.xt[pk] }, { l: "Average", v: mw(avg(A.F)), u: "MW" },
      { l: "Energy", v: inr((sum(A.F) * ptH[tf]) / 1000, 0), u: "MU", s: "estimated" },
      { l: "Band width", v: "±" + (tf === "wk" ? 3.5 : tf === "mo" ? 5 : tf === "yr" ? 6 : 8), u: "%", s: "P10–P90" },
      tf === "lt" ? { l: "Peak CAGR", v: "5.8", u: "%", s: "10-year" } : { l: "Model", v: "Ensemble", u: "", s: "GBM + weather + calendar" },
    ],
    rows: [{ n: "Forecast", v: A.F }, { n: "P90", v: A.hi }, { n: "P10", v: A.lo }],
    sum: { big: mw(A.F[pk]), u: "MW peak", sub: A.xt[pk], st: "ok" },
  };
}

function gSupply(tf: TfId, is96: boolean): ModData {
  const D = is96 ? dayOf(tf) : AGG[tf];
  const layers = layerCfg(D.layers);
  const re = is96 ? dayOf(tf).re : D.layers[3].map((h, i) => h + D.layers[4][i] + D.layers[5][i] + (D.layers[6] ? D.layers[6][i] : 0));
  const dem = is96 ? dayOf(tf).dem : AGG[tf].F, pk = maxI(dem);
  const reSh = (re[pk] / D.avail[pk]) * 100;
  const x = is96 ? BL : AGG[tf].x;
  return {
    chart: { x, xt: is96 ? BLR : AGG[tf].xt, layers, lines: [{ name: "Demand", v: dem, color: "--demand", w: 2, dash: "5 3" }], unit: "MW", yl: "Available capacity (MW)", now: tf === "id" ? nowB : null, zero: true },
    kpis: [
      { l: "Available at peak", v: mw(D.avail[pk]), u: "MW", s: "demand peak " + (is96 ? BL[pk] : AGG[tf].xt[pk]) },
      { l: "RE share at peak", v: reSh.toFixed(1), u: "%" },
      { l: "Max RE", v: mw(Math.max(...re)), u: "MW", s: is96 ? "solar noon" : "horizon max" },
      { l: "Outages", v: is96 ? "250" : tf === "wk" ? "450" : tf === "mo" ? "1,250" : "—", u: is96 || tf === "wk" || tf === "mo" ? "MW" : "", s: is96 ? "STATE TPS-2 U3 (forced)" : "planned maintenance", st: is96 ? "warn" : "ok" },
      { l: "Shortfall at peak", v: mw(Math.max(0, dem[pk] - D.avail[pk])), u: "MW", st: dem[pk] > D.avail[pk] ? "crit" : "ok" },
    ],
    rows: layers.map((l) => ({ n: l.name, v: l.v as Series })).concat([{ n: "Total available", v: D.avail }, { n: "Demand", v: dem }]),
    sum: { big: mw(D.avail[pk]), u: "MW available", sub: "RE " + reSh.toFixed(0) + "% at peak" + (is96 ? " · 1 outage" : ""), st: is96 ? "warn" : "ok" },
  };
}

function gOpt(tf: TfId, is96: boolean): ModData {
  if (is96) {
    const D = dayOf(tf), o = D.o, md = minI(o.gap), ms = maxI(o.gap);
    return {
      chart: { x: BL, xt: BLR, bars: { name: "Gap (MW)", v: o.gap, pos: "--pos", neg: "--neg" }, lines: [{ name: "Demand", v: D.dem, color: "--accent", w: 2, y2: true }], now: tf === "id" ? nowB : null, unit: "MW", yl: "Gap (MW)", y2l: "Demand (MW)", zero: true },
      kpis: [
        { l: "Max deficit", v: mw(-o.gap[md]), u: "MW", s: "at " + BL[md], st: "crit" },
        { l: "Max surplus", v: mw(o.gap[ms]), u: "MW", s: "at " + BL[ms], st: "ok" },
        { l: "Deficit energy", v: inr((sum(o.buy) * 0.25) / 1000, 2), u: "MU" },
        { l: "Surplus energy", v: inr((sum(o.sell) * 0.25) / 1000, 2), u: "MU" },
        { l: "Optimisation saving", v: inr(o.saving / 1e5, 1), u: "₹ lakh", s: "vs merit-order only", st: "ok" },
      ],
      rows: [{ n: "Demand", v: D.dem }, { n: "RE (must-run)", v: D.re }, ...PLANTS.slice(0, 10).map((p) => ({ n: p.name, v: o.sched[p.name].map(Math.round) })),
        { n: "Market buy", v: o.buy }, { n: "Market sell", v: o.sell }, { n: "Gap", v: o.gap, sign: true }],
      sum: { big: mw(-o.gap[md]), u: "MW max deficit", sub: "Saving " + lakh(o.saving) + " · " + BL[md], st: "crit" },
    };
  }
  const A = AGG[tf], md = minI(A.gap), neg = A.gap.filter((g) => g < 0);
  return {
    chart: { x: A.x, xt: A.xt, bars: { name: "Gap (MW)", v: A.gap, pos: "--pos", neg: "--neg" }, lines: [{ name: "Demand", v: A.F, color: "--accent", w: 2, y2: true }], unit: "MW", yl: "Gap (MW)", y2l: "Demand (MW)", zero: true },
    kpis: [
      { l: "Max deficit", v: mw(Math.max(0, -A.gap[md])), u: "MW", s: A.xt[md], st: A.gap[md] < 0 ? "crit" : "ok" },
      { l: "Deficit periods", v: String(neg.length), u: "of " + A.gap.length },
      { l: "Avg position", v: mw(avg(A.gap)), u: "MW" },
      { l: "Suggested hedge", v: mw(Math.max(0, -avg(neg)) * 0.7), u: "MW", s: "70% of avg deficit" },
      { l: "Reserve margin", v: ((avg(A.avail) / avg(A.F) - 1) * 100).toFixed(1), u: "%" },
    ],
    rows: [{ n: "Available", v: A.avail }, { n: "Demand", v: A.F }, { n: "Gap", v: A.gap, sign: true }],
    sum: { big: mw(Math.max(0, -A.gap[md])), u: "MW max deficit", sub: neg.length + " of " + A.gap.length + " periods short", st: A.gap[md] < 0 ? "crit" : "ok" },
  };
}

function gTrade(tf: TfId, is96: boolean): ModData {
  if (is96) {
    const D = dayOf(tf), o = D.o, pr = tf === "id" ? D.rtm : D.price, bid = o.buy.map((b, t) => b - o.sell[t]);
    const buyMU = (sum(o.buy) * 0.25) / 1000, sellMU = (sum(o.sell) * 0.25) / 1000;
    const bc = sum(o.buy.map((b, t) => b * pr[t] * 0.25)), sr = sum(o.sell.map((s, t) => s * pr[t] * 0.25));
    return {
      chart: { x: BL, xt: BLR, bars: { name: "Bid volume (+buy / −sell)", v: bid, pos: "--buy", neg: "--sell" }, lines: [{ name: (tf === "id" ? "RTM" : "DAM") + " forecast price", v: pr, color: "--demand", w: 2, y2: true }], now: tf === "id" ? nowB : null, unit: "MW", unit2: "₹/MWh", yl: "Bid volume (MW)", y2l: "Price (₹/MWh)", zero: true },
      kpis: [
        { l: "Buy volume", v: inr(buyMU, 2), u: "MU" }, { l: "Sell volume", v: inr(sellMU, 2), u: "MU" },
        { l: "Avg buy price", v: inr(bc / (buyMU * 1000 || 1), 0), u: "₹/MWh" },
        { l: "Net purchase cost", v: inr((bc - sr) / 1e7, 2), u: "₹ Cr", st: "warn" },
        { l: "Gate closure", v: tf === "id" ? hmB(nowB + 5) : "10:00", u: "IST", s: tf === "id" ? "next RTM session" : "IEX DAM bid window" },
      ],
      rows: [{ n: "Bid volume", v: bid, sign: true }, { n: "Forecast price", v: pr }, { n: "Buffer price", v: pr.map(() => 50) }, { n: "Bid price", v: pr.map((p, t) => (bid[t] >= 0 ? p + 50 : p - 50)) }],
      sum: { big: inr(buyMU, 1), u: "MU buy", sub: inr(sellMU, 1) + " MU sell · " + crore(bc - sr) + " net", st: "ok" },
    };
  }
  const A = AGG[tf];
  let x: string[], xt: string[], v: number[], p: number[], lab: string;
  if (tf === "wk") { x = A.tx!; xt = A.tx!; v = A.tbuy!; p = A.tprice!; lab = "TAM contract (MW RTC)"; }
  else if (tf === "mo") { x = A.wx!; xt = A.wx!; v = A.wbuy!; p = A.wprice!; lab = "DEEP tender (MW)"; }
  else { x = A.x; xt = A.xt; v = A.gap.map((g) => Math.round(-g * (tf === "lt" ? 1 : 0.75))); p = A.price; lab = tf === "lt" ? "New PPA needed (MW)" : "DEEP tender (MW)"; }
  return {
    chart: { x, xt, bars: { name: lab, v, pos: "--buy", neg: "--sell" }, lines: [{ name: tf === "lt" ? "Expected PPA tariff" : "Expected price", v: p, color: "--demand", w: 2, y2: true }], unit: "MW", unit2: "₹/MWh", yl: "Volume (MW)", y2l: "Price (₹/MWh)", zero: true },
    kpis: [
      { l: "Peak requirement", v: mw(Math.max(...v)), u: "MW", s: xt[maxI(v)] },
      { l: "Surplus to sell", v: mw(Math.max(0, -Math.min(...v))), u: "MW" },
      { l: "Avg expected price", v: inr(avg(p), 0), u: "₹/MWh" },
      { l: "Market", v: MARKET[tf], u: "" },
      { l: "Periods to contract", v: String(v.filter((q) => q > 0).length), u: "of " + v.length },
    ],
    rows: [{ n: lab, v, sign: true }, { n: "Expected price", v: p }],
    sum: { big: mw(Math.max(...v)), u: "MW to buy", sub: MARKET[tf] + " · avg ₹" + inr(avg(p)) + "/MWh", st: "ok" },
  };
}
const hmB = (b: number) => {
  const m = ((b * 15) % 1440 + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

function gDR(mod: ModId): ModData {
  const X = { x: DR.x, xt: DR.xt, now: DR.nowI, unit: "MW" };
  const n = DR.nowI, a = nn(DR.act[n]), dv = ((a - DR.fc[n]) / DR.fc[n]) * 100;
  if (mod === "demand")
    return {
      chart: { ...X, lines: [{ name: "Actual (SCADA)", v: DR.act, color: "--ink", w: 2.2 }, { name: "Forecast", v: DR.fc, color: "--demand", w: 2, dash: "4 3" }], yl: "Demand (MW)" },
      kpis: [
        { l: "Actual now", v: mw(a), u: "MW", s: pct(dv) + " vs forecast", st: Math.abs(dv) > 2 ? "warn" : "ok" },
        { l: "Ramp (last 30 min)", v: mw(a - nn(DR.act[n - 6])), u: "MW" },
        { l: "Forecast +1 h", v: mw(DR.fc[35]), u: "MW" }, { l: "Refresh", v: "5", u: "min", s: "SCADA / RTU" },
      ],
      rows: [{ n: "Actual", v: DR.act }, { n: "Forecast", v: DR.fc }],
      sum: { big: mw(a), u: "MW now", sub: pct(dv) + " vs forecast", st: Math.abs(dv) > 2 ? "warn" : "ok" },
    };
  if (mod === "supply")
    return {
      chart: { ...X, lines: [{ name: "Available (DC + RTM)", v: DR.av, color: "--pos", w: 2 }, { name: "Scheduled drawal", v: DR.sch, color: "--accent", w: 2 }, { name: "Actual drawal", v: DR.act, color: "--ink", w: 1.6, dash: "3 2" }], yl: "MW" },
      kpis: [
        { l: "Available now", v: mw(DR.av[n]), u: "MW" }, { l: "Scheduled", v: mw(DR.sch[n]), u: "MW" },
        { l: "Headroom", v: mw(DR.av[n] - a), u: "MW", st: DR.av[n] - a < 0 ? "crit" : "ok" },
        { l: "Frequency", v: "49.97", u: "Hz", s: "grid", st: "ok" },
      ],
      rows: [{ n: "Available", v: DR.av }, { n: "Scheduled", v: DR.sch }, { n: "Actual", v: DR.act }],
      sum: { big: mw(DR.av[n]), u: "MW available", sub: "Headroom " + mw(DR.av[n] - a) + " MW", st: DR.av[n] - a < 0 ? "crit" : "ok" },
    };
  if (mod === "opt")
    return {
      chart: { ...X, bars: { name: "Gap = schedule − actual", v: DR.gap, pos: "--pos", neg: "--neg" }, lines: [{ name: "Actual demand", v: DR.act, color: "--accent", w: 2, y2: true }], yl: "Gap (MW)", y2l: "Demand (MW)", zero: true },
      kpis: [
        { l: "Gap now", v: mw(DR.gap[n]), u: "MW", st: DR.gap[n] < -100 ? "crit" : "ok", s: DR.gap[n] < 0 ? "over-drawal" : "under-drawal" },
        { l: "Worst next hour", v: mw(Math.min(...DR.gap.slice(n))), u: "MW" },
        { l: "DSM band", v: "±150", u: "MW" },
        { l: "Blocks at risk", v: String(DR.gap.slice(n).filter((g) => g < -150).length), u: "of 12" },
      ],
      rows: [{ n: "Gap", v: DR.gap, sign: true }, { n: "Actual", v: DR.act }, { n: "Schedule", v: DR.sch }],
      sum: { big: mw(DR.gap[n]), u: "MW gap", sub: DR.gap[n] < 0 ? "Over-drawal vs schedule" : "Within schedule", st: DR.gap[n] < -100 ? "crit" : "ok" },
    };
  if (mod === "trade")
    return {
      chart: { ...X, bars: { name: "Curtailment achieved", v: DR.ach, pos: "--accent", neg: "--accent" }, lines: [{ name: "DR target", v: DR.tgt, color: "--warn", w: 2, dash: "4 3" }], yl: "Load shed (MW)", zero: true },
      kpis: [
        { l: "DR target now", v: mw(DR.tgt[n]), u: "MW", st: DR.tgt[n] > 0 ? "warn" : "ok" },
        { l: "Achieved", v: mw(nn(DR.ach[n])), u: "MW", s: "86% compliance" },
        { l: "Feeders on DR", v: "12", u: "", s: "agri + C&I" }, { l: "DSM avoided", v: "₹4.8", u: "L", s: "today", st: "ok" },
      ],
      rows: [{ n: "Target", v: DR.tgt }, { n: "Achieved", v: DR.ach }],
      sum: { big: mw(DR.tgt[n]), u: "MW target", sub: "12 feeders · " + mw(nn(DR.ach[n])) + " MW shed", st: DR.tgt[n] > 0 ? "warn" : "ok" },
    };
  const d = nn(DR.dev[n]);
  return { sum: { big: mw(d), u: "MW deviation", sub: "DSM deviation now", st: Math.abs(d) > 150 ? "crit" : "warn" } };
}

/* ---------- Market Intelligence ---------- */
export type MI = {
  x: string[]; xt: string[]; price: number[]; lo: number[]; hi: number[]; mcv: number[];
  buyB: number[]; sellB: number[]; own: number[]; uV: string; h: number; mk: string; now: number | null;
};
function mkMI(tf: TfId): MI {
  if (tf === "dr" || is96f(tf)) {
    const D = tf === "da" ? TOM : TODAY, rt = tf !== "da", pr = rt ? TODAY.rtm : D.price, k = rt ? 0.65 : 1;
    const nz = smooth(96, rt ? 61 : 62, 0.06, 3), nz2 = smooth(96, rt ? 63 : 64, 0.05, 3);
    const sellB: number[] = [], buyB: number[] = [], mcv: number[] = [], lo: number[] = [], hi: number[] = [];
    for (let t = 0; t < 96; t++) {
      const hh = t / 4 + 0.125, so = solarH(hh) / 3000, ev = Math.exp(-((hh - 20) ** 2) / 8), mo = Math.exp(-((hh - 9) ** 2) / 5);
      sellB.push(Math.round((15500 + 15000 * so) * k * (1 + nz[t])));
      buyB.push(Math.round((16500 + 7000 * ev + 3500 * mo) * k * (1 + nz2[t])));
      mcv.push(Math.round(Math.min(sellB[t], buyB[t]) * 0.83));
      const w = 0.07 + ((rt ? 0.05 : 0.02) * t) / 96;
      lo.push(Math.round(pr[t] * (1 - w))); hi.push(Math.round(Math.min(10000, pr[t] * (1 + w))));
    }
    const own = (tf === "da" ? TOM : TODAY).o.buy;
    let r: MI = { x: BL, xt: BLR, price: [...pr], lo, hi, mcv, buyB, sellB, own: [...own], uV: "MW", h: 0.25, mk: rt ? "RTM" : "DAM", now: tf === "id" ? nowB : null };
    if (tf === "dr") {
      const a = Math.max(0, nowB - 8), b = Math.min(96, nowB + 4);
      const sl = <T,>(v: T[]) => v.slice(a, b);
      r = { ...r, x: sl(BL), xt: sl(BLR), price: sl(r.price), lo: sl(lo), hi: sl(hi), mcv: sl(mcv), buyB: sl(buyB), sellB: sl(sellB), own: sl(own), now: nowB - a };
    }
    return r;
  }
  const A = AGG[tf], nz = smooth(A.x.length, 71 + tfIdx(tf), 0.05, 2);
  let price: number[], mcv: number[], uV: string;
  if (tf === "wk") {
    price = A.price; uV = "MW";
    mcv = A.x.map((_, i) => { const hh = (i % 24) + 0.5, so = solarH(hh) / 3000, we = WK.days![Math.floor(i / 24)].getDay() % 6 === 0 ? 0.9 : 1; return Math.round((13000 + 9000 * so) * we * (1 + nz[i])); });
  } else if (tf === "mo") { price = A.price; uV = "MU"; mcv = A.x.map((_, i) => Math.round(300 * (1 + nz[i]))); }
  else if (tf === "yr") { price = A.price; uV = "MU"; mcv = A.x.map((x, i) => Math.round(9200 * (x.startsWith("May") || x.startsWith("Jun") ? 1.15 : 1) * (1 + 0.004 * i) * (1 + nz[i]))); }
  else { price = A.x.map((_, i) => Math.round(5900 * (1 + 0.012 * (i + 1)))); uV = "MU"; mcv = A.x.map((_, i) => Math.round(118000 * Math.pow(1.085, i + 1))); }
  const pm = Math.max(...price);
  const buyB = mcv.map((v, i) => Math.round(v * (1.25 + 0.25 * (price[i] / pm))));
  const sellB = mcv.map((v, i) => Math.round(v * (1.55 - 0.2 * (price[i] / pm))));
  const w = tf === "wk" ? 0.1 : tf === "mo" ? 0.12 : tf === "yr" ? 0.15 : 0.2;
  const own = tf === "wk" ? A.gap.map((g) => Math.max(0, -g)) : A.gap.map((g) => (Math.max(0, -g) * ptH[tf]) / 1000);
  return {
    x: A.x, xt: A.xt, price, lo: price.map((p) => Math.round(p * (1 - w))), hi: price.map((p) => Math.round(Math.min(10000, p * (1 + w)))),
    mcv, buyB, sellB, own, uV, h: 1, mk: ({ wk: "TAM / DAM", mo: "DAM (daily)", yr: "DAM (monthly)", lt: "All exchanges" } as Record<string, string>)[tf], now: null,
  };
}
export type MIData = ModData & { M: MI; ratio: number; share: number; cap: number };
const miCache = new Map<TfId, MIData>();
export function getMI(tf: TfId): MIData {
  const hit = miCache.get(tf);
  if (hit) return hit;
  const M = mkMI(tf), pi = maxI(M.price), mi = minI(M.price), ratio = sum(M.buyB) / sum(M.sellB);
  const vol = M.uV === "MW" ? (sum(M.mcv) * M.h) / 1000 : sum(M.mcv), share = (sum(M.own) / sum(M.mcv)) * 100, cap = M.hi.filter((v) => v >= 9800).length;
  const volTxt = tf === "lt" ? inr(avg(M.mcv) / 1000, 0) + " BU/yr avg" : M.uV === "MW" ? inr(avg(M.mcv) / 1000, 1) + " GW avg" : inr(vol / (vol > 1e4 ? 1000 : 1), vol > 1e4 ? 1 : 0) + (vol > 1e4 ? " BU" : " MU");
  const r: MIData = {
    M, ratio, share, cap,
    chart: { x: M.x, xt: M.xt, bars: { name: "Probable market volume (MCV)", v: M.mcv, pos: "--c-ipp", neg: "--c-ipp" },
      lines: [{ name: "Price forecast (MCP)", v: M.price, color: "--demand", w: 2.2, y2: true }, { name: "P90 price", v: M.hi, color: "--demand", dash: "3 3", w: 1, y2: true }, { name: "P10 price", v: M.lo, color: "--demand", dash: "1 3", w: 1, y2: true }],
      unit: M.uV, unit2: "₹/MWh", yl: "Market volume (" + M.uV + ")", y2l: "Price (₹/MWh)", zero: true, now: M.now },
    kpis: [
      { l: "Avg price (" + M.mk + ")", v: inr(avg(M.price)), u: "₹/MWh" },
      { l: "Peak price", v: inr(M.price[pi]), u: "₹/MWh", s: M.xt[pi], st: M.price[pi] >= 9500 ? "crit" : "warn" },
      { l: "Lowest price", v: inr(M.price[mi]), u: "₹/MWh", s: M.xt[mi], st: "ok" },
      { l: "Probable volume", v: volTxt.split(" ")[0], u: volTxt.split(" ").slice(1).join(" ") },
      { l: "Buy ÷ sell bids", v: ratio.toFixed(2), u: "×", s: ratio > 1 ? "buyers exceed sellers" : "sellers exceed buyers", st: ratio > 1.05 ? "warn" : "ok" },
      { l: "Our share of MCV", v: share.toFixed(1), u: "%", s: "price impact risk " + (share > 15 ? "high" : "low"), st: share > 15 ? "warn" : "ok" },
    ],
    rows: [{ n: "MCP forecast (₹/MWh)", v: M.price }, { n: "P90 price", v: M.hi }, { n: "P10 price", v: M.lo }, { n: "MCV (" + M.uV + ")", v: M.mcv },
      { n: "Buy bids (" + M.uV + ")", v: M.buyB }, { n: "Sell bids (" + M.uV + ")", v: M.sellB }, { n: "Our requirement", v: M.own.map((v) => +(+v).toFixed(M.uV === "MW" ? 0 : 1)) }],
    sum: { big: inr(avg(M.price)), u: "₹/MWh avg", sub: volTxt + " · peak ₹" + inr(M.price[pi]), st: M.price[pi] >= 9500 ? "warn" : "ok" },
  };
  miCache.set(tf, r);
  return r;
}

/* ---------- Analytics (cost of power) ---------- */
export type Cost = { x: string[]; xt: string[]; own: number[]; mkt: number[]; sell: number[]; fix: number[]; rate: number[]; en: number[]; unit: string; ul: string; dsm?: boolean };
function costSeries(tf: TfId): Cost {
  if (tf === "dr") {
    const own: number[] = [], mkt: number[] = [], sell: number[] = [], fix: number[] = [], rate: number[] = [], en: number[] = [];
    DR.x.forEach((_, k) => {
      const a = DR.act[k] ?? DR.fc[k], e = (a * 5) / 60, sc = (DR.sch[k] * 5) / 60 * 5200, d = DR.dev[k];
      const dv = isN(d) ? ((Math.abs(d) * 5) / 60) * (d > 0 ? 9800 : 2500) : ((Math.max(0, -DR.gap[k]) * 5) / 60) * 9000;
      own.push(sc / 1e5); mkt.push(dv / 1e5); sell.push(0); fix.push(0); en.push(e); rate.push((sc + dv) / e / 1000);
    });
    return { x: DR.x, xt: DR.xt, own, mkt, sell, fix, rate, en, unit: "₹ L", ul: "Cost (₹ lakh)", dsm: true };
  }
  if (is96f(tf)) {
    const D = dayOf(tf), o = D.o, pr = tf === "id" ? D.rtm : D.price;
    const own: number[] = [], mkt: number[] = [], sell: number[] = [], fix: number[] = [], rate: number[] = [], en: number[] = [], x: string[] = [];
    for (let h = 0; h < 24; h++) {
      let ow = 0, mk = 0, se = 0, e = 0;
      for (let t = h * 4; t < h * 4 + 4; t++) {
        PLANTS.forEach((p) => (ow += o.sched[p.name][t] * p.vc * 0.25));
        mk += o.buy[t] * pr[t] * 0.25; se += o.sell[t] * pr[t] * 0.25; e += D.dem[t] * 0.25;
      }
      const fx = 6770 * 1650 + e * 600;
      own.push(ow / 1e5); mkt.push(mk / 1e5); sell.push(se / 1e5); fix.push(fx / 1e5); en.push(e);
      rate.push((ow + mk - se + fx) / e / 1000); x.push(String(h).padStart(2, "0") + ":00");
    }
    return { x, xt: x.map((s) => s + "–" + String((+s.slice(0, 2) + 1) % 24).padStart(2, "0") + ":00"), own, mkt, sell, fix, rate, en, unit: "₹ L", ul: "Cost (₹ lakh / hour)" };
  }
  const A = AGG[tf], own: number[] = [], mkt: number[] = [], sell: number[] = [], fix: number[] = [], rate: number[] = [], en: number[] = [];
  A.F.forEach((f, k) => {
    const e = f * ptH[tf], g = A.gap[k], ow = (Math.min(A.avail[k], f) / f) * e * 3650, mk = (Math.max(0, -g) / f) * e * A.price[k];
    const se = Math.max(0, g) * ptH[tf] * 0.3 * A.price[k], fx = e * 1150;
    own.push(ow / 1e7); mkt.push(mk / 1e7); sell.push(se / 1e7); fix.push(fx / 1e7); en.push(e); rate.push((ow + mk - se + fx) / e / 1000);
  });
  return { x: A.x, xt: A.xt, own, mkt, sell, fix, rate, en, unit: "₹ Cr", ul: "Cost (₹ crore)" };
}
export type AnaData = ModData & { C: Cost; rt: number; var_: number; lf: number; dem: number[] };
const anaCache = new Map<TfId, AnaData>();
export function getAna(tf: TfId): AnaData {
  const hit = anaCache.get(tf);
  if (hit) return hit;
  const C = costSeries(tf), small = tf === "dr" || is96f(tf);
  const tot = sum(C.own) + sum(C.mkt) + sum(C.fix) - sum(C.sell), E = sum(C.en);
  const rt = (small ? tot * 1e5 : tot * 1e7) / E / 1000, ms = (sum(C.mkt) / (sum(C.own) + sum(C.mkt))) * 100, var_ = (rt / ARR_RATE - 1) * 100;
  const dem = tf === "dr" ? DR.act.map((a, k) => a ?? DR.fc[k]) : is96f(tf) ? dayOf(tf).dem : AGG[tf].F;
  const lf = (avg(dem) / Math.max(...dem)) * 100, mx = maxI(C.rate), cU = small ? "₹ lakh" : "₹ Cr";
  const f2 = (a: number[]) => a.map((v) => +v.toFixed(2));
  const r: AnaData = {
    C, rt, var_, lf, dem,
    chart: { x: C.x, xt: C.xt,
      layers: [...(C.dsm ? [] : [{ name: "Fixed + transmission", color: "--c-state", v: f2(C.fix) }]),
        { name: C.dsm ? "Scheduled energy cost" : "Own generation (variable)", color: "--c-isgs", v: f2(C.own) },
        { name: C.dsm ? "DSM / deviation charge" : "Market purchase cost", color: C.dsm ? "--neg" : "--c-ipp", v: f2(C.mkt) }],
      lines: [{ name: "Avg cost ₹/kWh", v: f2(C.rate), color: "--demand", w: 2, y2: true }],
      unit: C.unit, unit2: "₹/kWh", yl: C.ul, y2l: "₹/kWh", zero: true, now: tf === "dr" ? DR.nowI : tf === "id" ? Math.floor(nowB / 4) : null },
    kpis: [
      { l: "Avg cost of power", v: rt.toFixed(2), u: "₹/kWh", s: "ARR benchmark ₹" + ARR_RATE.toFixed(2), st: rt > ARR_RATE ? "warn" : "ok" },
      { l: "Net cost", v: inr(tot, tot < 100 ? 2 : 0), u: cU, s: inr(E / 1000, E < 1e4 ? 1 : 0) + " MU" },
      { l: "Variance vs ARR", v: pct(var_), u: "", st: var_ > 2 ? "crit" : var_ > 0 ? "warn" : "ok" },
      { l: C.dsm ? "DSM share" : "Market share of cost", v: ms.toFixed(1), u: "%" },
      { l: "Load factor", v: lf.toFixed(1), u: "%", s: "average ÷ peak" },
      { l: "Costliest period", v: C.rate[mx].toFixed(2), u: "₹/kWh", s: C.xt[mx] },
    ],
    rows: [{ n: "Fixed + transmission", v: C.fix.map((v) => +v.toFixed(1)) }, { n: "Own generation cost", v: C.own.map((v) => +v.toFixed(1)) },
      { n: C.dsm ? "DSM charge" : "Market purchase", v: C.mkt.map((v) => +v.toFixed(1)) }, { n: "Sale revenue", v: C.sell.map((v) => +v.toFixed(1)) },
      { n: "Net cost", v: C.own.map((o, k) => +(o + C.mkt[k] + C.fix[k] - C.sell[k]).toFixed(1)) }, { n: "Energy (MWh)", v: C.en.map(Math.round) },
      { n: "₹/kWh", v: C.rate.map((v) => +v.toFixed(2)) }],
    sum: { big: rt.toFixed(2), u: "₹/kWh", sub: "Net " + inr(tot, tot < 100 ? 1 : 0) + " " + cU + " · " + pct(var_) + " vs ARR", st: var_ > 2 ? "crit" : var_ > 0 ? "warn" : "ok" },
  };
  anaCache.set(tf, r);
  return r;
}

/* ---------- consumer splits ---------- */
export function catSplit(h: number): [string, number, string][] {
  const ev = Math.exp(-((h - 20) ** 2) / 8), day = h > 9 && h < 18 ? 1 : 0, night = h < 6 ? 1 : 0;
  const r: [string, number, string][] = [
    ["Domestic", 30 + 14 * ev, "--c-isgs"], ["Agriculture", 16 + 10 * night + 4 * day, "--c-wind"],
    ["Industrial", 26 + 4 * day - 4 * ev, "--c-state"], ["Commercial", 12 + 5 * day, "--c-solar"], ["Public / others", 8, "--c-ipp"],
  ];
  const s = sum(r.map((x) => x[1]));
  return r.map((x) => [x[0], (x[1] / s) * 100, x[2]]);
}
export const zoneSplit = (v: number) =>
  ([["North", 0.24], ["South", 0.21], ["West", 0.2], ["East", 0.19], ["Central", 0.16]] as [string, number][]).map(([n, s]) => ({ n: n + " zone", v: v * s }));

/* ---------- home-level numbers ---------- */
export function homeKpis(): Kpi[] {
  const T = TODAY, o = T.o, g = o.gap[nowB], mape = todayMape();
  return [
    { l: "Demand now", v: mw(nn(T.act[nowB])), u: "MW", s: "Block " + (nowB + 1) + " · " + BL[nowB] },
    { l: "Peak today", v: mw(Math.max(...T.dem)), u: "MW", s: "at " + BL[maxI(T.dem)] },
    { l: "Available now", v: mw(T.avail[nowB]), u: "MW", s: "RE " + ((T.re[nowB] / T.avail[nowB]) * 100).toFixed(0) + "%" },
    { l: "Gap now", v: mw(g), u: "MW", s: g < 0 ? "buying in RTM" : "selling surplus", st: g < 0 ? "crit" : "ok" },
    { l: "DAM price tomorrow", v: inr(avg(TOM.price)), u: "₹/MWh", s: "avg · peak " + inr(Math.max(...TOM.price)) },
    { l: "Saving today", v: inr(o.saving / 1e5, 1), u: "₹ lakh", s: "optimised vs merit-only", st: "ok" },
    { l: "Forecast error", v: mape.toFixed(2), u: "% MAPE", s: "today so far", st: mape < 3 ? "ok" : "warn" },
  ];
}
export type Alert = { st: Status; title: string; text: string; mod: ModId; tf: TfId };
export function alerts(): Alert[] {
  const o = TODAY.o;
  return [
    { st: "crit", title: "STATE TPS-2 U3 tripped", text: "Forced outage, −250 MW from 14:30. Supply plan already revised.", mod: "supply", tf: "id" },
    { st: "warn", title: "Evening deficit ahead", text: mw(-Math.min(...o.gap.slice(72, 92))) + " MW short between 18:00 and 23:00. RTM bids are staged.", mod: "trade", tf: "id" },
    { st: "warn", title: "Over-drawing from the grid", text: mw(-DR.gap[DR.nowI]) + " MW above schedule. Demand response running on 12 feeders.", mod: "trade", tf: "dr" },
    { st: "info", title: "DAM bid closes at 10:00", text: inr((sum(TOM.o.buy) * 0.25) / 1000, 1) + " MU of buy bids for tomorrow are ready for approval.", mod: "trade", tf: "da" },
  ];
}
export const statusText: Record<Status, string> = { ok: "On track", warn: "Watch", crit: "Act now", info: "Info" };

export { minOf, maxOf, CAD, TFS, LT, MO, nowMin };
