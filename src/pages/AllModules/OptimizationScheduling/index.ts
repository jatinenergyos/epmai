import type { ModulePages } from "../types";
import { OptimizationSchedulingOverview } from "./OptimizationSchedulingOverview";
import { OptimizationSchedulingRealTime, OptimizationSchedulingRealTimeModule } from "./OptimizationSchedulingRealTime";
import { OptimizationSchedulingIntraDay, OptimizationSchedulingIntraDayModule } from "./OptimizationSchedulingIntraDay";
import { OptimizationSchedulingDayAhead, OptimizationSchedulingDayAheadModule } from "./OptimizationSchedulingDayAhead";
import { OptimizationSchedulingWeekAhead, OptimizationSchedulingWeekAheadModule } from "./OptimizationSchedulingWeekAhead";
import { OptimizationSchedulingMonthAhead, OptimizationSchedulingMonthAheadModule } from "./OptimizationSchedulingMonthAhead";
import { OptimizationSchedulingYearAhead, OptimizationSchedulingYearAheadModule } from "./OptimizationSchedulingYearAhead";
import { OptimizationSchedulingLongTerm, OptimizationSchedulingLongTermModule } from "./OptimizationSchedulingLongTerm";

/** Every Optimization & Scheduling page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const OPTIMIZATION_SCHEDULING_PAGES: ModulePages = {
  Overview: OptimizationSchedulingOverview,
  horizons: {
    dr: { Plan: OptimizationSchedulingRealTime, Module: OptimizationSchedulingRealTimeModule },
    id: { Plan: OptimizationSchedulingIntraDay, Module: OptimizationSchedulingIntraDayModule },
    da: { Plan: OptimizationSchedulingDayAhead, Module: OptimizationSchedulingDayAheadModule },
    wk: { Plan: OptimizationSchedulingWeekAhead, Module: OptimizationSchedulingWeekAheadModule },
    mo: { Plan: OptimizationSchedulingMonthAhead, Module: OptimizationSchedulingMonthAheadModule },
    yr: { Plan: OptimizationSchedulingYearAhead, Module: OptimizationSchedulingYearAheadModule },
    lt: { Plan: OptimizationSchedulingLongTerm, Module: OptimizationSchedulingLongTermModule },
  },
};
