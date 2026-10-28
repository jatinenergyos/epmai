import type { ModulePages } from "../types";
import { DemandOverview } from "./DemandOverview";
import { DemandRealTime, DemandRealTimeModule } from "./DemandRealTime";
import { DemandIntraDay, DemandIntraDayModule } from "./DemandIntraDay";
import { DemandDayAhead, DemandDayAheadModule } from "./DemandDayAhead";
import { DemandWeekAhead, DemandWeekAheadModule } from "./DemandWeekAhead";
import { DemandMonthAhead, DemandMonthAheadModule } from "./DemandMonthAhead";
import { DemandYearAhead, DemandYearAheadModule } from "./DemandYearAhead";
import { DemandLongTerm, DemandLongTermModule } from "./DemandLongTerm";

/** Every Demand page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const DEMAND_PAGES: ModulePages = {
  Overview: DemandOverview,
  horizons: {
    dr: { Plan: DemandRealTime, Module: DemandRealTimeModule },
    id: { Plan: DemandIntraDay, Module: DemandIntraDayModule },
    da: { Plan: DemandDayAhead, Module: DemandDayAheadModule },
    wk: { Plan: DemandWeekAhead, Module: DemandWeekAheadModule },
    mo: { Plan: DemandMonthAhead, Module: DemandMonthAheadModule },
    yr: { Plan: DemandYearAhead, Module: DemandYearAheadModule },
    lt: { Plan: DemandLongTerm, Module: DemandLongTermModule },
  },
};
