import { PageHead } from "@/components/layout";
import { DemandCalendar } from "@/components/DemandCalendar";

/** Supply Availability · Year ahead — Planning-horizon view. */
export function SupplyAvailabilityYearAhead() {
  return (
    <>
      <PageHead title={null} />
      <div className="mt-5">
        <DemandCalendar
          section="year" supplyFocus hideKpis
        />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const SupplyAvailabilityYearAheadModule = SupplyAvailabilityYearAhead;
