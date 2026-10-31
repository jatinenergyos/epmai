import { MarketDetailPage } from "@/components/marketdetail/MarketDetailPage";

/** Market Intelligence · Day-ahead — Planning-horizon view: Market Detail (RTM / DAM / GDAM /
 *  HPDAM clearing by exchange). */
export function MarketIntelligenceDayAhead() {
  return <MarketDetailPage />;
}

/** All modules shows the same view as the Planning horizon. */
export const MarketIntelligenceDayAheadModule = MarketIntelligenceDayAhead;
