import LoadGrid from "@/features/loadgrid/LoadGrid";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLongTermDemandForecast, fetchLongTermSeasons } from "@/store/slice/demandApiSlice";
import type { ModId } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { cn } from "@/lib/utils";
import { SyncDbButton } from "@/components/SyncDbButton";

const MOD: ModId = "demand";
// Long-term forecast window shown in the grids, and the calendar years whose seasons it needs.
const FROM = "2026-11-01", TO = "2031-12-31";
const YEARS = [2026, 2027, 2028, 2029, 2030, 2031];

/** Demand · Long term — Planning-horizon view. */
export function DemandLongTerm() {
  const dispatch = useAppDispatch();
  const { longTermData, longTermLoading, longTermError, longTermSeasons } = useAppSelector((state) => state.demand);
  const [kind, setKind] = useState<"line" | "box">("line");

  useEffect(() => {
    dispatch(fetchLongTermDemandForecast({ data_id: 102150, from_date: FROM, to_date: TO, location_id: 10030, forcasted_by: "System", table: "daily" }));
    dispatch(fetchLongTermSeasons({ years: YEARS }));
  }, [dispatch]);

  // Sync DB: re-call the APIs and save any differences to IndexedDB.
  const syncDb = useCallback(async () => {
    const [forecast, season] = await Promise.all([
      dispatch(fetchLongTermDemandForecast({ data_id: 102150, from_date: FROM, to_date: TO, location_id: 10030, forcasted_by: "System", table: "daily", sync: true })).unwrap(),
      dispatch(fetchLongTermSeasons({ years: YEARS, sync: true })).unwrap(),
    ]);
    return forecast.changed || season.changed;
  }, [dispatch]);
  const KINDS: { id: "line" | "box"; label: string }[] = [
    { id: "line", label: "Load-profile grid" },
    { id: "box", label: "Box-plot grid" },
  ];

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

  return (
    <>
      <PageHead title={null} />
      <div className="mt-3">
        {/* The grid-type toggle sits on the grid's own Month/Season + size line. No key here: the
            grid keeps its selection when you switch between the load-profile and box-plot charts. */}
        <LoadGrid
          kind={kind} mod={MOD} groupBy={null} leftControls={kindsToggle} rightControls={<SyncDbButton onSync={syncDb} />}
          externalData={longTermData} loading={longTermLoading} error={longTermError} seasons={longTermSeasons}
        />
      </div>
    </>
  );
}

/** All modules → Demand shows the same view as the Planning horizon. */
export const DemandLongTermModule = DemandLongTerm;
