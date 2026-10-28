import type { ModulePages } from "../types";
import { NetworkOverview } from "./NetworkOverview";
import { NetworkRealTime, NetworkRealTimeModule } from "./NetworkRealTime";
import { NetworkIntraDay, NetworkIntraDayModule } from "./NetworkIntraDay";
import { NetworkDayAhead, NetworkDayAheadModule } from "./NetworkDayAhead";
import { NetworkWeekAhead, NetworkWeekAheadModule } from "./NetworkWeekAhead";
import { NetworkMonthAhead, NetworkMonthAheadModule } from "./NetworkMonthAhead";
import { NetworkYearAhead, NetworkYearAheadModule } from "./NetworkYearAhead";
import { NetworkLongTerm, NetworkLongTermModule } from "./NetworkLongTerm";

/** Every Network page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const NETWORK_PAGES: ModulePages = {
  Overview: NetworkOverview,
  horizons: {
    dr: { Plan: NetworkRealTime, Module: NetworkRealTimeModule },
    id: { Plan: NetworkIntraDay, Module: NetworkIntraDayModule },
    da: { Plan: NetworkDayAhead, Module: NetworkDayAheadModule },
    wk: { Plan: NetworkWeekAhead, Module: NetworkWeekAheadModule },
    mo: { Plan: NetworkMonthAhead, Module: NetworkMonthAheadModule },
    yr: { Plan: NetworkYearAhead, Module: NetworkYearAheadModule },
    lt: { Plan: NetworkLongTerm, Module: NetworkLongTermModule },
  },
};
