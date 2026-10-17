/* UP DC Demand Calendar — Month section.
 *
 * Ported from the standalone prototype (Downloads/UP DC Demand Calendar) into the EPM app.
 * Shown for the Demand module at the Month horizon. Real UP declared-capacity / demand data
 * (Apr 2018 – Apr 2019) lives in public/dc and is fetched at runtime. Five modes:
 *   dem   — demand met per block (calendar grid)
 *   src   — a chosen plant / category per block (calendar grid; plant files load on demand)
 *   stack — declared-capacity supply stack + demand line (calendar grid)
 *   sur   — surplus / deficit per block (calendar grid)
 *   mheat — blockwise surplus / deficit heatmap for the whole month
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./DemandCalendar.css";

/* ---------- data shapes ---------- */
type Data = {
  dates: string[];
  cats: string[];
  plants: string[];
  plantType: Record<string, string>;
  C: number[][][]; // [day][category][96]
  P: number[][][]; // [day][plantGroup][96]
  dem: number[][]; // [day][96]
  av: number[][]; // [day][96]
};
type PlantInfo = { n: string; t: string; f: string; e: number; nz: number };
type View = "cat" | "plant";
export type Mode = "dem" | "src" | "stack" | "sur" | "mheat";

const COLS = ["--dc-s1", "--dc-s2", "--dc-s3", "--dc-s4", "--dc-s5", "--dc-s6", "--dc-s7", "--dc-s8"];
const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const T2C: Record<string, number> = { ISGS: 0, UPRVUNL: 1, "STATE IPP": 2, LTOA: 3, UPJVNL: 4, CPP: 5, MTOA: 6, STOA: 6, "RE/URS/Exchange": 7 };

const cssv = (n: string) => `var(${n})`;
const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
const kf = (v: number) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + "k" : fmt(v));
const bt = (b: number) => { const m = b * 15; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const base = import.meta.env.BASE_URL || "/";

// Set by the Year grid when a month name is clicked; read once by the Month view on mount so the
// jump lands on that month. Kept out of the URL to avoid widening the router's search schema.
let pendingMonthJump: string | null = null;

const EMPTY_SET: Set<number> = new Set();
const DEF_SRCINFO = () => ({ name: "Total supply (DC)", fill: cssv("--dc-s1"), op: 0.9, line: cssv("--dc-text2") });

const ALL_MODES: Mode[] = ["dem", "src", "stack", "sur", "mheat"];
const MODE_LABEL: Record<Mode, string> = { dem: "Demand", src: "Plant / category", stack: "Supply stack", sur: "Surplus / deficit", mheat: "Deficit heatmap" };
// Which calendar modes belong to each Planning-horizon module (plus its default mode and page label):
// demand data → Demand, supply data → Supply Availability, surplus/deficit → Optimization. Overview keeps all.
export const CAL_SETS: Record<string, { modes: Mode[]; def: Mode; label: string }> = {
  overview: { modes: ALL_MODES, def: "stack", label: "Demand calendar" },
  demand: { modes: ["dem"], def: "dem", label: "Demand calendar" },
  supply: { modes: ["stack", "src"], def: "stack", label: "Supply calendar" },
  opt: { modes: ["sur", "mheat"], def: "sur", label: "Surplus / deficit calendar" },
};

function niceStep(r: number, n: number) {
  const s = r / n, p = Math.pow(10, Math.floor(Math.log10(s || 1))), f = s / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

/* ---------- derived series helpers (pure) ---------- */
const sur = (D: Data, i: number) => D.av[i].map((v, b) => v - D.dem[i][b]);

function dayStats(D: Data, i: number) {
  const dem = D.dem[i], av = D.av[i];
  let pk = 0, sb = 0, sm = Infinity;
  dem.forEach((v, b) => { if (v > dem[pk]) pk = b; const s = av[b] - v; if (s < sm) { sm = s; sb = b; } });
  return { pk, sb, sm };
}
function sStats(a: number[]) {
  let pk = 0, mn = 0, sum = 0;
  a.forEach((v, b) => { if (v > a[pk]) pk = b; if (v < a[mn]) mn = b; sum += v; });
  return { pk, mn, avg: sum / 96, mu: sum * 0.00025 };
}
function stacks(S: number[][], off: Set<number>) {
  const pT = new Array(96).fill(0), nT = new Array(96).fill(0);
  const L: { k: number; p: [number[], number[]]; n: [number[], number[]] }[] = [];
  S.forEach((a, k) => {
    if (off.has(k)) return;
    const p0 = pT.slice(), n0 = nT.slice();
    a.forEach((v, b) => { if (v > 0) pT[b] += v; else nT[b] += v; });
    L.push({ k, p: [p0, pT.slice()], n: [n0, nT.slice()] });
  });
  return { L, pT, nT };
}

/* ---------- SVG path builders ---------- */
type Geom = { x: (b: number) => number; y: (v: number) => number };
const areaPath = (lo: number[], hi: number[], g: Geom) => {
  let d = "M" + g.x(0) + "," + g.y(hi[0]);
  for (let b = 1; b < 96; b++) d += "L" + g.x(b) + "," + g.y(hi[b]);
  for (let b = 95; b >= 0; b--) d += "L" + g.x(b) + "," + g.y(lo[b]);
  return d + "Z";
};
const linePath = (a: number[], g: Geom) => a.map((v, b) => (b ? "L" : "M") + g.x(b) + "," + g.y(v)).join("");
const fillToZero = (a: number[], g: Geom) => {
  let d = "M" + g.x(0) + "," + g.y(0);
  a.forEach((v, b) => (d += "L" + g.x(b) + "," + g.y(v)));
  return d + "L" + g.x(95) + "," + g.y(0) + "Z";
};

/* ---------- the big component ---------- */
export function DemandCalendar({ section = "month", modes = ALL_MODES, defaultMode = "stack" }: { section?: "month" | "year"; modes?: Mode[]; defaultMode?: Mode }) {
  const [D, setD] = useState<Data | null>(null);
  const [PI, setPI] = useState<PlantInfo[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(base + "dc/data.json").then((r) => r.json()),
      fetch(base + "dc/pidx.json").then((r) => r.json()),
    ])
      .then(([d, pi]) => { if (alive) { setD(d); setPI(pi); } })
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, []);

  if (err) return <p className="dc-note">Could not load demand-calendar data. Reload the page to try again.</p>;
  if (!D || !PI) return <p className="dc-note">Loading demand calendar…</p>;
  return section === "year" ? <YearView D={D} PI={PI} modes={modes} defaultMode={defaultMode} /> : <Calendar D={D} PI={PI} modes={modes} defaultMode={defaultMode} />;
}

function Calendar({ D, PI, modes, defaultMode, initialMonthKey }: { D: Data; PI: PlantInfo[]; modes: Mode[]; defaultMode: Mode; initialMonthKey?: string }) {
  const months = useMemo(() => [...new Set(D.dates.map((d) => d.slice(0, 7)))], [D]);

  const [m, setM] = useState(() => {
    if (initialMonthKey) { const k = months.indexOf(initialMonthKey); if (k >= 0) return k; }
    if (pendingMonthJump) { const k = months.indexOf(pendingMonthJump); pendingMonthJump = null; if (k >= 0) return k; }
    return months.length - 1;
  });
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [view, setView] = useState<View>("cat");
  const [src, setSrc] = useState("tot");
  const [demOn, setDemOn] = useState(true);
  const [offCat, setOffCat] = useState<number[]>([]);
  const [offPlant, setOffPlant] = useState<number[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [plData, setPlData] = useState<Record<number, number[][]>>({});
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);

  const off = useMemo(() => new Set(view === "cat" ? offCat : offPlant), [view, offCat, offPlant]);
  const toggleOff = (k: number) => {
    const setter = view === "cat" ? setOffCat : setOffPlant;
    setter((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const isSingle = mode === "dem" || mode === "src";
  const isSur = mode === "sur" || mode === "mheat";

  const mk = months[m];
  const idx = useMemo(() => D.dates.map((d, i) => (d.startsWith(mk) ? i : -1)).filter((i) => i >= 0), [D, mk]);

  const names = view === "cat" ? D.cats : D.plants.map((p) => (D.plantType[p] ? p + " (" + D.plantType[p] + ")" : p));
  const series = useCallback((i: number) => (view === "cat" ? D.C[i] : D.P[i]), [D, view]);

  /* selected-source (src mode) helpers */
  const srcInfo = useCallback(() => {
    if (src === "tot") return { name: "Total supply (DC)", fill: cssv("--dc-s1"), op: 0.9, line: cssv("--dc-text2"), plant: null as number | null };
    if (src[0] === "c") { const c = +src.slice(1); return { name: D.cats[c], fill: cssv(COLS[c]), op: 0.9, line: cssv("--dc-text2"), plant: null as number | null }; }
    const p = PI[+src.slice(1)];
    return { name: p.n + " (" + p.t + ")", fill: cssv(COLS[T2C[p.t] ?? 0]), op: 0.9, line: cssv("--dc-text2"), plant: +src.slice(1) };
  }, [src, D, PI]);
  const srcSer = useCallback((i: number): number[] | null => {
    if (src === "tot") return D.av[i];
    if (src[0] === "c") return D.C[i][+src.slice(1)];
    const a = plData[+src.slice(1)];
    return a ? a[i] : null;
  }, [src, D, plData]);

  /* load plant data when src is a plant and not cached */
  const plantKey = src[0] === "p" ? +src.slice(1) : null;
  useEffect(() => {
    if (plantKey == null || plData[plantKey]) return;
    let alive = true;
    fetch(base + "dc/" + PI[plantKey].f)
      .then((r) => r.json())
      .then((a) => alive && setPlData((prev) => ({ ...prev, [plantKey]: a })))
      .catch(() => { /* leave uncached; cell shows empty */ });
    return () => { alive = false; };
  }, [plantKey, plData, PI]);

  const srcLoading = isSingle && plantKey != null && !plData[plantKey];

  /* shared y-range across the whole month */
  const range = useMemo((): [number, number] => {
    if (isSingle) {
      let mn = 0, mx = 0;
      idx.forEach((i) => { const a = mode === "dem" ? D.dem[i] : srcSer(i); if (!a) return; mn = Math.min(mn, ...a); mx = Math.max(mx, ...a); });
      return [mn, mx || 1];
    }
    if (isSur) {
      let mn = 0, mx = 0;
      idx.forEach((i) => { const a = sur(D, i); mn = Math.min(mn, ...a); mx = Math.max(mx, ...a); });
      return [mn, mx];
    }
    let mx = 0, mn = 0;
    idx.forEach((i) => { const s = stacks(series(i), off); mx = Math.max(mx, ...s.pT, demOn ? Math.max(...D.dem[i]) : 0); mn = Math.min(mn, ...s.nT); });
    return [mn, mx];
  }, [idx, mode, isSingle, isSur, D, srcSer, series, off, demOn]);

  /* tooltip positioning (clamped to viewport) */
  const showTip = useCallback((e: { clientX: number; clientY: number }, html: string) => {
    const vw = window.innerWidth, vh = window.innerHeight, tw = 230, th = 180;
    let lx = e.clientX + 16; if (lx + tw > vw - 8) lx = e.clientX - tw - 16; if (lx < 8) lx = 8;
    const ly = Math.max(8, Math.min(e.clientY - th / 2, vh - th - 8));
    setTip({ x: lx, y: ly, html });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  /* ----- calendar grid layout ----- */
  const y = +mk.slice(0, 4), mo = +mk.slice(5) - 1;
  const first = (new Date(y, mo, 1).getDay() + 6) % 7, nd = new Date(y, mo + 1, 0).getDate();
  const slots: (number | null)[] = new Array(35).fill(null);
  for (let d = 1; d <= nd; d++) { let p = first + d - 1; if (p >= 35) p -= 35; slots[p] = d; }

  const monthLabel = MON[mo] + " " + mk.slice(0, 4);

  return (
    <div className="dc-root">
      <Controls
        months={months} m={m} setM={setM} monthLabel={monthLabel}
        mode={mode} setMode={setMode} view={view} setView={setView}
        src={src} setSrc={setSrc} D={D} PI={PI} modes={modes}
      />

      <Kpis D={D} idx={idx} mode={mode} isSingle={isSingle} srcSer={srcSer} series={series} off={off} />

      {mode === "mheat" ? (
        <Heatmap D={D} idx={idx} mk={mk} picked={openDay} setPicked={setOpenDay} showTip={showTip} hideTip={hideTip} />
      ) : (
        <section className="dc-card">
          <Legend
            mode={mode} isSingle={isSingle} isSur={isSur} names={names} off={off}
            toggleOff={toggleOff} demOn={demOn} setDemOn={setDemOn} srcInfo={srcInfo}
          />
          {srcLoading ? (
            <p className="dc-note">Loading plant data…</p>
          ) : (
            <div className="dc-cal-scroll">
              <div className="dc-cal">
                {DOW.map((d) => <div key={d} className="dc-dow">{d}</div>)}
                {slots.map((d, p) => {
                  if (d == null) return <div key={"e" + p} className="dc-cell empty" />;
                  const ds = `${mk}-${String(d).padStart(2, "0")}`;
                  const i = D.dates.indexOf(ds);
                  if (i < 0) return (
                    <div key={"n" + p} className="dc-cell empty">
                      <div className="top"><span className="dn">{d}</span><span className="pk">no data</span></div>
                    </div>
                  );
                  return (
                    <DayCell
                      key={ds} D={D} i={i} d={d} wrapped={p < first} monIdx={mo}
                      mode={mode} view={view} off={off} demOn={demOn}
                      srcSer={srcSer} srcInfo={srcInfo} series={series} names={names}
                      range={range} picked={openDay === i} onClick={() => setOpenDay(i)}
                      showTip={showTip} hideTip={hideTip}
                    />
                  );
                })}
              </div>
            </div>
          )}
          <p className="dc-note">
            {isSingle ? "Pk = highest block of the day · chip = day energy (MU)" : "Chip = tightest block (blue surplus, red deficit)"}
            {" · hover a day for block values · click a day to open it full size · overflow days of 6-week months sit in row 1."}
          </p>
        </section>
      )}

      {openDay != null && (
        <DayModal
          D={D} i={openDay} mode={mode} view={view} off={off} demOn={demOn}
          srcSer={srcSer} srcInfo={srcInfo} series={series} names={names}
          onClose={() => setOpenDay(null)} setDay={setOpenDay}
          showTip={showTip} hideTip={hideTip}
        />
      )}

      {tip && (
        <div className="dc-tip" style={{ left: tip.x, top: tip.y }} dangerouslySetInnerHTML={{ __html: tip.html }} />
      )}
    </div>
  );
}

/* ---------- controls ---------- */
function Controls({ months, m, setM, monthLabel, mode, setMode, view, setView, src, setSrc, D, PI, modes }: {
  months: string[]; m: number; setM: (n: number) => void; monthLabel: string;
  mode: Mode; setMode: (x: Mode) => void; view: View; setView: (v: View) => void;
  src: string; setSrc: (s: string) => void; D: Data; PI: PlantInfo[]; modes: Mode[];
}) {
  const srcOptions = useMemo(() => {
    const types = [...new Set(PI.map((p) => p.t))];
    return { cats: D.cats, types: types.map((t) => ({ t, plants: PI.map((p, k) => ({ ...p, k })).filter((p) => p.t === t && p.nz > 0) })).filter((g) => g.plants.length) };
  }, [D, PI]);

  return (
    <div className="dc-controls">
      <div className="dc-monthbar">
        <button aria-label="Previous month" disabled={m === 0} onClick={() => setM(Math.max(0, m - 1))}>◀</button>
        <select aria-label="Month" value={m} onChange={(e) => setM(+e.target.value)}>
          {months.map((mm, k) => <option key={mm} value={k}>{MON[+mm.slice(5) - 1] + " " + mm.slice(0, 4)}</option>)}
        </select>
        <button aria-label="Next month" disabled={m === months.length - 1} onClick={() => setM(Math.min(months.length - 1, m + 1))}>▶</button>
      </div>

      {modes.length > 1 && (
        <div className="dc-seg" role="group" aria-label="Chart type">
          {modes.map((id) => (
            <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{MODE_LABEL[id]}</button>
          ))}
        </div>
      )}

      {mode === "src" && (
        <select className="dc-srcsel" aria-label="Plant or category" value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="tot">Total supply (DC)</option>
          <optgroup label="Categories">
            {srcOptions.cats.map((c, k) => <option key={c} value={"c" + k}>{c}</option>)}
          </optgroup>
          {srcOptions.types.map((g) => (
            <optgroup key={g.t} label={g.t + " plants"}>
              {g.plants.map((p) => <option key={p.k} value={"p" + p.k}>{p.n}</option>)}
            </optgroup>
          ))}
        </select>
      )}

      {mode === "stack" && (
        <div className="dc-seg" role="group" aria-label="Stack by">
          <button aria-pressed={view === "cat"} onClick={() => setView("cat")}>By source</button>
          <button aria-pressed={view === "plant"} onClick={() => setView("plant")}>Top plants</button>
        </div>
      )}

      <span className="dc-note" style={{ margin: 0 }}>{monthLabel}</span>
    </div>
  );
}

/* ---------- KPIs ---------- */
function Kpis({ D, idx, mode, isSingle, srcSer, series, off }: {
  D: Data; idx: number[]; mode: Mode; isSingle: boolean;
  srcSer: (i: number) => number[] | null; series: (i: number) => number[][]; off: Set<number>;
}) {
  const dl = (i: number) => { const d = D.dates[i]; return +d.slice(8) + " " + MON[+d.slice(5, 7) - 1].slice(0, 3); };

  const items: [string, string, string, string][] = (() => {
    if (isSingle) {
      let pk = { v: -1e9, i: 0, b: 0 }, mn = { v: 1e9, i: 0, b: 0 }, mu = 0;
      idx.forEach((i) => {
        const a = mode === "dem" ? D.dem[i] : srcSer(i); if (!a) return;
        a.forEach((v, b) => { if (v > pk.v) pk = { v, i, b }; if (v < mn.v) mn = { v, i, b }; });
        mu += a.reduce((x, c) => x + c, 0) * 0.00025;
      });
      const d2 = (o: { i: number; b: number }) => dl(o.i) + " · B" + (o.b + 1) + " · " + bt(o.b);
      return [
        ["Month peak", fmt(pk.v) + " MW", d2(pk), ""],
        ["Month minimum", fmt(mn.v) + " MW", d2(mn), ""],
        ["Average", fmt((mu * 1000) / (idx.length * 24)) + " MW", "all blocks", ""],
        ["Energy", mu.toFixed(1) + " MU", idx.length + " days", ""],
      ];
    }
    // stack / sur
    let pk = { v: 0, i: 0, b: 0 }, sm = { v: Infinity, i: 0, b: 0 }, def = 0, mu = 0, muA = 0;
    idx.forEach((i) => {
      const s = dayStats(D, i), d = D.dem[i];
      if (d[s.pk] > pk.v) pk = { v: d[s.pk], i, b: s.pk };
      if (s.sm < sm.v) sm = { v: s.sm, i, b: s.sb };
      def += D.dem[i].filter((v, b) => D.av[i][b] < v).length;
      mu += d.reduce((a, c) => a + c, 0) * 0.00025;
      muA += D.av[i].reduce((a, c) => a + c, 0) * 0.00025;
    });
    return [
      ["Month peak demand", fmt(pk.v) + " MW", dl(pk.i) + " · " + bt(pk.b), ""],
      ["Tightest block in month", (sm.v >= 0 ? "+" : "") + fmt(sm.v) + " MW", dl(sm.i) + " · " + bt(sm.b), sm.v < 0 ? "neg" : "pos"],
      ["Deficit blocks", def + " of " + idx.length * 96, (def * 0.25).toFixed(1) + " hours short", def ? "neg" : "pos"],
      ["Energy (demand / DC)", mu.toFixed(0) + " / " + muA.toFixed(0) + " MU", idx.length + " days", ""],
    ];
  })();
  // `series`/`off` are part of the stack signature but the stack KPIs read raw demand/av.
  void series; void off;

  return (
    <section className="dc-kpis">
      {items.map((k) => (
        <div className="dc-kpi" key={k[0]}>
          <div className="l">{k[0]}</div>
          <div className={"v " + k[3]}>{k[1]}</div>
          <div className="n">{k[2]}</div>
        </div>
      ))}
    </section>
  );
}

/* ---------- legend ---------- */
function Legend({ mode, isSingle, isSur, names, off, toggleOff, demOn, setDemOn, srcInfo }: {
  mode: Mode; isSingle: boolean; isSur: boolean; names: string[]; off: Set<number>;
  toggleOff: (k: number) => void; demOn: boolean; setDemOn: (b: boolean) => void;
  srcInfo: () => { name: string; fill: string };
}) {
  if (isSingle) {
    const inf = srcInfo();
    const label = mode === "dem" ? "Demand met, MW" : inf.name + ", MW";
    const fill = mode === "dem" ? cssv("--dc-sur") : inf.fill;
    return <ul className="dc-legend"><li><button aria-pressed="true" disabled><span className="dc-sw" style={{ background: fill }} />{label}</button></li></ul>;
  }
  if (isSur) {
    return (
      <ul className="dc-legend">
        <li><button aria-pressed="true" disabled><span className="dc-sw" style={{ background: cssv("--dc-sur"), opacity: 0.6 }} />Surplus (supply &gt; demand)</button></li>
        <li><button aria-pressed="true" disabled><span className="dc-sw" style={{ background: cssv("--dc-def"), opacity: 0.7 }} />Deficit (demand &gt; supply)</button></li>
      </ul>
    );
  }
  return (
    <ul className="dc-legend">
      {names.map((n, k) => (
        <li key={k}><button aria-pressed={!off.has(k)} onClick={() => toggleOff(k)}><span className="dc-sw" style={{ background: cssv(COLS[k]) }} />{n}</button></li>
      ))}
      <li><button aria-pressed={demOn} onClick={() => setDemOn(!demOn)}><span className="dc-sw line" />Demand met</button></li>
    </ul>
  );
}

/* ---------- a single day cell (local hover state → cheap re-render) ---------- */
function DayCell({ D, i, d, wrapped, monIdx, mode, view, off, demOn, srcSer, srcInfo, series, names, range, picked, onClick, showTip, hideTip }: {
  D: Data; i: number; d: number; wrapped: boolean; monIdx: number;
  mode: Mode; view: View; off: Set<number>; demOn: boolean;
  srcSer: (i: number) => number[] | null; srcInfo: () => { name: string; fill: string; op: number; line: string };
  series: (i: number) => number[][]; names: string[]; range: [number, number];
  picked: boolean; onClick: () => void;
  showTip: (e: { clientX: number; clientY: number }, html: string) => void; hideTip: () => void;
}) {
  const [hoverB, setHoverB] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 140, H = 54, mg = { l: 1, r: 1, t: 2, b: 1 };

  const isSingle = mode === "dem" || mode === "src";
  const isSur = mode === "sur";

  // y-scale
  let [ymin, ymax] = range;
  const step = niceStep(ymax - ymin || 1, 3);
  ymax = Math.ceil(ymax / step) * step; ymin = Math.floor(ymin / step) * step;
  const x = (b: number) => mg.l + (b * (W - mg.l - mg.r)) / 95;
  const yFn = (v: number) => mg.t + ((ymax - v) * (H - mg.t - mg.b)) / (ymax - ymin || 1);
  const g: Geom = { x, y: yFn };

  const dem = D.dem[i];
  const single = mode === "dem" ? dem : srcSer(i);
  const sa = sur(D, i);
  const s = dayStats(D, i);
  const ss = isSingle && single ? sStats(single) : null;

  const blockFromEvent = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    const xvb = frac * W;
    return Math.max(0, Math.min(95, Math.round(((xvb - mg.l) / (W - mg.l - mg.r)) * 95)));
  };
  const onMove = (e: React.PointerEvent) => {
    const b = blockFromEvent(e);
    setHoverB(b);
    showTip(e, tipHtml(D, i, b, { mode, view, off, series, names, srcSer, srcInfo }));
  };
  const onLeave = () => { setHoverB(null); hideTip(); };

  /* chart body */
  const body: React.ReactNode[] = [];
  const gridEls: React.ReactNode[] = [];
  for (let v = ymin; v <= ymax + 1e-6; v += step) {
    gridEls.push(<line key={"g" + v} x1={mg.l} x2={W - mg.r} y1={yFn(v)} y2={yFn(v)} stroke={v === 0 ? cssv("--dc-muted") : cssv("--dc-grid")} strokeWidth={v === 0 ? 0.6 : 1} />);
  }

  if (isSingle && single) {
    const inf = mode === "dem" ? { fill: cssv("--dc-sur"), op: 0.28, line: cssv("--dc-text") } : srcInfo();
    body.push(<path key="ar" d={fillToZero(single, g)} fill={inf.fill} fillOpacity={inf.op} />);
    body.push(<path key="ln" d={linePath(single, g)} fill="none" stroke={inf.line} strokeWidth={1.2} strokeLinejoin="round" />);
  } else if (isSur) {
    const y0 = yFn(0);
    body.push(<clipPath key="ca" id={`dc-a-${i}`}><rect x={0} y={0} width={W} height={Math.max(0, y0)} /></clipPath>);
    body.push(<clipPath key="cb" id={`dc-b-${i}`}><rect x={0} y={y0} width={W} height={Math.max(0, H - y0)} /></clipPath>);
    const ar = fillToZero(sa, g);
    body.push(<path key="arA" d={ar} fill={cssv("--dc-sur")} fillOpacity={0.35} clipPath={`url(#dc-a-${i})`} />);
    body.push(<path key="arB" d={ar} fill={cssv("--dc-def")} fillOpacity={0.45} clipPath={`url(#dc-b-${i})`} />);
    body.push(<path key="lnA" d={linePath(sa, g)} fill="none" stroke={cssv("--dc-surhi")} strokeWidth={1.2} clipPath={`url(#dc-a-${i})`} strokeLinejoin="round" />);
    body.push(<path key="lnB" d={linePath(sa, g)} fill="none" stroke={cssv("--dc-defhi")} strokeWidth={1.2} clipPath={`url(#dc-b-${i})`} strokeLinejoin="round" />);
    body.push(<line key="z" x1={mg.l} x2={W - mg.r} y1={y0} y2={y0} stroke={cssv("--dc-text2")} strokeWidth={0.6} />);
  } else {
    // stack
    const st = stacks(series(i), off);
    st.L.forEach(({ k, p, n }) => [p, n].forEach((q, qi) => {
      if (q[1].every((v, b) => v === q[0][b])) return;
      body.push(<path key={"q" + k + qi} d={areaPath(q[0], q[1], g)} fill={cssv(COLS[k])} stroke={cssv("--dc-surface")} strokeWidth={0.5} strokeLinejoin="round" />);
    }));
    if (demOn) body.push(<path key="dem" d={linePath(dem, g)} fill="none" stroke={cssv("--dc-text")} strokeWidth={1.4} strokeLinejoin="round" />);
  }

  // crosshair + dot
  let dotY: number | null = null;
  if (hoverB != null) {
    if (isSingle && single) dotY = yFn(single[hoverB]);
    else if (isSur) dotY = yFn(sa[hoverB]);
    else if (demOn) dotY = yFn(dem[hoverB]);
  }

  const chip = ss
    ? <span className="dc-chip nt">{(Math.abs(ss.mu) >= 100 ? ss.mu.toFixed(0) : ss.mu.toFixed(1)) + " MU"}</span>
    : <span className={"dc-chip" + (s.sm < 0 ? " neg" : "")}>{(s.sm >= 0 ? "+" : "") + fmt(s.sm)}</span>;
  const pk = ss && single ? "Pk " + fmt(single[ss.pk]) : "Pk " + fmt(dem[s.pk]);

  return (
    <button
      className={"dc-cell" + (wrapped ? " wrapped" : "")} aria-pressed={picked} onClick={onClick}
      aria-label={`${d} ${MON[monIdx]}: peak demand ${fmt(dem[s.pk])} MW`}
    >
      <div className="top">
        <span className="dn">{d}{wrapped && <small>{MON[monIdx].slice(0, 3)}</small>}</span>
        <span className="pk">{pk}</span>
        {chip}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerLeave={onLeave} role="img" aria-hidden>
        <g>{gridEls}</g>
        {body}
        {hoverB != null && (
          <>
            <line x1={x(hoverB)} x2={x(hoverB)} y1={mg.t} y2={H - mg.b} stroke={cssv("--dc-text2")} strokeWidth={1} strokeDasharray="3 3" />
            {dotY != null && <circle cx={x(hoverB)} cy={dotY} r={2.5} fill={cssv("--dc-text")} stroke={cssv("--dc-surface")} strokeWidth={1.5} />}
          </>
        )}
      </svg>
    </button>
  );
}

/* ---------- tooltip html ---------- */
const tail = (av: number, dem: number) => {
  const s = av - dem;
  return `<div class="r"><span>Total supply (DC)</span><b>${fmt(av)}</b></div>` +
    `<div class="r"><span>Demand met</span><b>${fmt(dem)}</b></div>` +
    `<div class="r"><span>${s < 0 ? "Deficit" : "Surplus"}</span><b class="${s < 0 ? "neg" : "pos"}">${s < 0 ? "" : "+"}${fmt(s)}</b></div>`;
};
function tipHtml(D: Data, i: number, b: number, o: {
  mode: Mode; view: View; off: Set<number>; series: (i: number) => number[][];
  names: string[]; srcSer: (i: number) => number[] | null; srcInfo: () => { name: string; fill: string };
}) {
  const d = D.dates[i], dem = D.dem[i][b], av = D.av[i][b];
  const head = `<h4>${+d.slice(8)} ${MON[+d.slice(5, 7) - 1].slice(0, 3)} · Block ${b + 1} · ${bt(b)}–${bt(b + 1)}</h4>`;
  if (o.mode === "dem" || o.mode === "src") {
    const inf = o.mode === "dem" ? { name: "Demand met", fill: cssv("--dc-sur") } : o.srcInfo();
    const v = o.mode === "dem" ? dem : (o.srcSer(i)?.[b] ?? 0);
    const bodyExtra = o.mode === "dem"
      ? "<hr>" + tail(av, dem)
      : `<hr><div class="r"><span>Share of total supply</span><b>${av ? ((v / av) * 100).toFixed(1) + "%" : "–"}</b></div>` +
        `<div class="r"><span>Total supply (DC)</span><b>${fmt(av)}</b></div><div class="r"><span>Demand met</span><b>${fmt(dem)}</b></div>`;
    return head + `<div class="r"><span><i class="sw" style="background:${inf.fill}"></i>${inf.name}</span><b>${fmt(v)}</b></div>` + bodyExtra;
  }
  if (o.mode === "sur") return head + tail(av, dem);
  // stack
  const S = o.series(i);
  let h = head;
  for (let k = S.length - 1; k >= 0; k--) {
    if (o.off.has(k)) continue;
    h += `<div class="r"><span><i class="sw" style="background:${cssv(COLS[k])}"></i>${o.names[k]}</span><b>${fmt(S[k][b])}</b></div>`;
  }
  return h + "<hr>" + tail(av, dem);
}

/* ---------- day-detail modal (big chart) ---------- */
function DayModal({ D, i, mode, view, off, demOn, srcSer, srcInfo, series, names, onClose, setDay, showTip, hideTip }: {
  D: Data; i: number; mode: Mode; view: View; off: Set<number>; demOn: boolean;
  srcSer: (i: number) => number[] | null; srcInfo: () => { name: string; fill: string; op: number; line: string };
  series: (i: number) => number[][]; names: string[];
  onClose: () => void; setDay: (i: number) => void;
  showTip: (e: { clientX: number; clientY: number }, html: string) => void; hideTip: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && i > 0) setDay(i - 1);
      else if (e.key === "ArrowRight" && i < D.dates.length - 1) setDay(i + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [i, D, onClose, setDay]);

  const d = D.dates[i];
  const title = `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  const isSingle = mode === "dem" || mode === "src";
  const single = mode === "dem" ? D.dem[i] : srcSer(i);
  const label = mode === "dem" ? "Demand met · MW"
    : mode === "src" ? srcInfo().name + " · MW"
    : mode === "sur" ? "Surplus / deficit · supply − demand, MW"
    : "Supply by source" + (view === "plant" ? " (top plants)" : "") + " · stacked declared capacity, MW · line = demand met";

  const mu = (a: number[]) => a.reduce((x, y) => x + y, 0) * 0.00025;
  const kpis: [string, string, string, string][] = (() => {
    if (isSingle && single) {
      const ss = sStats(single);
      return [
        ["Peak", fmt(single[ss.pk]) + " MW", "Block " + (ss.pk + 1) + " · " + bt(ss.pk), ""],
        ["Minimum", fmt(single[ss.mn]) + " MW", "Block " + (ss.mn + 1) + " · " + bt(ss.mn), ""],
        ["Average", fmt(ss.avg) + " MW", "96 blocks", ""],
        ["Energy", ss.mu.toFixed(1) + " MU", "Day total", ""],
      ];
    }
    const s = dayStats(D, i), dem = D.dem[i], av = D.av[i];
    const avPk = av.reduce((mm, v, b) => (v > av[mm] ? b : mm), 0);
    return [
      ["Peak demand met", fmt(dem[s.pk]) + " MW", "Block " + (s.pk + 1) + " · " + bt(s.pk), ""],
      ["Peak supply (DC)", fmt(av[avPk]) + " MW", "Block " + (avPk + 1) + " · " + bt(avPk), ""],
      ["Tightest block", (s.sm >= 0 ? "+" : "") + fmt(s.sm) + " MW", "Block " + (s.sb + 1) + " · " + bt(s.sb), s.sm < 0 ? "neg" : "pos"],
      ["Energy (demand / DC)", mu(dem).toFixed(1) + " / " + mu(av).toFixed(1) + " MU", "Day total", ""],
    ];
  })();

  return (
    <div className="dc-ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dc-modal" role="dialog" aria-modal="true" aria-label={"Demand detail for " + title}>
        <div className="dc-mhead">
          <div className="dc-monthbar">
            <button aria-label="Previous day" disabled={i === 0} onClick={() => setDay(i - 1)}>◀</button>
            <h3 style={{ minWidth: "14ch" }}>{title}</h3>
            <button aria-label="Next day" disabled={i === D.dates.length - 1} onClick={() => setDay(i + 1)}>▶</button>
          </div>
          <button onClick={onClose}>Close</button>
        </div>

        <section className="dc-kpis">
          {kpis.map((k) => (
            <div className="dc-kpi" key={k[0]}>
              <div className="l">{k[0]}</div><div className={"v " + k[3]}>{k[1]}</div><div className="n">{k[2]}</div>
            </div>
          ))}
        </section>

        <div className="dc-note" style={{ margin: "2px 0 0" }}>{label}</div>
        {isSingle && !single ? (
          <p className="dc-note">No data for this source on this day.</p>
        ) : (
          <BigDayChart
            D={D} i={i} mode={mode} off={off} demOn={demOn}
            single={single} srcInfo={srcInfo} series={series} names={names} view={view}
            showTip={showTip} hideTip={hideTip}
          />
        )}
        <p className="dc-note">Hover for block values · ← → step days · Esc closes.</p>
      </div>
    </div>
  );
}

function BigDayChart({ D, i, mode, off, demOn, single, srcInfo, series, names, view, showTip, hideTip }: {
  D: Data; i: number; mode: Mode; off: Set<number>; demOn: boolean;
  single: number[] | null; srcInfo: () => { name: string; fill: string; op: number; line: string };
  series: (i: number) => number[][]; names: string[]; view: View;
  showTip: (e: { clientX: number; clientY: number }, html: string) => void; hideTip: () => void;
}) {
  const [hoverB, setHoverB] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 960, H = 420, mg = { l: 56, r: 16, t: 20, b: 30 };

  const isSingle = mode === "dem" || mode === "src";
  const isSur = mode === "sur";
  const dem = D.dem[i], sa = sur(D, i);
  const st = isSingle || isSur ? null : stacks(series(i), off);

  // per-day range
  let lo = 0, hi = 1;
  if (isSingle && single) { lo = Math.min(0, ...single) * (Math.min(...single) < 0 ? 1.1 : 1); hi = (Math.max(0, ...single) || 1) * 1.08; }
  else if (isSur) { lo = Math.min(0, ...sa) * 1.1; hi = Math.max(0, ...sa) * 1.1 || 1; }
  else if (st) { lo = Math.min(0, ...st.nT); hi = Math.max(...st.pT, demOn ? Math.max(...dem) : 0); }

  const step = niceStep(hi - lo || 1, 5);
  const ymax = Math.ceil(hi / step) * step, ymin = Math.floor(lo / step) * step;
  const x = (b: number) => mg.l + (b * (W - mg.l - mg.r)) / 95;
  const yFn = (v: number) => mg.t + ((ymax - v) * (H - mg.t - mg.b)) / (ymax - ymin || 1);
  const g: Geom = { x, y: yFn };

  // axes
  const gridEls: React.ReactNode[] = [];
  for (let v = ymin; v <= ymax + 1e-6; v += step) {
    gridEls.push(<line key={"g" + v} x1={mg.l} x2={W - mg.r} y1={yFn(v)} y2={yFn(v)} stroke={v === 0 ? cssv("--dc-muted") : cssv("--dc-grid")} />);
    gridEls.push(<text key={"t" + v} x={mg.l - 8} y={yFn(v) + 4} textAnchor="end" className="num" fontSize={11} fill={cssv("--dc-muted")}>{v === 0 ? "0" : (v / 1000).toLocaleString("en-IN") + "k"}</text>);
  }
  const xticks: React.ReactNode[] = [];
  for (let b = 0; b < 96; b += 8) xticks.push(<text key={"x" + b} x={x(b)} y={H - 8} textAnchor={b === 0 ? "start" : "middle"} className="num" fontSize={11} fill={cssv("--dc-muted")}>{bt(b)}</text>);
  xticks.push(<text key="xend" x={x(95)} y={H - 8} textAnchor="end" className="num" fontSize={11} fill={cssv("--dc-muted")}>23:45</text>);

  const body: React.ReactNode[] = [];
  const annot: React.ReactNode[] = [];

  if (isSingle && single) {
    const inf = mode === "dem" ? { fill: cssv("--dc-sur"), op: 0.28, line: cssv("--dc-text") } : srcInfo();
    body.push(<path key="ar" d={fillToZero(single, g)} fill={inf.fill} fillOpacity={inf.op} />);
    body.push(<path key="ln" d={linePath(single, g)} fill="none" stroke={inf.line} strokeWidth={2} strokeLinejoin="round" />);
    const ss = sStats(single);
    ([[ss.pk, "Peak ", -10], [ss.mn, "Min ", 18]] as [number, string, number][]).forEach(([b, l, dy], q) => {
      if (q && single[b] === single[ss.pk]) return;
      annot.push(<circle key={"c" + l} cx={x(b)} cy={yFn(single[b])} r={4} fill={cssv("--dc-text")} stroke={cssv("--dc-surface")} strokeWidth={2} />);
      annot.push(<text key={"a" + l} x={x(b)} y={yFn(single[b]) + dy} textAnchor={b > 80 ? "end" : b < 10 ? "start" : "middle"} className="num" fontSize={12} fill={cssv("--dc-text")}>{l + fmt(single[b])}</text>);
    });
  } else if (isSur) {
    const y0 = yFn(0);
    body.push(<clipPath key="ca" id={`dcm-a`}><rect x={0} y={0} width={W} height={Math.max(0, y0)} /></clipPath>);
    body.push(<clipPath key="cb" id={`dcm-b`}><rect x={0} y={y0} width={W} height={Math.max(0, H - y0)} /></clipPath>);
    const ar = fillToZero(sa, g);
    body.push(<path key="arA" d={ar} fill={cssv("--dc-sur")} fillOpacity={0.35} clipPath="url(#dcm-a)" />);
    body.push(<path key="arB" d={ar} fill={cssv("--dc-def")} fillOpacity={0.45} clipPath="url(#dcm-b)" />);
    body.push(<path key="lnA" d={linePath(sa, g)} fill="none" stroke={cssv("--dc-surhi")} strokeWidth={2} clipPath="url(#dcm-a)" strokeLinejoin="round" />);
    body.push(<path key="lnB" d={linePath(sa, g)} fill="none" stroke={cssv("--dc-defhi")} strokeWidth={2} clipPath="url(#dcm-b)" strokeLinejoin="round" />);
    body.push(<line key="z" x1={mg.l} x2={W - mg.r} y1={y0} y2={y0} stroke={cssv("--dc-text2")} strokeWidth={1} />);
    let mn = 0; sa.forEach((v, b) => { if (v < sa[mn]) mn = b; });
    annot.push(<circle key="tc" cx={x(mn)} cy={yFn(sa[mn])} r={4} fill={sa[mn] < 0 ? cssv("--dc-defhi") : cssv("--dc-surhi")} stroke={cssv("--dc-surface")} strokeWidth={2} />);
    annot.push(<text key="ta" x={x(mn)} y={yFn(sa[mn]) + (sa[mn] < 0 ? 18 : -10)} textAnchor={mn > 80 ? "end" : mn < 10 ? "start" : "middle"} className="num" fontSize={12} fill={cssv("--dc-text")}>{"Tightest " + (sa[mn] >= 0 ? "+" : "") + fmt(sa[mn])}</text>);
  } else if (st) {
    st.L.forEach(({ k, p, n }) => [p, n].forEach((q, qi) => {
      if (q[1].every((v, b) => v === q[0][b])) return;
      body.push(<path key={"q" + k + qi} d={areaPath(q[0], q[1], g)} fill={cssv(COLS[k])} stroke={cssv("--dc-surface")} strokeWidth={1} strokeLinejoin="round" />);
    }));
    if (demOn) {
      body.push(<path key="demw" d={linePath(dem, g)} fill="none" stroke={cssv("--dc-surface")} strokeWidth={5} strokeLinejoin="round" />);
      body.push(<path key="dem" d={linePath(dem, g)} fill="none" stroke={cssv("--dc-text")} strokeWidth={2} strokeLinejoin="round" />);
      const pk = dem.indexOf(Math.max(...dem));
      annot.push(<circle key="pc" cx={x(pk)} cy={yFn(dem[pk])} r={4} fill={cssv("--dc-text")} stroke={cssv("--dc-surface")} strokeWidth={2} />);
      annot.push(<text key="pa" x={x(pk)} y={yFn(dem[pk]) - 10} textAnchor={pk > 80 ? "end" : pk < 10 ? "start" : "middle"} className="num" fontSize={12} fill={cssv("--dc-text")}>{"Peak " + fmt(dem[pk])}</text>);
    }
  }

  const blockFromEvent = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const xvb = ((e.clientX - r.left) / r.width) * W;
    return Math.max(0, Math.min(95, Math.round(((xvb - mg.l) / (W - mg.l - mg.r)) * 95)));
  };
  const onMove = (e: React.PointerEvent) => {
    const b = blockFromEvent(e); setHoverB(b);
    showTip(e, tipHtml(D, i, b, { mode, view, off, series, names, srcSer: () => single, srcInfo }));
  };
  const onLeave = () => { setHoverB(null); hideTip(); };

  let dotY: number | null = null;
  if (hoverB != null) {
    if (isSingle && single) dotY = yFn(single[hoverB]);
    else if (isSur) dotY = yFn(sa[hoverB]);
    else if (demOn) dotY = yFn(dem[hoverB]);
  }

  return (
    <div className="dc-bigwrap">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="dc-big" onPointerMove={onMove} onPointerLeave={onLeave} role="img" aria-label="Day detail chart">
        <g>{gridEls}</g>
        <g>{xticks}</g>
        {body}
        {annot}
        {hoverB != null && (
          <>
            <line x1={x(hoverB)} x2={x(hoverB)} y1={mg.t} y2={H - mg.b} stroke={cssv("--dc-text2")} strokeWidth={1} strokeDasharray="3 3" />
            {dotY != null && <circle cx={x(hoverB)} cy={dotY} r={4} fill={cssv("--dc-text")} stroke={cssv("--dc-surface")} strokeWidth={1.5} />}
          </>
        )}
      </svg>
    </div>
  );
}

/* ---------- year view (planning-horizon "Year ahead") ---------- */
type YData = { cat: number[][]; dem: number[]; mn: number[]; mb: number[] };

function YearView({ D, PI, modes, defaultMode }: { D: Data; PI: PlantInfo[]; modes: Mode[]; defaultMode: Mode }) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);

  const showTip = useCallback((e: { clientX: number; clientY: number }, html: string) => {
    const vw = window.innerWidth, vh = window.innerHeight, tw = 230, th = 200;
    let lx = e.clientX + 16; if (lx + tw > vw - 8) lx = e.clientX - tw - 16; if (lx < 8) lx = 8;
    setTip({ x: lx, y: Math.max(8, Math.min(e.clientY - th / 2, vh - th - 8)), html });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  const months = useMemo(() => [...new Set(D.dates.map((d) => d.slice(0, 7)))], [D]);
  const Y = useMemo((): YData => {
    const n = D.dates.length, cat: number[][] = [], dem: number[] = [], mn: number[] = [], mb: number[] = [];
    for (let i = 0; i < n; i++) {
      cat.push(D.C[i].map((a) => a.reduce((x, y) => x + y, 0) * 0.00025));
      dem.push(D.dem[i].reduce((x, y) => x + y, 0) * 0.00025);
      const s = sur(D, i); let b = 0; s.forEach((v, k) => { if (v < s[b]) b = k; });
      mn.push(s[b]); mb.push(b);
    }
    return { cat, dem, mn, mb };
  }, [D]);

  const kpis = useMemo((): [string, string, string, string][] => {
    let dm = 0, sm = 0, pk = { v: 0, i: 0, b: 0 }, mn = { v: 1e9, i: 0, b: 0 }, def = 0;
    D.dates.forEach((_, i) => {
      const d = D.dem[i], a = D.av[i];
      d.forEach((v, b) => { dm += v; sm += a[b]; if (v > pk.v) pk = { v, i, b }; const x = a[b] - v; if (x < 0) def++; if (x < mn.v) mn = { v: x, i, b }; });
    });
    const dl = (o: { i: number; b: number }) => { const d = D.dates[o.i]; return +d.slice(8) + " " + MON[+d.slice(5, 7) - 1].slice(0, 3) + " " + d.slice(2, 4) + " · B" + (o.b + 1) + " · " + bt(o.b); };
    return [
      ["Peak demand", fmt(pk.v) + " MW", dl(pk), ""],
      ["Tightest block", (mn.v >= 0 ? "+" : "") + fmt(mn.v) + " MW", dl(mn), mn.v < 0 ? "neg" : "pos"],
      ["Deficit blocks", fmt(def), "of " + fmt(D.dates.length * 96) + " blocks", def ? "neg" : "pos"],
      ["Energy (demand / DC)", fmt(dm * 0.00025) + " / " + fmt(sm * 0.00025) + " MU", D.dates.length + " days", ""],
    ];
  }, [D]);

  // Open the clicked month's calendar inline, right below the deficit grid (no page change).
  const jumpToMonth = (mk: string) => {
    setOpenMonth(mk);
    requestAnimationFrame(() => monthRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="dc-root">
      <section className="dc-kpis">
        {kpis.map((k) => (
          <div className="dc-kpi" key={k[0]}>
            <div className="l">{k[0]}</div><div className={"v " + k[3]}>{k[1]}</div><div className="n">{k[2]}</div>
          </div>
        ))}
      </section>

      <section className="dc-card">
        <YearCharts D={D} Y={Y} months={months} onDay={setOpenDay} showTip={showTip} hideTip={hideTip} />
      </section>

      <section className="dc-card">
        <div className="dc-ygh"><b>Deficit blocks per date</b><span>15-min blocks (0–96) where demand met exceeded total supply · click a date to open it full size · click a month to open its calendar below.</span></div>
        <div className="dc-cal-scroll"><YearGrid D={D} months={months} onDay={setOpenDay} onMonth={jumpToMonth} /></div>
      </section>

      {openMonth && (
        <section className="dc-card" ref={monthRef}>
          <div className="dc-ygh">
            <b>{MON[+openMonth.slice(5) - 1]} {openMonth.slice(0, 4)} calendar</b>
            <span>opened from the deficit grid · use the controls below to change month or mode</span>
            <button style={{ marginLeft: "auto" }} onClick={() => setOpenMonth(null)}>Close ✕</button>
          </div>
          <Calendar key={openMonth} D={D} PI={PI} modes={modes} defaultMode={defaultMode} initialMonthKey={openMonth} />
        </section>
      )}

      {openDay != null && (
        <DayModal
          D={D} i={openDay} mode="stack" view="cat" off={EMPTY_SET} demOn
          srcSer={() => null} srcInfo={DEF_SRCINFO} series={(i) => D.C[i]} names={D.cats}
          onClose={() => setOpenDay(null)} setDay={setOpenDay} showTip={showTip} hideTip={hideTip}
        />
      )}
      {tip && <div className="dc-tip" style={{ left: tip.x, top: tip.y }} dangerouslySetInnerHTML={{ __html: tip.html }} />}
    </div>
  );
}

function YearCharts({ D, Y, months, onDay, showTip, hideTip }: {
  D: Data; Y: YData; months: string[]; onDay: (i: number) => void;
  showTip: (e: { clientX: number; clientY: number }, html: string) => void; hideTip: () => void;
}) {
  const n = D.dates.length;
  const [hoverI, setHoverI] = useState<number | null>(null);
  const stRef = useRef<SVGSVGElement>(null);
  const sdRef = useRef<SVGSVGElement>(null);
  const W = 1200, H1 = 300, H2 = 150, m = { l: 56, r: 12, t: 10, b: 22 };
  const x = (i: number) => m.l + (i * (W - m.l - m.r)) / (n - 1);
  const lineN = (arr: number[], yFn: (v: number) => number) => arr.map((v, i) => (i ? "L" : "M") + x(i) + "," + yFn(v)).join("");
  const areaN = (lo: number[], hi: number[], yFn: (v: number) => number) => {
    let d = "M" + x(0) + "," + yFn(hi[0]);
    for (let i = 1; i < n; i++) d += "L" + x(i) + "," + yFn(hi[i]);
    for (let i = n - 1; i >= 0; i--) d += "L" + x(i) + "," + yFn(lo[i]);
    return d + "Z";
  };

  const { layers, pT, nT } = useMemo(() => {
    const pT = new Array(n).fill(0), nT = new Array(n).fill(0);
    const layers: { k: number; pos: [number[], number[]]; neg: [number[], number[]] }[] = [];
    for (let k = 0; k < 8; k++) {
      const p0 = pT.slice(), n0 = nT.slice();
      for (let i = 0; i < n; i++) { const v = Y.cat[i][k]; if (v > 0) pT[i] += v; else nT[i] += v; }
      layers.push({ k, pos: [p0, pT.slice()], neg: [n0, nT.slice()] });
    }
    return { layers, pT, nT };
  }, [Y, n]);

  // axis frame builder
  const axis = (H: number, lo0: number, hi0: number) => {
    const step = niceStep(hi0 - lo0 || 1, 4);
    const hi = Math.ceil(hi0 / step) * step, lo = Math.floor(lo0 / step) * step;
    const yFn = (v: number) => m.t + ((hi - v) * (H - m.t - m.b)) / (hi - lo || 1);
    const els: React.ReactNode[] = [];
    for (let v = lo; v <= hi + 1e-6; v += step) {
      els.push(<line key={"g" + v} x1={m.l} x2={W - m.r} y1={yFn(v)} y2={yFn(v)} stroke={v === 0 ? cssv("--dc-muted") : cssv("--dc-grid")} />);
      els.push(<text key={"t" + v} x={m.l - 8} y={yFn(v) + 4} textAnchor="end" className="num" fontSize={11} fill={cssv("--dc-muted")}>{kf(v)}</text>);
    }
    months.forEach((mk) => {
      const i = D.dates.indexOf(mk + "-01"); if (i < 0) return;
      els.push(<line key={"ml" + mk} x1={x(i)} x2={x(i)} y1={m.t} y2={H - m.b} stroke={cssv("--dc-grid")} />);
      els.push(<text key={"mt" + mk} x={x(i) + 3} y={H - 6} textAnchor="start" className="num" fontSize={11} fill={cssv("--dc-muted")}>{MON[+mk.slice(5) - 1].slice(0, 3) + " " + mk.slice(2, 4)}</text>);
    });
    return { yFn, els };
  };

  const topAx = axis(H1, Math.min(0, ...nT), Math.max(...pT, ...Y.dem));
  const botAx = axis(H2, Math.min(0, ...Y.mn), Math.max(0, ...Y.mn));
  const bw = Math.max(1, (W - m.l - m.r) / n - 0.6);

  const yTipHtml = (i: number) => {
    const d = D.dates[i], cat = Y.cat[i], sup = cat.reduce((a, b) => a + b, 0);
    let h = `<h4>${+d.slice(8)} ${MON[+d.slice(5, 7) - 1].slice(0, 3)} ${d.slice(0, 4)} · daily energy, MU</h4>`;
    for (let k = 7; k >= 0; k--) h += `<div class="r"><span><i class="sw" style="background:${cssv(COLS[k])}"></i>${D.cats[k]}</span><b>${cat[k].toFixed(1)}</b></div>`;
    h += `<hr><div class="r"><span>Total supply</span><b>${sup.toFixed(1)}</b></div><div class="r"><span>Demand met</span><b>${Y.dem[i].toFixed(1)}</b></div>`;
    h += `<hr><div class="r"><span>Tightest block</span><b class="${Y.mn[i] < 0 ? "neg" : "pos"}">${Y.mn[i] >= 0 ? "+" : ""}${fmt(Y.mn[i])} · B${Y.mb[i] + 1}</b></div>`;
    return h;
  };
  const idxAt = (e: React.PointerEvent, ref: React.RefObject<SVGSVGElement | null>) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1));
    return i < 0 || i >= n ? null : i;
  };
  const onMove = (ref: React.RefObject<SVGSVGElement | null>) => (e: React.PointerEvent) => {
    const i = idxAt(e, ref); if (i == null) { setHoverI(null); hideTip(); return; }
    setHoverI(i); showTip(e, yTipHtml(i));
  };
  const onLeave = () => { setHoverI(null); hideTip(); };
  const onClick = (ref: React.RefObject<SVGSVGElement | null>) => (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1));
    if (i >= 0 && i < n) onDay(i);
  };

  return (
    <>
      <div className="dc-note" style={{ margin: "0 0 4px" }}><b style={{ color: cssv("--dc-text") }}>Daily energy</b> · supply by category (stacked, MU) vs demand met (line) · hover for values, click a day to open it full size</div>
      <svg ref={stRef} viewBox={`0 0 ${W} ${H1}`} className="dc-year-svg" onPointerMove={onMove(stRef)} onPointerLeave={onLeave} onClick={onClick(stRef)} role="img" aria-label="Daily energy by category and demand over the year">
        <g>{topAx.els}</g>
        {layers.map(({ k, pos, neg }) => [pos, neg].map((q, qi) => (
          q[1].every((v, i) => v === q[0][i]) ? null :
          <path key={"l" + k + qi} d={areaN(q[0], q[1], topAx.yFn)} fill={cssv(COLS[k])} stroke={cssv("--dc-surface")} strokeWidth={0.5} />
        )))}
        <path d={lineN(Y.dem, topAx.yFn)} fill="none" stroke={cssv("--dc-surface")} strokeWidth={4} />
        <path d={lineN(Y.dem, topAx.yFn)} fill="none" stroke={cssv("--dc-text")} strokeWidth={1.6} />
        {hoverI != null && <line x1={x(hoverI)} x2={x(hoverI)} y1={m.t} y2={H1 - m.b} stroke={cssv("--dc-text2")} strokeDasharray="3 3" />}
      </svg>

      <div className="dc-note" style={{ margin: "8px 0 4px" }}><b style={{ color: cssv("--dc-text") }}>Daily surplus / deficit</b> · tightest block of each day, MW (below zero = deficit)</div>
      <svg ref={sdRef} viewBox={`0 0 ${W} ${H2}`} className="dc-year-svg" onPointerMove={onMove(sdRef)} onPointerLeave={onLeave} onClick={onClick(sdRef)} role="img" aria-label="Tightest block surplus or deficit for each day">
        <g>{botAx.els}</g>
        {Y.mn.map((v, i) => (
          <rect key={i} x={x(i) - bw / 2} y={Math.min(botAx.yFn(0), botAx.yFn(v))} width={bw} height={Math.abs(botAx.yFn(v) - botAx.yFn(0))} fill={v < 0 ? cssv("--dc-def") : cssv("--dc-sur")} fillOpacity={v < 0 ? 0.85 : 0.5} />
        ))}
        {hoverI != null && <line x1={x(hoverI)} x2={x(hoverI)} y1={m.t} y2={H2 - m.b} stroke={cssv("--dc-text2")} strokeDasharray="3 3" />}
      </svg>
    </>
  );
}

function YearGrid({ D, months, onDay, onMonth }: {
  D: Data; months: string[]; onDay: (i: number) => void; onMonth: (mk: string) => void;
}) {
  const cc = (c: number) => {
    if (!c) return undefined;
    const t = Math.min(1, Math.sqrt(c / 64));
    return { background: `color-mix(in srgb, var(--dc-defhi) ${(t * 100).toFixed(1)}%, var(--dc-mid))`, color: t > 0.55 ? "#fff" : cssv("--dc-text") };
  };
  return (
    <table className="dc-yg">
      <colgroup><col className="mc" />{Array.from({ length: 31 }, (_, k) => <col key={k} />)}<col className="tc" /></colgroup>
      <thead>
        <tr><th /><>{Array.from({ length: 31 }, (_, k) => <th key={k}>{k + 1}</th>)}</><th style={{ textAlign: "right", paddingRight: 4 }}>Total</th></tr>
      </thead>
      <tbody>
        {months.map((mk) => {
          const y = +mk.slice(0, 4), mo = +mk.slice(5) - 1, nd = new Date(y, mo + 1, 0).getDate();
          let tot = 0;
          const cells: React.ReactNode[] = [];
          for (let d = 1; d <= 31; d++) {
            if (d > nd) { cells.push(<td key={d} className="na" />); continue; }
            const ds = `${mk}-${String(d).padStart(2, "0")}`, i = D.dates.indexOf(ds);
            if (i < 0) { cells.push(<td key={d} className="na" />); continue; }
            const c = sur(D, i).filter((v) => v < 0).length; tot += c;
            cells.push(
              <td key={d} className="d" style={cc(c)} title={`${d} ${MON[mo]} ${y}: ${c} deficit blocks (${c / 4} h)`} onClick={() => onDay(i)}>{c || ""}</td>
            );
          }
          return (
            <tr key={mk}>
              <th scope="row" onClick={() => onMonth(mk)} title={`Open ${MON[mo]} ${y} calendar`}>{MON[mo].slice(0, 3)} {mk.slice(2, 4)}</th>
              {cells}
              <td className="tot">{tot}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------- heatmap ---------- */
function hx(c: string): [number, number, number] {
  c = c.trim();
  if (c[0] === "#" && c.length === 4) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
  return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) as [number, number, number];
}
function Heatmap({ D, idx, mk, picked, setPicked, showTip, hideTip }: {
  D: Data; idx: number[]; mk: string; picked: number | null; setPicked: (i: number) => void;
  showTip: (e: { clientX: number; clientY: number }, html: string) => void; hideTip: () => void;
}) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const geomRef = useRef<{ m: { l: number; r: number; t: number; b: number }; cw: number; rh: number; rows: { i?: number; sum?: string; gap?: boolean; a?: number[] }[] } | null>(null);
  const [valuesOpen, setValuesOpen] = useState(false);
  const [, force] = useState(0);

  const line = useMemo(() => {
    let def = 0, mn = { v: 1e9, i: 0, b: 0 };
    idx.forEach((i) => sur(D, i).forEach((v, b) => { if (v < 0) def++; if (v < mn.v) mn = { v, i, b }; }));
    return `${MON[+mk.slice(5) - 1]} ${mk.slice(0, 4)}: ${def} deficit blocks, worst ${fmt(mn.v)} MW on ${+D.dates[mn.i].slice(8)} ${MON[+mk.slice(5) - 1].slice(0, 3)} in block ${mn.b + 1} (${bt(mn.b)}).`;
  }, [D, idx, mk]);

  const draw = useCallback(() => {
    const cv = cvRef.current, box = boxRef.current;
    if (!cv || !box) return;
    const cs = getComputedStyle(document.documentElement);
    const V = (n: string) => cs.getPropertyValue(n) || cvFallback(n);
    const mid = hx(V("--dc-mid")), sh = hx(V("--dc-surhi")), dh = hx(V("--dc-defhi"));
    const col = (v: number) => { const t = Math.min(1, Math.abs(v) / 4000), e = v < 0 ? dh : sh; return `rgb(${mid.map((q, k) => Math.round(q + (e[k] - q) * t)).join(",")})`; };

    const W = box.clientWidth, H = Math.max(260, Math.min(560, idx.length * 16 + 90));
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    const c = cv.getContext("2d")!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);

    const rows: { i?: number; sum?: string; gap?: boolean; a?: number[] }[] = idx.map((i) => ({ i, a: sur(D, i) }));
    const avg: number[] = [], mn: number[] = [];
    for (let b = 0; b < 96; b++) { const v = rows.map((r) => r.a![b]); avg.push(v.reduce((x, yy) => x + yy, 0) / v.length); mn.push(Math.min(...v)); }
    rows.push({ gap: true }, { sum: "Avg", a: avg }, { sum: "Min", a: mn });

    const m = { l: 88, r: W < 700 ? 90 : 170, t: 18, b: 4 };
    const cw = (W - m.l - m.r) / 96, rh = (H - m.t - m.b) / rows.length;
    const dcText = V("--dc-text"), dcText2 = V("--dc-text2"), dcMuted = V("--dc-muted"), dcSurface = V("--dc-surface"), dcGrid = V("--dc-grid"), dcDef = V("--dc-def");
    const mono = "ui-monospace, Menlo, monospace", sans = cs.getPropertyValue("--f-sans") || "system-ui, sans-serif";

    rows.forEach((r, k) => { if (r.gap) return; const yy = m.t + k * rh; for (let b = 0; b < 96; b++) { c.fillStyle = col(r.a![b]); c.fillRect(m.l + b * cw, yy, cw + 0.6, rh - 1); } });
    const pk = rows.findIndex((r) => r.i === picked);
    if (pk >= 0) { c.strokeStyle = dcText; c.lineWidth = 2; c.strokeRect(m.l - 1, m.t + pk * rh - 1, 96 * cw + 2, rh + 1); }
    c.strokeStyle = dcSurface; c.lineWidth = 1;
    for (let b = 4; b < 96; b += 4) { c.beginPath(); c.moveTo(m.l + b * cw, m.t); c.lineTo(m.l + b * cw, H - m.b); c.stroke(); }

    c.font = "11px " + mono; c.fillStyle = dcMuted; c.textBaseline = "bottom"; c.textAlign = "center";
    const stp = W < 700 ? 16 : W > 1500 ? 4 : 8; const tk = [1]; for (let b = stp; b <= 96; b += stp) tk.push(b);
    tk.forEach((b) => c.fillText(W > 1100 ? "B" + b : String(b), m.l + (b - 0.5) * cw, m.t - 4));

    const bx = m.l + 96 * cw + 12, bw = m.r - 12 - (W < 700 ? 34 : 56);
    c.textBaseline = "middle";
    const fs = Math.max(7, Math.min(11, Math.floor(rh * 0.95)));
    const defs = rows.filter((r) => r.i != null).map((r) => r.a!.filter((v) => v < 0).length), mxd = Math.max(1, ...defs);
    const bar = (yc: number, v: number, mx: number, h: number, txt: string) => {
      c.fillStyle = dcGrid; c.fillRect(bx, yc - h / 2, bw, h);
      c.fillStyle = dcDef; const L = (bw * v) / mx;
      if (c.roundRect) { c.beginPath(); c.roundRect(bx, yc - h / 2, Math.max(v ? 2 : 0, L), h, 3); c.fill(); } else c.fillRect(bx, yc - h / 2, L, h);
      c.fillStyle = dcText2; c.textAlign = "left"; c.font = fs + "px " + mono; c.fillText(txt, bx + bw + 4, yc);
    };
    rows.forEach((r, k) => {
      const yc = m.t + (k + 0.5) * rh; if (r.gap) return;
      c.textAlign = "right";
      if (r.sum) { c.fillStyle = dcText; c.font = "600 " + fs + "px " + sans; c.fillText(r.sum === "Avg" ? "Month avg" : "Month min", m.l - 8, yc); return; }
      const d = D.dates[r.i!], dw = DOW[(new Date(d + "T00:00").getDay() + 6) % 7];
      c.fillStyle = /Sat|Sun/.test(dw) ? dcMuted : dcText2; c.font = fs + "px " + mono;
      c.fillText(rh >= 10 ? d.slice(8) + " " + dw : d.slice(8), m.l - 8, yc);
      const h = defs[k]; bar(yc, h, mxd, Math.min(10, rh - 3), h ? String(h) : "–");
    });
    c.fillStyle = dcMuted; c.textAlign = "left"; c.textBaseline = "bottom"; c.font = "11px " + sans;
    c.fillText("Deficit blocks", bx, m.t - 4);

    geomRef.current = { m, cw, rh, rows };
  }, [D, idx, picked]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const onResize = () => { draw(); force((x) => x + 1); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const hmPos = (e: { clientX: number; clientY: number }) => {
    const G = geomRef.current, cv = cvRef.current; if (!G || !cv) return null;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, yy = e.clientY - r.top;
    const b = Math.floor((x - G.m.l) / G.cw), k = Math.floor((yy - G.m.t) / G.rh);
    return b >= 0 && b < 96 && k >= 0 && k < G.rows.length && !G.rows[k].gap ? { b, r: G.rows[k] } : null;
  };
  const onMove = (e: React.PointerEvent) => {
    const p = hmPos(e); if (!p) { hideTip(); return; }
    if (p.r.sum) {
      const v = p.r.a![p.b];
      showTip(e, `<h4>${MON[+mk.slice(5) - 1]} ${p.r.sum === "Avg" ? "average" : "minimum"} · Block ${p.b + 1} · ${bt(p.b)}–${bt(p.b + 1)}</h4><div class="r"><span>${v < 0 ? "Deficit" : "Surplus"}</span><b class="${v < 0 ? "neg" : "pos"}">${v < 0 ? "" : "+"}${fmt(v)}</b></div>`);
      return;
    }
    const i = p.r.i!, d = D.dates[i];
    showTip(e, `<h4>${+d.slice(8)} ${MON[+d.slice(5, 7) - 1].slice(0, 3)} ${d.slice(0, 4)} · Block ${p.b + 1} · ${bt(p.b)}–${bt(p.b + 1)}</h4>` + tail(D.av[i][p.b], D.dem[i][p.b]));
  };
  const onClick = (e: React.MouseEvent) => { const p = hmPos(e); if (p && p.r.i != null) setPicked(p.r.i); };

  return (
    <section className="dc-card">
      <div className="dc-hmtop">
        <span><b>Surplus / deficit by date &amp; block</b> · {line}</span>
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setValuesOpen(true)}>Show values table</button>
          <span className="dc-scale">Deficit −4,000<i />+4,000 Surplus</span>
        </span>
      </div>
      <div className="dc-hm" ref={boxRef}>
        <canvas ref={cvRef} role="img" aria-label="Heatmap of blockwise surplus and deficit for the month"
          onPointerMove={onMove} onPointerLeave={hideTip} onClick={onClick} />
      </div>
      <p className="dc-note">Colour saturates at ±4,000 MW · hover for values · click a date row to open it full size · bottom rows show the month average and minimum per block.</p>
      {valuesOpen && <ValuesTable D={D} idx={idx} mk={mk} onClose={() => setValuesOpen(false)} />}
    </section>
  );
}

function cvFallback(n: string) {
  // last-ditch defaults if a CSS var reads empty (shouldn't happen once mounted)
  return ({ "--dc-mid": "#f0efec", "--dc-surhi": "#184f95", "--dc-defhi": "#a61e1e", "--dc-text": "#111", "--dc-text2": "#555", "--dc-muted": "#888", "--dc-surface": "#fff", "--dc-grid": "#eee", "--dc-def": "#e34948" } as Record<string, string>)[n] || "#999";
}

function ValuesTable({ D, idx, mk, onClose }: { D: Data; idx: number[]; mk: string; onClose: () => void }) {
  const cs = getComputedStyle(document.documentElement);
  const mid = hx(cs.getPropertyValue("--dc-mid")), sh = hx(cs.getPropertyValue("--dc-surhi")), dh = hx(cs.getPropertyValue("--dc-defhi"));
  const col = (v: number) => { const t = Math.min(1, Math.abs(v) / 4000), e = v < 0 ? dh : sh; return `rgb(${mid.map((q, k) => Math.round(q + (e[k] - q) * t)).join(",")})`; };
  const ink = (v: number) => (Math.abs(v) > 2200 ? "#fff" : cs.getPropertyValue("--dc-text") || "#111");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dc-ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dc-modal" role="dialog" aria-modal="true">
        <div className="dc-mhead">
          <h3>{MON[+mk.slice(5) - 1]} {mk.slice(0, 4)} · blockwise surplus (+) / deficit (−), MW</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="dc-vtw">
          <table className="dc-vt">
            <thead>
              <tr>
                <th>Date</th>
                {Array.from({ length: 96 }, (_, b) => <th key={b} title={bt(b) + "–" + bt(b + 1)}>B{b + 1}<br /><small>{bt(b)}</small></th>)}
                <th>Min</th><th>Deficit</th>
              </tr>
            </thead>
            <tbody>
              {idx.map((i) => {
                const a = sur(D, i), mn = Math.min(...a);
                return (
                  <tr key={i}>
                    <th>{D.dates[i].slice(8)} {DOW[(new Date(D.dates[i] + "T00:00").getDay() + 6) % 7]}</th>
                    {a.map((v, b) => <td key={b} style={{ background: col(v), color: ink(v) }}>{fmt(v)}</td>)}
                    <td style={{ background: col(mn), color: ink(mn) }}>{fmt(mn)}</td>
                    <td>{a.filter((v) => v < 0).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
