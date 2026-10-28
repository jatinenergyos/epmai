import { useMemo, useState } from "react";
import { Section } from "@/components/layout";
import { WeekSupplyGrid } from "@/components/WeekSupplyGrid";
import { EXCHANGES, MARKETS, WeekBadge, getWeekRange } from "../shared/HorizonControls";

/** Market Intelligence · Week ahead — Planning-horizon view. */
// Reuses Supply's week grid.
export function MarketIntelligenceWeekAhead() {
  const [weekOffset, setWeekOffset] = useState(0);
  // Market / Exchange are placeholders: they don't change the data yet.
  const [market, setMarket] = useState(MARKETS[0]);
  const [exchange, setExchange] = useState(EXCHANGES[0]);
  const currentMonday = useMemo(() => getWeekRange(0).mondayDate, []);
  return (
    <div className="space-y-6">
      <Section
        title={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-[13px]">
              <span className="text-xs text-muted-foreground">Market:</span>
              <select
                aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)}
                className="h-8 rounded-md border bg-card px-2 text-[13px]"
              >
                {MARKETS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[13px]">
              <span className="text-xs text-muted-foreground">Exchange:</span>
              <select
                aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}
                className="h-8 rounded-md border bg-card px-2 text-[13px]"
              >
                {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>
        }
        action={<WeekBadge weekOffset={weekOffset} setWeekOffset={setWeekOffset} />}
      >
        <WeekSupplyGrid
          groupBy="category"
          weekOffset={weekOffset}
          mod="supply"
          loading={false}
          baseDate={currentMonday}
        />
      </Section>
    </div>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const MarketIntelligenceWeekAheadModule = MarketIntelligenceWeekAhead;
