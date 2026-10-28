import type { ModulePages } from "../types";
import { ReportsOverview } from "./ReportsOverview";
import { ReportsRealTime, ReportsRealTimeModule } from "./ReportsRealTime";
import { ReportsIntraDay, ReportsIntraDayModule } from "./ReportsIntraDay";
import { ReportsDayAhead, ReportsDayAheadModule } from "./ReportsDayAhead";
import { ReportsWeekAhead, ReportsWeekAheadModule } from "./ReportsWeekAhead";
import { ReportsMonthAhead, ReportsMonthAheadModule } from "./ReportsMonthAhead";
import { ReportsYearAhead, ReportsYearAheadModule } from "./ReportsYearAhead";
import { ReportsLongTerm, ReportsLongTermModule } from "./ReportsLongTerm";

/** Every Reports page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const REPORTS_PAGES: ModulePages = {
  Overview: ReportsOverview,
  horizons: {
    dr: { Plan: ReportsRealTime, Module: ReportsRealTimeModule },
    id: { Plan: ReportsIntraDay, Module: ReportsIntraDayModule },
    da: { Plan: ReportsDayAhead, Module: ReportsDayAheadModule },
    wk: { Plan: ReportsWeekAhead, Module: ReportsWeekAheadModule },
    mo: { Plan: ReportsMonthAhead, Module: ReportsMonthAheadModule },
    yr: { Plan: ReportsYearAhead, Module: ReportsYearAheadModule },
    lt: { Plan: ReportsLongTerm, Module: ReportsLongTermModule },
  },
};
