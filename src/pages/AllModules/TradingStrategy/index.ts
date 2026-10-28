import type { ModulePages } from "../types";
import { TradingStrategyOverview } from "./TradingStrategyOverview";
import { TradingStrategyRealTime, TradingStrategyRealTimeModule } from "./TradingStrategyRealTime";
import { TradingStrategyIntraDay, TradingStrategyIntraDayModule } from "./TradingStrategyIntraDay";
import { TradingStrategyDayAhead, TradingStrategyDayAheadModule } from "./TradingStrategyDayAhead";
import { TradingStrategyWeekAhead, TradingStrategyWeekAheadModule } from "./TradingStrategyWeekAhead";
import { TradingStrategyMonthAhead, TradingStrategyMonthAheadModule } from "./TradingStrategyMonthAhead";
import { TradingStrategyYearAhead, TradingStrategyYearAheadModule } from "./TradingStrategyYearAhead";
import { TradingStrategyLongTerm, TradingStrategyLongTermModule } from "./TradingStrategyLongTerm";

/** Every Trading Strategy page: Overview plus one per horizon (Plan = Planning horizon, Module = All modules). */
export const TRADING_STRATEGY_PAGES: ModulePages = {
  Overview: TradingStrategyOverview,
  horizons: {
    dr: { Plan: TradingStrategyRealTime, Module: TradingStrategyRealTimeModule },
    id: { Plan: TradingStrategyIntraDay, Module: TradingStrategyIntraDayModule },
    da: { Plan: TradingStrategyDayAhead, Module: TradingStrategyDayAheadModule },
    wk: { Plan: TradingStrategyWeekAhead, Module: TradingStrategyWeekAheadModule },
    mo: { Plan: TradingStrategyMonthAhead, Module: TradingStrategyMonthAheadModule },
    yr: { Plan: TradingStrategyYearAhead, Module: TradingStrategyYearAheadModule },
    lt: { Plan: TradingStrategyLongTerm, Module: TradingStrategyLongTermModule },
  },
};
