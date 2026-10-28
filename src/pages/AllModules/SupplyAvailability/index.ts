import type { ModulePages } from "../types";
import { SupplyAvailabilityOverview } from "./SupplyAvailabilityOverview";
import { SupplyAvailabilityRealTime, SupplyAvailabilityRealTimeModule } from "./SupplyAvailabilityRealTime";
import { SupplyAvailabilityIntraDay, SupplyAvailabilityIntraDayModule } from "./SupplyAvailabilityIntraDay";
import { SupplyAvailabilityDayAhead, SupplyAvailabilityDayAheadModule } from "./SupplyAvailabilityDayAhead";
import { SupplyAvailabilityWeekAhead, SupplyAvailabilityWeekAheadModule } from "./SupplyAvailabilityWeekAhead";
import { SupplyAvailabilityMonthAhead, SupplyAvailabilityMonthAheadModule } from "./SupplyAvailabilityMonthAhead";
import { SupplyAvailabilityYearAhead, SupplyAvailabilityYearAheadModule } from "./SupplyAvailabilityYearAhead";
import { SupplyAvailabilityLongTerm, SupplyAvailabilityLongTermModule } from "./SupplyAvailabilityLongTerm";

/** Every Supply Availability page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const SUPPLY_AVAILABILITY_PAGES: ModulePages = {
  Overview: SupplyAvailabilityOverview,
  horizons: {
    dr: { Plan: SupplyAvailabilityRealTime, Module: SupplyAvailabilityRealTimeModule },
    id: { Plan: SupplyAvailabilityIntraDay, Module: SupplyAvailabilityIntraDayModule },
    da: { Plan: SupplyAvailabilityDayAhead, Module: SupplyAvailabilityDayAheadModule },
    wk: { Plan: SupplyAvailabilityWeekAhead, Module: SupplyAvailabilityWeekAheadModule },
    mo: { Plan: SupplyAvailabilityMonthAhead, Module: SupplyAvailabilityMonthAheadModule },
    yr: { Plan: SupplyAvailabilityYearAhead, Module: SupplyAvailabilityYearAheadModule },
    lt: { Plan: SupplyAvailabilityLongTerm, Module: SupplyAvailabilityLongTermModule },
  },
};
