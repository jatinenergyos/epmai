import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { BlockSelect, DayNavigator } from "@/components/weeksupply/DayControls";
import { DaySupplyChartCard } from "@/components/weeksupply/DaySupplyChartCard";
import { CategoryTable, PlantTable, TableCard, TechnologyTable, VcTable } from "@/components/weeksupply/SupplyTables";
import { GraphTypeDropdown } from "@/components/weeksupply/GraphTypeDropdown";
import { currentBlock, fromApiDay, isGraphType, isIsoDate, isoOf, mockDay, parseIso, todayIso, type SupplyGraphType } from "@/components/weeksupply/weekSupplyData";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDayPlantSupply } from "@/store/slice/supplyApiSlice";

/** DaySupplyPage: Graph Type (Category / Technology / Variable Cost / Plants) picks one chart and its
 *  table, shown side by side, with a date navigator and a time-block picker for the table. Category
 *  and Technology come straight from plant-supply/by-category (not cached); Variable Cost and Plants
 *  are still mock data. Opens on today; goes forward up to tomorrow and back as far as the API has
 *  data. Graph type and date live in the URL (?type=category&date=2026-10-28). */
function DaySupplyPage() {
  const dispatch = useAppDispatch();
  const { day: detail, dayDate, dayLoading, dayError } = useAppSelector((state) => state.supply);
  const search = useSearch({ strict: false }) as { type?: string; date?: string };
  const navigate = useNavigate();
  const type: SupplyGraphType = isGraphType(search.type) ? search.type : "category";

  const today = todayIso();
  const tomorrow = useMemo(() => { const d = parseIso(today); d.setDate(d.getDate() + 1); return isoOf(d); }, [today]);
  const date = isIsoDate(search.date) ? (search.date > tomorrow ? tomorrow : search.date) : today;
  const setParams = (next: { type?: SupplyGraphType; date?: string }) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, type, date, ...next }), replace: true });

  useEffect(() => { dispatch(fetchDayPlantSupply({ date })); }, [dispatch, date]);

  // Fill the window below the page's own top edge, so the chart and table use all the space.
  const rootRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(240);
  useLayoutEffect(() => {
    const measure = () => { if (rootRef.current) setTop(rootRef.current.getBoundingClientRect().top + window.scrollY); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The current block ticks forward on its own (checked every 30 s); the tables follow the
  // picked block, which starts at the current one.
  const [nowBlock, setNowBlock] = useState(currentBlock);
  useEffect(() => {
    const id = window.setInterval(() => setNowBlock(currentBlock()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const [block, setBlock] = useState(currentBlock);

  const ready = dayDate === date && !dayLoading;
  const loading = !ready && !dayError;
  const api = ready ? detail : null;

  // API series with a value anywhere in the day, in API order (central then state for Category).
  const catNames = useMemo(() => (api ? api.category.filter((s) => s.data.some((v) => v)).map((s) => s.name) : []), [api]);
  const techNames = useMemo(() => (api ? api.technology.filter((s) => s.data.some((v) => v)).map((s) => s.name) : []), [api]);
  const catDay = useMemo(() => (api ? fromApiDay({ date, series: api.category, demand: api.demand }, catNames) : null), [api, date, catNames]);
  const techDay = useMemo(() => (api ? fromApiDay({ date, series: api.technology, demand: api.demand }, techNames) : null), [api, date, techNames]);
  const vcDay = useMemo(() => mockDay(date, "vc"), [date]);
  const plantDay = useMemo(() => mockDay(date, "plants"), [date]);

  const common = { isToday: date === today, isPast: date < today, currentBlock: nowBlock };

  // The picked graph type: its chart and its table, side by side.
  const view = {
    category: {
      chart: <DaySupplyChartCard title="Supply by Category" type="category" day={catDay} names={catNames} isLoading={loading} {...common} />,
      table: <TableCard title="Category Wise Distribution">{loading ? <TableSkeleton /> : <CategoryTable detail={api} block={block} />}</TableCard>,
    },
    technology: {
      chart: <DaySupplyChartCard title="Supply by Technology" type="technology" day={techDay} names={techNames} isLoading={loading} {...common} />,
      table: <TableCard title="Technology Wise Distribution">{loading ? <TableSkeleton /> : <TechnologyTable detail={api} block={block} />}</TableCard>,
    },
    vc: {
      chart: <DaySupplyChartCard title="Supply by Variable Cost" type="vc" day={vcDay} isLoading={false} {...common} />,
      table: <TableCard title="Variable Cost (VC) Distribution"><VcTable day={vcDay} block={block} /></TableCard>,
    },
    plants: {
      chart: <DaySupplyChartCard title="Plant-wise SG & Cumulative vs Demand" type="plants" day={plantDay} isLoading={false} {...common} />,
      table: <TableCard title="Plant Generation"><PlantTable day={plantDay} /></TableCard>,
    },
  }[type];

  return (
    <div
      ref={rootRef}
      className="flex min-h-[560px] flex-col rounded-[10px] border bg-card p-3"
      // Negative bottom margin cancels the page's bottom padding so nothing scrolls.
      style={{ height: `calc(100vh - ${top}px - 16px)`, marginBottom: -64 }}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <GraphTypeDropdown value={type} onChange={(t) => setParams({ type: t })} />
        <div className="flex items-center gap-2">
          <DayNavigator date={date} onChange={(iso) => setParams({ date: iso })} canNext={date < tomorrow} />
          <BlockSelect block={block} onChange={setBlock} />
        </div>
      </div>
      {dayError && <p className="mb-2 shrink-0 text-[12px] text-destructive">{dayError}</p>}
      {/* Chart and table share the rest of the height; on narrow screens they stack. */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,2.7fr)_minmax(0,1fr)] max-lg:grid-rows-[minmax(420px,1fr)_minmax(320px,auto)]">
        {view.chart}
        {view.table}
      </div>
    </div>
  );
}

const TableSkeleton = () => (
  <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-7 animate-pulse rounded bg-muted" />)}</div>
);

/** Supply Availability · Day-ahead — Planning-horizon view. */
export const SupplyAvailabilityDayAhead = DaySupplyPage;

/** All modules shows the same view as the Planning horizon. */
export const SupplyAvailabilityDayAheadModule = SupplyAvailabilityDayAhead;
