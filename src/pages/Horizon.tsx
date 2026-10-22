import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { CAD, MODS, MON, NOW, TFS, modName, tfIdx, tfName } from "@/data/engine";
import { G } from "@/data/model";
import { Chart, Legend } from "@/components/chart/Chart";
import { CAL_SETS, DemandCalendar } from "@/components/DemandCalendar";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { WeekSupplyGrid, WINDOW_START } from "@/components/WeekSupplyGrid";
import { useHorizon, useHorizonModule } from "@/lib/horizon";
import { usePanels } from "@/lib/panels";
import { cn } from "@/lib/utils";
import LoadGrid, { hasLoadGrid } from "@/features/loadgrid/LoadGrid";
import { LG_SETS, useDcData } from "@/features/loadgrid/data";
import { GraphTypeSelect } from "@/features/loadgrid/GraphTypeSelect";
import type { GroupBy } from "@/features/loadgrid/breakdown";
import { chartTitle, KeyDetails } from "./Module";
import { ReportLibrary } from "./Reports";

const MARKETS = ["DAM", "RTM", "GDAM", "HPDAM"];
const EXCHANGES = ["IEX", "PXIL", "HPX"];

/** The selected module (module strip) at the selected horizon (the "Planning horizon" header
 *  dropdown) — one view, not every horizon stacked. Module ruler picks the module; the planning
 *  horizon picks which single horizon to show. */
export function HorizonPage() {
  const { mod } = useHorizonModule();
  const { tf } = useHorizon();
  const { openDrill } = usePanels();
  const ti = tfIdx(tf);

  // Month ahead on the Planning-horizon page is the UP DC demand calendar, scoped to the focused
  // module: the Demand data lives under Demand, supply data under Supply, surplus/deficit under
  // Optimization; the all-module Overview keeps every mode.
  const calSet = CAL_SETS[mod];
  const monthBarSlotRef = useRef<HTMLDivElement>(null);
  const [weekGroupBy, setWeekGroupBy] = useState<GroupBy>("category");
  const [weekOffset, setWeekOffset] = useState(0);
  const [market, setMarket] = useState(MARKETS[0]);
  const [exchange, setExchange] = useState(EXCHANGES[0]);
  const [dayGroupBy, setDayGroupBy] = useState<GroupBy>("category");
  const [dayOffset, setDayOffset] = useState(0);
  if (tf === "mo" && calSet) {
    // Demand's and Supply's month-bar (prev/next + month select) renders up here,
    // top right, via a portal — see `monthBarPortalRef` on <DemandCalendar> — and
    // their title/KPI row is dropped, since the calendar's own controls and day
    // cells already carry that context. Overview and Optimization keep both.
    const isFocusedMonth = mod === "demand" || mod === "supply" || mod === "mi";
    const liftMonthBar = isFocusedMonth;
    // Market Intelligence reuses Supply's "Total supply (DC)" series (same day grid,
    // same data) with Market/Exchange pickers in place of the plant/category select —
    // a placeholder like Long-term's Graph Type: they label the view, not the data.
    const isMarket = mod === "mi";
    return (
      <>
        {/* "dc-root" on the portal target re-establishes DemandCalendar's scoped CSS
            vars/selectors for the lifted month bar — a portal moves DOM, not the React
            tree, so without this class it would fall back to unstyled browser defaults. */}
        <PageHead
          title={isFocusedMonth ? null : <>{calSet.label} <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
          after={liftMonthBar ? <div ref={monthBarSlotRef} className="dc-root flex-1" /> : undefined}
        />
        <div className="mt-5">
          <DemandCalendar
            key={mod}
            section="month" modes={calSet.modes} defaultMode={calSet.def}
            monthBarPortalRef={liftMonthBar ? monthBarSlotRef : undefined} hideKpis={isFocusedMonth}
            hideSrcSelect={isMarket}
            extraControls={isMarket ? (
              <>
                <div className="dc-seg" role="group" aria-label="Market">
                  <label className="dc-note" style={{ margin: 0, padding: "0 8px", alignSelf: "center" }}>Market</label>
                  <select aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)}>
                    {MARKETS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div className="dc-seg" role="group" aria-label="Exchange">
                  <label className="dc-note" style={{ margin: 0, padding: "0 8px", alignSelf: "center" }}>Exchange</label>
                  <select aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}>
                    {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </>
            ) : undefined}
          />
        </div>
      </>
    );
  }

  // Year ahead stays the holistic demand-vs-supply calendar; shown for Overview, Demand, Supply,
  // and Market Intelligence (the view itself only ever computes the demand-vs-declared-capacity
  // gap, so it's already the same for every module — only the title's label needs to follow which
  // module is focused). Demand/Supply/Market Intelligence drop the KPI row (see Month ahead);
  // Market Intelligence also gets the Market/Exchange placeholder picker, top left.
  if (tf === "yr" && (mod === "overview" || mod === "demand" || mod === "supply" || mod === "mi")) {
    const isFocusedYear = mod === "demand" || mod === "supply" || mod === "mi";
    const isMarket = mod === "mi";
    return (
      <>
        <PageHead
          crumb={isFocusedYear ? undefined : TFS[ti].hz}
          title={isFocusedYear ? null : <>{calSet?.label ?? "Demand calendar"} <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
        >
          {/* <p className="pt-1 text-[13px] text-muted-foreground">
            UP declared-capacity vs demand across the whole year. Hover the charts or grid for values; click a day to open it full size, or a month to jump to its calendar.
          </p> */}
        </PageHead>
        <div className="mt-5">
          <DemandCalendar
            key={mod}
            section="year" supplyFocus={mod === "supply" || isMarket} hideKpis={isFocusedYear}
            extraControls={isMarket ? (
              <>
                <div className="dc-seg" role="group" aria-label="Market">
                  <label className="dc-note" style={{ margin: 0, padding: "0 8px", alignSelf: "center" }}>Market</label>
                  <select aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)}>
                    {MARKETS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div className="dc-seg" role="group" aria-label="Exchange">
                  <label className="dc-note" style={{ margin: 0, padding: "0 8px", alignSelf: "center" }}>Exchange</label>
                  <select aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}>
                    {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </>
            ) : undefined}
          />
        </div>
      </>
    );
  }

  // Long term: the load-profile / box-plot small-multiples grids (ported from the
  // EPM Demand views), one mini-chart per month/week, years as rows. The series
  // shown follows the focused module — demand, declared-capacity supply, or
  // surplus/deficit. Modules without a load series fall through to the gallery.
  if (tf === "lt" && hasLoadGrid(mod)) {
    return <LongTermGrids mod={mod} ti={ti} tf={tf} />;
  }

  // Overview: every module at the selected horizon, as a gallery of chart sections.
  if (mod === "overview") {
    return (
      <>
        <PageHead
          crumb={TFS[ti].hz}
          title={<>Overview <span className="font-normal text-muted-foreground">· {tfName(tf)} · all modules</span></>}
        >
          <p className="pt-1 text-[13px] text-muted-foreground">The headline for each module at this horizon — pick a module above, or open any for its full view.</p>
        </PageHead>

        <Kpis className="mt-5" items={MODS.map((m) => {
          const s = G(m.id, tf).sum;
          return { l: m.name, v: s.big, u: s.u, s: s.sub, st: s.st === "ok" ? undefined : s.st };
        })} />

        <div className="mt-6 space-y-6">
          {MODS.map((m) => {
            const g = G(m.id, tf);
            return (
              <Section key={m.id}
                title={<span className="flex items-center gap-2">{modName(m.id)} <Pill st={g.sum.st} /></span>}
                desc={"Refresh: " + CAD[m.id][ti] + (g.chart ? " · " + chartTitle(m.id, tf) : "")}
                action={<Link to="/modules/$moduleId" params={{ moduleId: m.id }} search={{ m: tf }} className="text-[13px] font-medium text-primary hover:underline">Open module</Link>}>
                {m.id === "reports" ? <ReportLibrary tf={tf} /> : g.chart ? (
                  <div className="space-y-4">
                    <Kpis items={g.kpis!.slice(0, 5)} />
                    <Legend spec={g.chart} />
                    <Chart spec={g.chart} height={240} onPick={(i) => openDrill(m.id, tf, i)} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{g.sum.sub}</p>
                )}
              </Section>
            );
          })}
        </div>
      </>
    );
  }

  const g = G(mod, tf);
  // Supply's and Demand's week-ahead views get the month-ahead-style small-multiples
  // day grid instead of the one-continuous-chart view, split into its Working/Weekend
  // groups. Graph Type (Category/Technology/...) only applies to Supply's stack.
  // Market Intelligence reuses Supply's own stack/data with a Market/Exchange
  // placeholder picker in place of Graph Type (see Month/Year ahead and Long term).
  const isSupplyWeek = mod === "supply" && tf === "wk";
  const isDemandWeek = mod === "demand" && tf === "wk";
  const isMarketWeek = mod === "mi" && tf === "wk";
  const isWeekGrid = isSupplyWeek || isDemandWeek || isMarketWeek;
  // Day-ahead Demand/Supply get the same title/crumb/KPI-row removal as Week-ahead,
  // plus a Today/Tomorrow/Yesterday day badge in place of the chart section's
  // title/desc text — a placeholder like Supply's Graph Type picker here: paging it
  // doesn't change the chart underneath, which stays exactly as it was. Nothing below
  // is deleted, only skipped for this mod/tf pair — every other horizon still renders
  // the title/crumb/"See this module" link/KPI row/chart-section text unchanged.
  const isSupplyDay = mod === "supply" && tf === "da";
  const isDemandDay = mod === "demand" && tf === "da";
  const isDayFocus = isSupplyDay || isDemandDay;

  const marketExchangeControls = (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-1.5 text-[13px]">
        <span className="text-xs text-muted-foreground">Market:</span>
        <select
          aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)}
          className="h-8 rounded-md border bg-card px-2 text-[13px]"
        >
          {MARKETS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <div className="inline-flex items-center gap-1.5 text-[13px]">
        <span className="text-xs text-muted-foreground">Exchange:</span>
        <select
          aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}
          className="h-8 rounded-md border bg-card px-2 text-[13px]"
        >
          {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <>
      {!(isWeekGrid || isDayFocus) && (
        <PageHead
          crumb={TFS[ti].hz}
          title={<>{modName(mod)} <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
          after={<Pill st={g.sum.st} />}
        >
          <Link to="/modules/$moduleId/row" params={{ moduleId: mod }} search={{}}
            className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-primary hover:underline">
            See this module across every horizon <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </PageHead>
      )}

      {mod === "reports" ? (
        <div className="mt-6 space-y-6">
          <ReportLibrary tf={tf} />
          <KeyDetails mod={mod} tf={tf} />
        </div>
      ) : (
        <div className={(isWeekGrid || isDayFocus) ? "space-y-6" : "mt-6 space-y-6"}>
          {!(isWeekGrid || isDayFocus) && g.kpis && <Kpis items={g.kpis} />}
          <Section
            title={
              isWeekGrid ? (isSupplyWeek ? <GraphTypeSelect value={weekGroupBy} onChange={setWeekGroupBy} /> : isMarketWeek ? marketExchangeControls : undefined)
                : isDayFocus ? (isSupplyDay ? <GraphTypeSelect value={dayGroupBy} onChange={setDayGroupBy} /> : undefined)
                  : chartTitle(mod, tf)
            }
            desc={(isWeekGrid || isDayFocus) ? undefined : "Refresh: " + CAD[mod][ti]}
            action={
              isWeekGrid ? <WeekBadge weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
                : isDayFocus ? <DayBadge dayOffset={dayOffset} setDayOffset={setDayOffset} />
                  : undefined
            }
          >
            {isWeekGrid ? (
              <WeekSupplyGrid groupBy={isSupplyWeek ? weekGroupBy : "category"} weekOffset={weekOffset} mod={isDemandWeek ? "demand" : "supply"} />
            ) : g.chart ? (
              <>
                <Legend spec={g.chart} />
                {/* Day-ahead Demand/Supply dropped everything else on the page (see
                    isDayFocus above), so their chart gets the freed-up room instead
                    of sitting at the same fixed height as every other horizon — and
                    its x-axis shows block number (1–96) instead of time-of-day. */}
                <div className="mt-3">
                  <Chart
                    spec={isDayFocus ? { ...g.chart, x: g.chart.x.map((_, i) => String(i + 1)) } : g.chart}
                    height={isDayFocus ? 490 : 340} onPick={(i) => openDrill(mod, tf, i)}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{g.sum.sub}</p>
            )}
          </Section>
          {/* <KeyDetails mod={mod} tf={tf} /> */}
        </div>
      )}
    </>
  );
}

/** "01 - 07 Apr 2019" (same month) or "29 Mar - 04 Apr 2019" (spans two months) for
 *  the 7-day window starting at `startIso` ("YYYY-MM-DD"); day numbers zero-padded. */
function weekRangeLabel(startIso: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(sy, sm - 1, sd + 6);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const from = sameMonth ? pad(start.getDate()) : pad(start.getDate()) + " " + MON[start.getMonth()];
  return from + " - " + pad(end.getDate()) + " " + MON[end.getMonth()] + " " + end.getFullYear();
}

/** The week navigator for Supply's, Demand's, and Market Intelligence's week-ahead
 *  pages — `weekOffset` picks which 7-day window <WeekSupplyGrid> shows, shifted a
 *  week at a time from its sample "current" week (1 Apr 2019). Only ±1 week gets the
 *  "Previous/Current/Next Week" label; further out it's just the date range. Backward
 *  paging is unbounded down to the dataset's actual first day; forward paging stops
 *  at Next week. */
function WeekBadge({ weekOffset, setWeekOffset }: { weekOffset: number; setWeekOffset: (n: number) => void }) {
  const { D } = useDcData();
  const { label, minOffset, maxOffset } = useMemo(() => {
    if (!D) return { label: "", minOffset: weekOffset, maxOffset: weekOffset };
    const anchor = Math.max(0, D.dates.indexOf(WINDOW_START));
    const idx = Math.max(0, Math.min(anchor + weekOffset * 7, D.dates.length - 7));
    const range = weekRangeLabel(D.dates[idx]);
    const relative = weekOffset === 0 ? "Current Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Previous Week" : null;
    return {
      label: relative ? relative + ", " + range : range,
      // Backward paging is unbounded down to the dataset's first day; forward paging
      // stops at Next week — there's no data beyond that to show.
      minOffset: Math.floor(-anchor / 7),
      maxOffset: 1,
    };
  }, [D, weekOffset]);
  return (
    <div className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
      <button
        type="button" aria-label="Previous week" disabled={weekOffset <= minOffset} onClick={() => setWeekOffset(Math.max(minOffset, weekOffset - 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="whitespace-nowrap px-2 font-medium">{label}</span>
      <button
        type="button" aria-label="Next week" disabled={weekOffset >= maxOffset} onClick={() => setWeekOffset(Math.min(maxOffset, weekOffset + 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** "22 Oct 2026" for a single day, zero-padded. */
function dayRangeLabel(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return pad(d.getDate()) + " " + MON[d.getMonth()] + " " + d.getFullYear();
}

/** The day navigator for Demand's and Supply's Day-ahead pages — a placeholder like
 *  Supply's Graph Type picker: paging changes this label only, not the chart (same
 *  "Total supply (DC)" / demand-forecast chart as before). Only ±1 day gets the
 *  "Yesterday/Today/Tomorrow" label; further out it's just the date. Bounded to the
 *  real current week (Monday–Sunday around today) — no paging before or after that
 *  week. */
function DayBadge({ dayOffset, setDayOffset }: { dayOffset: number; setDayOffset: (n: number) => void }) {
  const { label, minOffset, maxOffset } = useMemo(() => {
    const daysSinceMonday = (NOW.getDay() + 6) % 7;
    const date = new Date(NOW); date.setDate(date.getDate() + dayOffset);
    const range = dayRangeLabel(date);
    const relative = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : dayOffset === -1 ? "Yesterday" : null;
    return {
      label: relative ? relative + ", " + range : range,
      minOffset: -daysSinceMonday,
      maxOffset: 6 - daysSinceMonday,
    };
  }, [dayOffset]);
  return (
    <div className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
      <button
        type="button" aria-label="Previous day" disabled={dayOffset <= minOffset} onClick={() => setDayOffset(Math.max(minOffset, dayOffset - 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="whitespace-nowrap px-2 font-medium">{label}</span>
      <button
        type="button" aria-label="Next day" disabled={dayOffset >= maxOffset} onClick={() => setDayOffset(Math.min(maxOffset, dayOffset + 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Long-term view: the two ported EPM grids (Load-profile + Box-plot) with a
 *  toggle between them, scoped to the focused module's series. */
function LongTermGrids({ mod, ti: _ti, tf }: { mod: string; ti: number; tf: import("@/data/engine").TfId }) {
  const [kind, setKind] = useState<"line" | "box">("line");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [market, setMarket] = useState(MARKETS[0]);
  const [exchange, setExchange] = useState(EXCHANGES[0]);
  const cfg = LG_SETS[mod] ?? LG_SETS.demand;
  const KINDS: { id: "line" | "box"; label: string }[] = [
    { id: "line", label: "Load-profile grid" },
    { id: "box", label: "Box-plot grid" },
  ];
  // The "Graph Type" picker is shown for Supply as a placeholder control only —
  // the grid always renders the original aggregate Total supply (DC) chart, so
  // selecting a grouping here doesn't change what's plotted.
  const showGraphType = mod === "supply";
  // Market Intelligence reuses Supply's declared-capacity grid (see LG_SETS.mi) with
  // a Market/Exchange placeholder picker, top left, in place of a title/subtitle.
  const isMarket = mod === "mi";
  // Demand/Supply/Market Intelligence drop the title and subtitle (see Month/Year
  // ahead); Overview and Optimization keep both.
  const hideTitle = mod === "demand" || mod === "supply" || isMarket;

  const kindsToggle = (
    <div className="inline-flex rounded-md border bg-card p-0.5" role="tablist" aria-label="Grid type">
      {KINDS.map((k) => (
        <button
          key={k.id}
          role="tab"
          aria-selected={kind === k.id}
          onClick={() => setKind(k.id)}
          className={cn(
            "rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            kind === k.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {k.label}
        </button>
      ))}
    </div>
  );

  const marketControls = isMarket ? (
    <>
      <div className="inline-flex items-center gap-1.5 text-[13px]">
        <span className="text-xs text-muted-foreground">Market:</span>
        <select
          aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)}
          className="h-8 rounded-md border bg-card px-2 text-[13px]"
        >
          {MARKETS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <div className="inline-flex items-center gap-1.5 text-[13px]">
        <span className="text-xs text-muted-foreground">Exchange:</span>
        <select
          aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}
          className="h-8 rounded-md border bg-card px-2 text-[13px]"
        >
          {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </>
  ) : null;

  return (
    <>
      <PageHead
        title={hideTitle ? null : <>{cfg.label} grids <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
        after={showGraphType ? <GraphTypeSelect value={groupBy} onChange={setGroupBy} className="ml-auto" /> : undefined}
      />

      {/* Demand/Supply/Market Intelligence merge the grid-type toggle onto the same
          line as the grid's own Month/Season + size controls (see `leftControls` on
          <LoadGrid>); Overview and Optimization keep the toggle on its own row above,
          with the grid's original subtitle alongside its controls. */}
      {!hideTitle && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {kindsToggle}
        </div>
      )}

      <div className="mt-3">
        {/* No key here: the grid keeps its Month/Season/Week + size selection when you
            switch between the load-profile and box-plot charts (the inner charts re-key
            themselves on kind/series/period, so they still refresh correctly). */}
        <LoadGrid
          kind={kind} mod={mod} groupBy={null}
          leftControls={hideTitle ? <>{marketControls}{kindsToggle}</> : undefined}
        />
      </div>
    </>
  );
}
