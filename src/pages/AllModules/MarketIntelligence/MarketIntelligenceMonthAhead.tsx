import { useRef, useState } from "react";
import { type ModId } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { CAL_SETS, DemandCalendar } from "@/components/DemandCalendar";
import { EXCHANGES, MARKETS } from "../shared/HorizonControls";

const MOD: ModId = "mi";

/** Market Intelligence · Month ahead — Planning-horizon view. */
export function MarketIntelligenceMonthAhead() {
  const calSet = CAL_SETS[MOD];
  const monthBarSlotRef = useRef<HTMLDivElement>(null);
  // Market / Exchange are placeholders: they don't change the data yet.
  const [market, setMarket] = useState(MARKETS[0]);
  const [exchange, setExchange] = useState(EXCHANGES[0]);
  return (
    <>
      {/* The month picker is lifted into the header. "dc-root" on the portal target re-establishes
          DemandCalendar's scoped CSS for it — a portal moves DOM, not the React tree. */}
      <PageHead title={null} after={<div ref={monthBarSlotRef} className="dc-root flex-1" />} />
      <div className="mt-5">
        <DemandCalendar
          section="month" modes={calSet.modes} defaultMode={calSet.def}
          monthBarPortalRef={monthBarSlotRef} hideKpis hideSrcSelect
          extraControls={
          <>
            <div className="dc-seg" role="group" aria-label="Market">
              <label className="dc-note" style={{ margin: 0, padding: "0 8px", alignSelf: "center" }}>Market</label>
              <select aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)}>
                {MARKETS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="dc-seg" role="group" aria-label="Exchange">
              <label className="dc-note" style={{ margin: 0, padding: "0 8px", alignSelf: "center" }}>Exchange</label>
              <select aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}>
                {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </>
          }
        />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const MarketIntelligenceMonthAheadModule = MarketIntelligenceMonthAhead;
