import type { ModId } from "@/data/engine";
import type { ModulePages } from "./types";
import { DEMAND_PAGES } from "./Demand";
import { SUPPLY_AVAILABILITY_PAGES } from "./SupplyAvailability";
import { NETWORK_PAGES } from "./Network";
import { MARKET_INTELLIGENCE_PAGES } from "./MarketIntelligence";
import { OPTIMIZATION_SCHEDULING_PAGES } from "./OptimizationScheduling";
import { TRADING_STRATEGY_PAGES } from "./TradingStrategy";
import { REPORTS_PAGES } from "./Reports";
import { ANALYTICS_PAGES } from "./Analytics";

/** Page registry: module → Overview + horizon pages. Each module's files live in AllModules/<Module>/. */
export const MODULE_PAGES: Record<ModId, ModulePages> = {
  demand: DEMAND_PAGES,
  supply: SUPPLY_AVAILABILITY_PAGES,
  network: NETWORK_PAGES,
  mi: MARKET_INTELLIGENCE_PAGES,
  opt: OPTIMIZATION_SCHEDULING_PAGES,
  trade: TRADING_STRATEGY_PAGES,
  reports: REPORTS_PAGES,
  analytics: ANALYTICS_PAGES,
};
