import type { ModulePages } from "../types";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { AnalyticsRealTime, AnalyticsRealTimeModule } from "./AnalyticsRealTime";
import { AnalyticsIntraDay, AnalyticsIntraDayModule } from "./AnalyticsIntraDay";
import { AnalyticsDayAhead, AnalyticsDayAheadModule } from "./AnalyticsDayAhead";
import { AnalyticsWeekAhead, AnalyticsWeekAheadModule } from "./AnalyticsWeekAhead";
import { AnalyticsMonthAhead, AnalyticsMonthAheadModule } from "./AnalyticsMonthAhead";
import { AnalyticsYearAhead, AnalyticsYearAheadModule } from "./AnalyticsYearAhead";
import { AnalyticsLongTerm, AnalyticsLongTermModule } from "./AnalyticsLongTerm";

/** Every Analytics page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const ANALYTICS_PAGES: ModulePages = {
  Overview: AnalyticsOverview,
  horizons: {
    dr: { Plan: AnalyticsRealTime, Module: AnalyticsRealTimeModule },
    id: { Plan: AnalyticsIntraDay, Module: AnalyticsIntraDayModule },
    da: { Plan: AnalyticsDayAhead, Module: AnalyticsDayAheadModule },
    wk: { Plan: AnalyticsWeekAhead, Module: AnalyticsWeekAheadModule },
    mo: { Plan: AnalyticsMonthAhead, Module: AnalyticsMonthAheadModule },
    yr: { Plan: AnalyticsYearAhead, Module: AnalyticsYearAheadModule },
    lt: { Plan: AnalyticsLongTerm, Module: AnalyticsLongTermModule },
  },
};
