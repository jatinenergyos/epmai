import { tfName, type ModId, type TfId } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { CAL_SETS, DemandCalendar } from "@/components/DemandCalendar";

const MOD: ModId = "opt";
const TF: TfId = "mo";

/** Optimization & Scheduling · Month ahead — Planning-horizon view. */
export function OptimizationSchedulingMonthAhead() {
  const calSet = CAL_SETS[MOD];
  return (
    <>
      <PageHead title={<>{calSet.label} <span className="font-normal text-muted-foreground">· {tfName(TF)}</span></>} />
      <div className="mt-5">
        <DemandCalendar section="month" modes={calSet.modes} defaultMode={calSet.def} />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const OptimizationSchedulingMonthAheadModule = OptimizationSchedulingMonthAhead;
