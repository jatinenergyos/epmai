import { useEffect } from "react";
import { CAL_SETS, DemandCalendar } from "@/components/DemandCalendar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDemandForecast } from "@/store/slice/demandApiSlice";

/** Demand · Month ahead — Planning-horizon view. */
export function DemandMonthAhead() {
  const dispatch = useAppDispatch();
  const { data: demandData, loading: demandLoading } = useAppSelector((state) => state.demand);

  useEffect(() => {
    dispatch(fetchDemandForecast({
      data_id: 102130,
      from_date: "2026-11-01",
      to_date: "2026-11-30",
      location_id: 10030,
      forcasted_by: "System",
      table: "daily",
    }));
  }, [dispatch]);

  const calSet = CAL_SETS.demand;
  // The month picker sits inside the calendar card (compactMonth), so there's no header row.
  return (
    <div>
      <DemandCalendar
        section="month" modes={calSet.modes} defaultMode={calSet.def}
        hideKpis externalData={demandData} loading={demandLoading} compactMonth
      />
    </div>
  );
}

/** All modules → Demand shows the same view as the Planning horizon. */
export const DemandMonthAheadModule = DemandMonthAhead;
