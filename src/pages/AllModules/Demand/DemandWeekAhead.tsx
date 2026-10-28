import { useEffect, useMemo, useState } from "react";
import { Section } from "@/components/layout";
import { WeekSupplyGrid } from "@/components/WeekSupplyGrid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchWeekDemandForecast } from "@/store/slice/demandApiSlice";
import { WeekBadge, getWeekRange } from "../shared/HorizonControls";

/** Demand · Week ahead — Planning-horizon view. */
export function DemandWeekAhead() {
  const dispatch = useAppDispatch();
  const { weekData, weekLoading } = useAppSelector((state) => state.demand);
  const [weekOffset, setWeekOffset] = useState(0);
  // The week grid lays its days out from the same Monday the week API is queried from.
  const currentMonday = useMemo(() => getWeekRange(0).mondayDate, []);

  useEffect(() => {
    const { from_date, to_date } = getWeekRange(weekOffset);
    dispatch(
      fetchWeekDemandForecast({
        data_id: 102120,
        from_date,
        to_date,
        location_id: 10030,
        forcasted_by: "System",
        table: "daily",
      })
    );
  }, [dispatch, weekOffset]);

  return (
    <div className="space-y-6">
      <Section action={<WeekBadge weekOffset={weekOffset} setWeekOffset={setWeekOffset} isDemand />}>
        <WeekSupplyGrid
          groupBy="category"
          weekOffset={weekOffset}
          mod="demand"
          externalData={weekData}
          loading={weekLoading}
          baseDate={currentMonday}
        />
      </Section>
    </div>
  );
}

/** All modules → Demand shows the same view as the Planning horizon. */
export const DemandWeekAheadModule = DemandWeekAhead;
