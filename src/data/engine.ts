/* Core simulation engine — ported 1:1 from the original EPM AI prototype.
   All values are deterministic sample data (seeded RNG). */

export type Num = number | null;
export type Series = Num[];
export type Status = "ok" | "warn" | "crit" | "info";

/* ---------- helpers ---------- */
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const isN = (v: unknown): v is number => v != null && typeof v === "number" && !isNaN(v);
export const sum = (a: Series) => a.reduce<number>((x, y) => x + (y || 0), 0);
export const maxI = (a: Series) => a.reduce<number>((b, v, i) => (isN(v) && v > (a[b] ?? -Infinity) ? i : b), 0);
export const minI = (a: Series) => a.reduce<number>((b, v, i) => (isN(v) && v < (a[b] ?? Infinity) ? i : b), 0);
export const avg = (a: Series) => {
  const f = a.filter(isN);
  return f.length ? sum(f) / f.length : 0;
};
export const maxOf = (a: Series) => Math.max(...a.filter(isN));
export const minOf = (a: Series) => Math.min(...a.filter(isN));
export const inr = (v: number, d = 0) =>
  Number(v).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
export const fmtv = (v: number) =>
  Math.abs(v) < 100 && Math.round(v) !== v ? inr(v, Math.abs(v) < 10 ? 2 : 1) : inr(v);
export const mw = (v: number) => inr(Math.round(v));
export const crore = (v: number) => "₹" + inr(v / 1e7, 2) + " Cr";
export const lakh = (v: number) => "₹" + inr(v / 1e5, 1) + " L";
export const pct = (v: number, d = 1) => (v > 0 ? "+" : "") + v.toFixed(d) + "%";
export const money = (v: number): [string, string] =>
  Math.abs(v) >= 1e7 ? [inr(v / 1e7, 2), "₹ Cr"] : [inr(v / 1e5, 1), "₹ lakh"];

export function rng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function smooth(n: number, seed: number, amp: number, k = 4) {
  const r = rng(seed);
  const raw = Array.from({ length: n }, () => r() * 2 - 1);
  const o = raw.map((_, i) => {
    let s = 0,
      c = 0;
    for (let j = i - k; j <= i + k; j++)
      if (j >= 0 && j < n) {
        s += raw[j];
        c++;
      }
    return s / c;
  });
  const m = Math.max(...o.map(Math.abs)) || 1;
  return o.map((v) => (v / m) * amp);
}
const interp = (K: number[][], x: number) => {
  for (let i = 1; i < K.length; i++)
    if (x <= K[i][0]) {
      const [a, b] = [K[i - 1], K[i]];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
  return K[K.length - 1][1];
};

/* ---------- time (IST) ---------- */
export const istNow = () => {
  const d = new Date();
  return new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
};
export const NOW = istNow();
export const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
export const nowB = Math.min(95, Math.floor(nowMin / 15));
export const hm = (m: number) => {
  m = ((Math.round(m) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};
export const BL = Array.from({ length: 96 }, (_, i) => hm(i * 15));
export const BLR = BL.map((s, i) => s + "–" + hm(i * 15 + 15));
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dLabel = (d: Date) => DAY[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()];
const fyNow = NOW.getMonth() >= 3 ? NOW.getFullYear() + 1 : NOW.getFullYear();

/* ---------- base data ---------- */
export const DEM = [7820,7898,7636,7579,7388,7345,7214,7141,7021,6992,6929,6884,6831,6836,6855,7180,6994,7202,7311,7537,7862,8562,8969,9392,10079,10411,10787,11067,11464,11809,11981,12332,12494,12563,12445,12402,12182,12931,12809,12716,12251,12044,11920,11765,11305,11151,10986,10895,10477,10608,10444,10376,9897,9464,9483,9482,9424,9441,9475,9362,9327,9322,9307,9230,9156,9178,9186,9200,9062,9137,9197,9315,9214,9342,9249,9123,8905,8706,8496,8247,8004,7849,7653,7505,7288,7053,6891,6652,6385,6369,6269,6107,5889,5760,5637,5583];
export const SEASON = [0.93, 0.88, 0.92, 1.0, 1.08, 1.15, 1.12, 1.08, 1.02, 0.95, 0.86, 0.9];
const PK = [[0,6800],[3,4800],[5,4300],[7,5800],[9,8200],[10.5,4300],[12,2700],[14,2900],[16,4600],[18,8500],[19.5,10000],[22,9800],[23,8200],[24,6800]];

export type Plant = { name: string; cat: "ISGS" | "State" | "IPP"; vc: number; dc: number };
export const PLANTS: Plant[] = [
  { name: "SINGRAULI", cat: "ISGS", vc: 1650, dc: 650 }, { name: "RIHAND", cat: "ISGS", vc: 1780, dc: 700 },
  { name: "BARH", cat: "ISGS", vc: 3150, dc: 800 }, { name: "FARAKKA", cat: "ISGS", vc: 3420, dc: 450 },
  { name: "STATE TPS-1", cat: "State", vc: 3890, dc: 1100 }, { name: "IPP-A", cat: "IPP", vc: 4120, dc: 600 },
  { name: "STATE TPS-2", cat: "State", vc: 4380, dc: 900 }, { name: "GADARWARA-I", cat: "ISGS", vc: 4629, dc: 420 },
  { name: "SOLAPUR", cat: "ISGS", vc: 4946, dc: 380 }, { name: "IPP-B", cat: "IPP", vc: 5210, dc: 400 },
  { name: "TORRENT_GUVNL", cat: "IPP", vc: 10273, dc: 250 }, { name: "DADRI_RF", cat: "ISGS", vc: 11714, dc: 120 },
];
export const SRC: [string, string][] = [
  ["State thermal", "--c-state"], ["ISGS (central)", "--c-isgs"], ["IPP / PPA", "--c-ipp"],
  ["Hydro", "--c-hydro"], ["Wind", "--c-wind"], ["Solar", "--c-solar"],
];
type DC = Record<string, number[]>;
const catSum = (dc: DC, cat: string, t: number) => sum(PLANTS.filter((p) => p.cat === cat).map((p) => dc[p.name][t]));
export const solarH = (h: number, cl = 1) => 3000 * cl * Math.pow(Math.max(0, Math.sin((Math.PI * (h - 6.2)) / 12.6)), 1.3);
export const windH = (h: number, f = 1) => (760 + 330 * Math.cos((2 * Math.PI * (h - 2)) / 24)) * f;
export const hydroH = (h: number, f = 1) =>
  (520 + 420 * Math.exp(-((h - 19.5) ** 2) / 6) + 250 * Math.exp(-((h - 9) ** 2) / 4)) * f;

export type Opt = {
  sched: Record<string, number[]>; buy: number[]; sell: number[]; gap: number[];
  bcost: number[]; ocost: number[]; base: number; cost: number; saving: number;
};
function optimise(dem: number[], re: number[], price: number[], dc: DC): Opt {
  const n = dem.length, sorted = [...PLANTS].sort((a, b) => a.vc - b.vc), sched: Record<string, number[]> = {};
  PLANTS.forEach((p) => (sched[p.name] = new Array(n).fill(0)));
  const buy: number[] = [], sell: number[] = [], gap: number[] = [], bcost: number[] = [], ocost: number[] = [];
  for (let t = 0; t < n; t++) {
    const p = price[t];
    let rem = dem[t] - re[t];
    let r2 = rem, bc = 0;
    for (const pl of sorted) {
      const s = Math.min(dc[pl.name][t], Math.max(r2, 0));
      bc += s * pl.vc; r2 -= s;
    }
    if (r2 > 0) bc += r2 * p * 1.08;
    let b = 0, s = 0;
    const left: Record<string, number> = {};
    for (const pl of sorted)
      if (pl.vc < p - 50) {
        const x = Math.min(dc[pl.name][t], Math.max(rem, 0));
        sched[pl.name][t] = x; rem -= x; left[pl.name] = dc[pl.name][t] - x;
      }
    if (rem > 0) {
      b = Math.min(rem, 3500); rem -= b;
      for (const pl of sorted)
        if (pl.vc >= p - 50 && rem > 0) {
          const x = Math.min(dc[pl.name][t], rem);
          sched[pl.name][t] = x; rem -= x;
        }
      if (rem > 0) { b += rem; rem = 0; }
    } else {
      const cap = Math.min(2500, -rem + sum(Object.values(left)));
      s = cap;
      let need = cap + rem;
      for (const pl of sorted) {
        if (need <= 0) break;
        if (left[pl.name] > 0) {
          const x = Math.min(left[pl.name], need);
          sched[pl.name][t] += x; need -= x;
        }
      }
    }
    let c = 0;
    PLANTS.forEach((pl) => (c += sched[pl.name][t] * pl.vc));
    c += b * p - s * p;
    buy[t] = Math.round(b); sell[t] = Math.round(s); gap[t] = sell[t] - buy[t];
    bcost[t] = bc * 0.25; ocost[t] = c * 0.25;
  }
  const base = sum(bcost), cost = sum(ocost);
  return { sched, buy, sell, gap, bcost, ocost, base, cost, saving: base - cost };
}

export type Day = {
  F: number[]; lo: number[]; hi: number[]; act: Series; rev: Series; dem: number[];
  solar: number[]; wind: number[]; hydro: number[]; re: number[]; price: number[]; rtm: number[];
  dc: DC; o: Opt; layers: number[][]; avail: number[];
};
function makeDay(seed: number, f: number, isToday: boolean): Day {
  const nz = smooth(96, seed, 0.012, 4), cl = 0.82 + 0.18 * rng(seed + 1)(), pn = smooth(96, seed + 2, 0.07, 3);
  const F = DEM.map((v, t) => Math.round(v * f * (1 + nz[t])));
  const lo = F.map((v, t) => Math.round(v * (1 - 0.022 - (0.012 * t) / 96)));
  const hi = F.map((v, t) => Math.round(v * (1 + 0.022 + (0.012 * t) / 96)));
  const hh = (t: number) => t / 4 + 0.125;
  const solar = F.map((_, t) => Math.round(solarH(hh(t), cl)));
  const wind = F.map((_, t) => Math.round(windH(hh(t), isToday ? 1 : 1.08)));
  const hydro = F.map((_, t) => Math.round(hydroH(hh(t))));
  const price = F.map((_, t) => Math.round(clamp(interp(PK, hh(t)) * (1 + pn[t]), 1500, 10000)));
  const dc: DC = {};
  PLANTS.forEach((p) => (dc[p.name] = F.map(() => p.dc)));
  if (isToday) for (let t = 58; t < 96; t++) dc["STATE TPS-2"][t] = 650;
  else for (let t = 0; t < 40; t++) dc["STATE TPS-2"][t] = 650;
  let act: Series = F.map(() => null), rev: Series = F.map(() => null), dem = F, rtm = price;
  if (isToday) {
    const an = smooth(96, seed + 3, 0.02, 2);
    act = F.map((v, t) => (t <= nowB ? Math.round(v * (1 + an[t] + 0.01)) : null));
    const a0 = act[nowB] as number;
    const bias = (a0 - F[nowB]) / F[nowB];
    rev = F.map((v, t) => (t > nowB ? Math.round(v * (1 + bias * Math.exp(-(t - nowB) / 16))) : null));
    rev[nowB] = a0;
    dem = F.map((_, t) => (t <= nowB ? (act[t] as number) : (rev[t] as number)));
    const rn = smooth(96, seed + 4, 0.09, 2);
    rtm = price.map((p, t) => Math.round(clamp(p * (1 + rn[t]), 1500, 10000)));
  }
  const re = solar.map((s, t) => s + wind[t] + hydro[t]);
  const o = optimise(dem, re, isToday ? rtm : price, dc);
  const layers = [
    F.map((_, t) => catSum(dc, "State", t)), F.map((_, t) => catSum(dc, "ISGS", t)),
    F.map((_, t) => catSum(dc, "IPP", t)), hydro, wind, solar,
  ];
  const avail = F.map((_, t) => sum(layers.map((l) => l[t])));
  return { F, lo, hi, act, rev, dem, solar, wind, hydro, re, price, rtm, dc, o, layers, avail };
}
export const TODAY = makeDay(11, 1, true);
export const TOM = makeDay(23, 1.015, false);

/* ---------- aggregated horizons ---------- */
export type Agg = {
  x: string[]; xt: string[]; F: number[]; lo: number[]; hi: number[]; layers: number[][];
  avail: number[]; gap: number[]; price: number[];
  days?: Date[]; tx?: string[]; tbuy?: number[]; tprice?: number[];
  name?: string; nd?: number; wx?: string[]; wbuy?: number[]; wprice?: number[];
};
function aggBuild(x: string[], xt: string[], peak: number[], band: number, layers: number[][], price: number[]): Agg {
  const avail = x.map((_, i) => sum(layers.map((l) => l[i])));
  const gap = x.map((_, i) => Math.round(avail[i] - peak[i]));
  return {
    x, xt, F: peak, lo: peak.map((v) => Math.round(v * (1 - band))), hi: peak.map((v) => Math.round(v * (1 + band))),
    layers, avail, gap, price,
  };
}
function mkWeek(): Agg {
  const x: string[] = [], xt: string[] = [], F: number[] = [], L: number[][] = SRC.map(() => []), P: number[] = [];
  const nz = smooth(168, 41, 0.02, 3);
  for (let d = 1; d <= 7; d++) {
    const dt = addDays(NOW, d), we = dt.getDay() === 0 ? 0.9 : dt.getDay() === 6 ? 0.95 : 1;
    const cl = 0.8 + 0.2 * rng(d * 7)(), g = 1.01 + 0.003 * d;
    for (let h = 0; h < 24; h++) {
      const i = (d - 1) * 24 + h, base = avg(DEM.slice(h * 4, h * 4 + 4));
      x.push(h === 0 ? DAY[dt.getDay()] + " " + dt.getDate() : String(h).padStart(2, "0"));
      xt.push(dLabel(dt) + " " + String(h).padStart(2, "0") + ":00");
      F.push(Math.round(base * we * g * (1 + nz[i])));
      const hh = h + 0.5;
      L[0].push(2000 + (d === 3 || d === 4 ? -450 : 0)); L[1].push(3520); L[2].push(1250);
      L[3].push(Math.round(hydroH(hh))); L[4].push(Math.round(windH(hh, 0.9 + (0.1 * d) / 7)));
      L[5].push(Math.round(solarH(hh, cl)));
      P.push(Math.round(clamp(interp(PK, hh) * (0.97 + 0.01 * d), 1500, 10000)));
    }
  }
  const w = aggBuild(x, xt, F, 0.035, L, P);
  w.days = Array.from({ length: 7 }, (_, d) => addDays(NOW, d + 1));
  w.tx = w.days.map(dLabel);
  w.tbuy = w.days.map((_, d) => Math.round(-avg(w.gap.slice(d * 24, d * 24 + 24)) * 0.6));
  w.tprice = w.days.map((_, d) => Math.round(avg(P.slice(d * 24, d * 24 + 24)) * 1.04));
  return w;
}
function mkMonth(): Agg {
  const s = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);
  const nd = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate();
  const sf = SEASON[s.getMonth()] / SEASON[NOW.getMonth()];
  const x: string[] = [], xt: string[] = [], F: number[] = [], L: number[][] = SRC.map(() => []), P: number[] = [];
  const nz = smooth(nd, 77, 0.025, 2);
  for (let d = 0; d < nd; d++) {
    const dt = addDays(s, d), we = dt.getDay() === 0 ? 0.92 : 1;
    x.push(String(dt.getDate())); xt.push(dLabel(dt));
    F.push(Math.round(12931 * sf * we * (1 + nz[d])));
    L[0].push(2000 - (d >= 9 && d <= 15 ? 450 : 0)); L[1].push(3520 - (d >= 20 && d <= 24 ? 800 : 0)); L[2].push(1250);
    L[3].push(Math.round(650 * (s.getMonth() >= 5 && s.getMonth() <= 8 ? 1.5 : 0.9)));
    L[4].push(Math.round(520 + 60 * Math.sin(d))); L[5].push(Math.round(2050 * (0.85 + 0.1 * Math.cos(d / 3))));
    P.push(Math.round(7200 + 900 * Math.sin(d / 4)));
  }
  const m = aggBuild(x, xt, F, 0.05, L, P);
  m.name = MON[s.getMonth()] + " " + s.getFullYear(); m.nd = nd;
  m.wx = []; m.wbuy = []; m.wprice = [];
  for (let k = 0; k * 7 < nd; k++) {
    const a = k * 7, b = Math.min(nd, a + 7);
    m.wx.push("W" + (k + 1) + " (" + (a + 1) + "–" + b + ")");
    m.wbuy.push(Math.round(-avg(m.gap.slice(a, b)) * 0.8));
    m.wprice.push(Math.round(avg(P.slice(a, b)) * 0.96));
  }
  return m;
}
function mkYear(): Agg {
  const x: string[] = [], xt: string[] = [], F: number[] = [], L: number[][] = SRC.map(() => []), P: number[] = [];
  const base = 12931 / SEASON[NOW.getMonth()];
  for (let k = 1; k <= 12; k++) {
    const dt = new Date(NOW.getFullYear(), NOW.getMonth() + k, 1), mo = dt.getMonth(), mons = mo >= 5 && mo <= 8;
    x.push(MON[mo] + " '" + String(dt.getFullYear()).slice(2)); xt.push(MON[mo] + " " + dt.getFullYear());
    F.push(Math.round(base * SEASON[mo] * (1 + (0.05 * k) / 12)));
    L[0].push(mons ? 1650 : 2000); L[1].push(3520 + (k > 6 ? 400 : 0)); L[2].push(1250);
    L[3].push(mons ? 1350 : 650); L[4].push(mons ? 1150 : 560);
    L[5].push(Math.round(2100 * (mons ? 0.72 : mo >= 2 && mo <= 4 ? 1.12 : 0.95) * (1 + (0.08 * k) / 12)));
    P.push(Math.round(mo >= 3 && mo <= 5 ? 9400 : mons ? 7600 : 6200));
  }
  return aggBuild(x, xt, F, 0.06, L, P);
}
function mkLong(yr: Agg): Agg {
  const x: string[] = [], xt: string[] = [], F: number[] = [], L: number[][] = [...SRC.map(() => []), []], P: number[] = [];
  const f0 = Math.max(...yr.F);
  for (let k = 1; k <= 10; k++) {
    const fy = fyNow + k;
    x.push("FY" + String(fy).slice(2)); xt.push("FY " + (fy - 1) + "–" + String(fy).slice(2));
    F.push(Math.round(f0 * Math.pow(1.058, k)));
    L[0].push(k >= 5 ? 1600 : 2000); L[1].push(3520 + (k >= 3 ? 600 : 0) + (k >= 7 ? 660 : 0));
    L[2].push(1250 - (k >= 6 ? 250 : 0)); L[3].push(650 + (k >= 4 ? 300 : 0));
    L[4].push(Math.round(560 * Math.pow(1.12, k))); L[5].push(Math.round(2100 * Math.pow(1.16, k)));
    L[6].push(k >= 3 ? Math.round(250 * (k - 2) * 1.3) : 0);
    P.push(Math.round(5200 - 120 * k));
  }
  return aggBuild(x, xt, F, 0.08, L, P);
}
export const WK = mkWeek(), MO = mkMonth(), YR = mkYear(), LT = mkLong(YR);

/* ---------- real-time window: 2 h back, 1 h ahead, 5-min ---------- */
export type DRData = {
  x: string[]; xt: string[]; fc: number[]; act: Series; sch: number[]; av: number[];
  gap: number[]; tgt: number[]; ach: Series; dev: Series; nowI: number;
};
function mkDR(): DRData {
  const x: string[] = [], xt: string[] = [], fc: number[] = [], act: Series = [], sch: number[] = [], av: number[] = [];
  const gap: number[] = [], tgt: number[] = [], ach: Series = [], dev: Series = [];
  const nz = smooth(36, 91, 0.012, 2);
  let nowI = 0;
  for (let k = 0; k < 36; k++) {
    const m = nowMin - 120 + k * 5, t = ((m % 1440) + 1440) % 1440, b = t / 15, b0 = Math.floor(b) % 96, b1 = (b0 + 1) % 96, fr = b - Math.floor(b);
    const f = Math.round(TODAY.F[b0] * (1 - fr) + TODAY.F[b1] * fr);
    x.push(hm(m)); xt.push(hm(m) + " IST"); fc.push(f);
    const past = k <= 24;
    if (k === 24) nowI = k;
    const spike = k >= 17 ? 0.028 * Math.min(1, (k - 16) / 5) : 0;
    const a = past ? Math.round(f * (1 + nz[k] + spike)) : null;
    act.push(a); sch.push(Math.round(f * 1.004)); av.push(Math.round(f * 1.004 + 140));
    const g = past ? sch[k] - (a as number) : Math.round(sch[k] - f * (1 + spike * 0.6));
    gap.push(g);
    const tg = Math.max(0, -g - 60);
    tgt.push(tg); ach.push(past ? Math.round(tg * 0.86) : null); dev.push(past ? (a as number) - sch[k] : null);
  }
  return { x, xt, fc, act, sch, av, gap, tgt, ach, dev, nowI };
}
export const DR = mkDR();

/* ---------- catalog ---------- */
export type ModId = "demand" | "supply" | "network" | "mi" | "opt" | "trade" | "reports" | "analytics";
export type TfId = "dr" | "id" | "da" | "wk" | "mo" | "yr" | "lt";

export const MODS: { id: ModId; name: string; sub: string; about: string; question: string }[] = [
  { id: "demand", name: "Demand", sub: "Load forecast with P10–P90 band",
    question: "How much power will our consumers need?",
    about: "Predicts consumer load for each time block using weather, calendar and past demand. The shaded band shows the likely range: real demand should land inside it 8 times out of 10." },
  { id: "supply", name: "Supply Availability", sub: "Declared capacity incl. renewables",
    question: "How much power can we get from our own contracts?",
    about: "Adds up what every contracted plant has declared it can deliver (thermal, central, IPP) plus forecast solar, wind and hydro. Outages reduce the stack." },
  { id: "network", name: "Network", sub: "GNA & TGNA · down feeders & constraints",
    question: "How much headroom does the grid have to deliver it?",
    about: "Tracks General Network Access (GNA) and Temporary GNA (TGNA) corridor limits against actual drawal, plus feeder outages, transmission (ICT) loading and substation/voltage health across the grid." },
  { id: "mi", name: "Market Intelligence", sub: "Price & probable market volume",
    question: "What will power cost on the exchange?",
    about: "Forecasts the exchange clearing price (MCP) with a P10–P90 range and how much volume is likely to clear (MCV), so bids can be sized and priced well." },
  { id: "opt", name: "Optimization & Scheduling", sub: "Merit order · gap position",
    question: "Which plants should run, and what's left over?",
    about: "Schedules plants cheapest-first (merit order), replaces costly plants with cheaper market power, and shows the remaining gap: deficit to buy or surplus to sell." },
  { id: "trade", name: "Trading Strategy", sub: "Market bids by horizon",
    question: "What should we buy or sell, where and at what price?",
    about: "Turns the gap into bids for the right market: demand response in real time, RTM intra-day, DAM day-ahead, TAM weekly, DEEP tenders monthly and yearly, PPAs long term." },
  { id: "reports", name: "Reports", sub: "Performance & settlement",
    question: "How did we perform?",
    about: "Operational, commercial and performance reports: demand accuracy, outages, trade profit, shift performance, plant load factor and renewables." },
  { id: "analytics", name: "Analytics", sub: "Cost, accuracy & trends",
    question: "What is our power really costing us?",
    about: "Breaks the cost of power into fixed, own-generation and market components, compares the average ₹/kWh with the regulator-approved (ARR) rate, and flags anomalies." },
];
export const DRNAME: Record<ModId, string> = {
  demand: "Real-time Demand", supply: "Real-time Supply", network: "Real-time Network", opt: "Gap Analysis", trade: "Demand Response",
  reports: "DSM Reports", mi: "Real-time Market", analytics: "Real-time Analytics",
};
export const TFS: { id: TfId; name: string; short: string; hz: string; span: string }[] = [
  { id: "dr", name: "Real-time", short: "Now", hz: "Rolling 3 h · 5-min SCADA", span: "3 hours" },
  { id: "id", name: "Intra-day", short: "Today", hz: "Today · 96 blocks", span: "today" },
  { id: "da", name: "Day-ahead", short: "D+1", hz: "Tomorrow · 96 blocks", span: "tomorrow" },
  { id: "wk", name: "Week ahead", short: "7 days", hz: "D+1 to D+7 · hourly", span: "7 days" },
  { id: "mo", name: "Month ahead", short: "Month", hz: MO.name + " · daily", span: "1 month" },
  { id: "yr", name: "Year ahead", short: "Year", hz: YR.xt[0] + " – " + YR.xt[11], span: "12 months" },
  { id: "lt", name: "Long term", short: "10 yrs", hz: LT.x[0] + " – " + LT.x[9] + " · yearly", span: "10 years" },
];
export const CAD: Record<ModId, string[]> = {
  demand: ["Every 15 min", "Every 15 min", "Daily before 10 am", "Daily", "Weekly", "Monthly", "Yearly"],
  supply: ["Every 15 min", "Every 15 min", "On every change by plants", "Daily", "Weekly", "Monthly", "Yearly"],
  network: ["Live SCADA (5 min)", "Every 15 min", "Daily SLDC / RLDC", "Weekly outage plan", "Monthly GNA review", "Annual transmission plan", "10-year network plan"],
  opt: ["Every 15 min", "Every 15 min", "On every change by plants", "Daily", "Weekly", "Monthly", "Yearly"],
  trade: ["Real time", "RTM market", "DAM market", "TAM market", "DEEP portal", "DEEP portal", "PPA"],
  reports: ["DSM · every 15 min", "All reports", "All reports", "As required", "As required", "As required", "As required"],
  mi: ["Every 15 min (RTM)", "Every 15 min (RTM)", "Daily before 10 am", "Daily", "Weekly", "Monthly", "Yearly"],
  analytics: ["Every 5 min", "Every 15 min", "Daily", "Daily", "Weekly", "Monthly", "Yearly"],
};
export const MARKET: Record<TfId, string> = {
  dr: "Demand response", id: "RTM", da: "DAM", wk: "TAM", mo: "DEEP (month)", yr: "DEEP (year)", lt: "Long-term PPA",
};
export const REPORTS = [
  { id: "dp", name: "Demand performance", group: "Operational" }, { id: "sp", name: "Supply", group: "Operational" },
  { id: "po", name: "Plant outages", group: "Operational" }, { id: "op", name: "Optimization", group: "Operational" },
  { id: "ta", name: "Trade analysis", group: "Commercial" }, { id: "tp", name: "Trade profit", group: "Commercial" },
  { id: "sh", name: "Shift performance", group: "Performance" }, { id: "plf", name: "Plant load factor", group: "Performance" },
  { id: "re", name: "RE analysis", group: "Performance" },
];
export const DR_REPORTS = [
  { id: "dsm", name: "DSM deviation", group: "Real-time" }, { id: "drc", name: "DR compliance", group: "Real-time" },
  { id: "sh", name: "Shift performance", group: "Performance" },
];
export const ALL_REPORTS = [...REPORTS, DR_REPORTS[0], DR_REPORTS[1]];

export const tfIdx = (id: TfId) => TFS.findIndex((t) => t.id === id);
export const tfName = (id: TfId) => TFS[tfIdx(id)].name;
// Module names are fixed and no longer vary by horizon (the "All modules" and "Planning horizon"
// menus are independent). The optional tf is kept so existing call sites compile unchanged.
export const modName = (m: ModId, _tf?: TfId) => MODS.find((x) => x.id === m)!.name;
export const isTf = (v: unknown): v is TfId => TFS.some((t) => t.id === v);
export const isMod = (v: unknown): v is ModId => MODS.some((m) => m.id === v);
export const is96f = (tf: TfId) => tf === "id" || tf === "da";
export const dayOf = (tf: TfId) => (tf === "id" ? TODAY : TOM);
export const AGG: Record<string, Agg> = { wk: WK, mo: MO, yr: YR, lt: LT };
export const ptH: Record<string, number> = { wk: 1, mo: 24 * 0.72, yr: 730 * 0.68, lt: 8760 * 0.66 };
export const layerCfg = (ls: number[][]) =>
  ls.map((v, i) => ({ name: i < 6 ? SRC[i][0] : "Storage (BESS/PSP)", color: i < 6 ? SRC[i][1] : "--c-store", v }));
export const MPS = [1.2, 1.9, 2.8, 3.6, 4.5, 5.8, 7.5];
export const TGT = [2, 3, 3, 4, 5, 6, 8];
export const ARR_RATE = 5.1;
export const sliceNow = <T,>(a: T[]) => a.slice(Math.max(0, nowB - 8), nowB + 4);
export const todayMape = () => avg(TODAY.act.map((a, t) => (isN(a) ? (Math.abs(a - TODAY.F[t]) / a) * 100 : null)));
