import { useCallback, useEffect, useMemo, useState } from "react";
import { NOW } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { DemandCalendar, type YearApi } from "@/components/DemandCalendar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSeasons, fetchYearDayDemand, fetchYearDemandForecast } from "@/store/slice/demandApiSlice";
import { SyncDbButton } from "@/components/SyncDbButton";
import { idbDeletePrefix } from "@/lib/idbCache";
import { formatIso } from "../shared/HorizonControls";

/** Demand · Year ahead — Planning-horizon view. */
export function DemandYearAhead() {
  const dispatch = useAppDispatch();
  const { yearData, yearLoading, yearError, seasons, yearDay } = useAppSelector((state) => state.demand);

  // A 12-month window starting at the current month — but never before Nov 2026, where the
  // forecast begins — so Nov 2026 – Oct 2027 holds until 30 Nov, then rolls a month at a time
  // (Dec 2026 – Nov 2027 from 1 Dec). The picker steps it a year back, never past the default.
  const [yearOffset, setYearOffset] = useState(0);
  const yearRange = useMemo(() => {
    const cur = new Date(NOW.getFullYear(), NOW.getMonth(), 1), first = new Date(2026, 10, 1);
    const base = cur < first ? first : cur;
    const start = new Date(base.getFullYear() + yearOffset, base.getMonth(), 1);
    const end = new Date(start.getFullYear() + 1, start.getMonth(), 0);
    return { from: formatIso(start), to: formatIso(end) };
  }, [yearOffset]);
  useEffect(() => {
    dispatch(fetchYearDemandForecast({ data_id: 102140, from_date: yearRange.from, to_date: yearRange.to, location_id: 10030, forcasted_by: "System", table: "daily" }));
    dispatch(fetchSeasons({ start_date: yearRange.from, end_date: yearRange.to }));
  }, [dispatch, yearRange]);
  const loadYearDay = useCallback((date: string) => {
    dispatch(fetchYearDayDemand({ date, data_id: 102140, location_id: 10030, forcasted_by: "System", table: "daily" }));
  }, [dispatch]);
  // Sync DB: re-call the APIs for the shown window, save any differences to IndexedDB, and drop
  // the saved single days so an opened day re-loads fresh.
  const syncDb = useCallback(async () => {
    const [forecast, season] = await Promise.all([
      dispatch(fetchYearDemandForecast({ data_id: 102140, from_date: yearRange.from, to_date: yearRange.to, location_id: 10030, forcasted_by: "System", table: "daily", sync: true })).unwrap(),
      dispatch(fetchSeasons({ start_date: yearRange.from, end_date: yearRange.to, sync: true })).unwrap(),
    ]);
    await idbDeletePrefix("year-day:");
    return forecast.changed || season.changed;
  }, [dispatch, yearRange]);
  const yearApi = useMemo((): YearApi => ({
    seasons, day: yearDay, loadDay: loadYearDay, range: yearRange,
    shift: (dir) => setYearOffset((o) => Math.min(0, o + dir)), canNext: yearOffset < 0,
    extra: <SyncDbButton onSync={syncDb} />,
  }), [seasons, yearDay, loadYearDay, yearRange, yearOffset, syncDb]);

  return (
    <>
      <PageHead title={null} />
      {yearError && <p className="mt-5 text-sm text-destructive">{yearError}</p>}
      <div className="mt-5">
        <DemandCalendar
          section="year" hideKpis modes={["dem"]} defaultMode="dem"
          externalData={yearData} loading={yearLoading} yearApi={yearApi}
        />
      </div>
    </>
  );
}

/** All modules → Demand shows the same view as the Planning horizon. */
export const DemandYearAheadModule = DemandYearAhead;
