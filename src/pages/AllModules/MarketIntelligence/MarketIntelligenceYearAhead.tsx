import { useState } from "react";
import { PageHead } from "@/components/layout";
import { DemandCalendar } from "@/components/DemandCalendar";
import { EXCHANGES, MARKETS } from "../shared/HorizonControls";

/** Market Intelligence · Year ahead — Planning-horizon view. */
export function MarketIntelligenceYearAhead() {
  // Market / Exchange are placeholders: they don't change the data yet.
  const [market, setMarket] = useState(MARKETS[0]);
  const [exchange, setExchange] = useState(EXCHANGES[0]);
  return (
    <>
      <PageHead title={null} />
      <div className="mt-5">
        <DemandCalendar
          section="year" supplyFocus hideKpis
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
export const MarketIntelligenceYearAheadModule = MarketIntelligenceYearAhead;
