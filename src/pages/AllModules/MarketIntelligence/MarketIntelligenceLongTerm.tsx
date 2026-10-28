import LoadGrid from "@/features/loadgrid/LoadGrid";
import { useState } from "react";
import { type ModId } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { cn } from "@/lib/utils";
import { EXCHANGES, MARKETS } from "../shared/HorizonControls";

const MOD: ModId = "mi";

/** Market Intelligence · Long term — Planning-horizon view. */
export function MarketIntelligenceLongTerm() {
  const [kind, setKind] = useState<"line" | "box">("line");
  // Market / Exchange are placeholders: they don't change the data yet.
  const [market, setMarket] = useState(MARKETS[0]);
  const [exchange, setExchange] = useState(EXCHANGES[0]);
  const KINDS: { id: "line" | "box"; label: string }[] = [
    { id: "line", label: "Load-profile grid" },
    { id: "box", label: "Box-plot grid" },
  ];

  const kindsToggle = (
    <div className="inline-flex rounded-md border bg-card p-0.5" role="tablist" aria-label="Grid type">
      {KINDS.map((k) => (
        <button
          key={k.id}
          role="tab"
          aria-selected={kind === k.id}
          onClick={() => setKind(k.id)}
          className={cn(
            "rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            kind === k.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {k.label}
        </button>
      ))}
    </div>
  );

  const marketControls = (
    <>
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
    </>
  );

  return (
    <>
      <PageHead title={null} />
      <div className="mt-3">
        {/* The grid-type toggle sits on the grid's own Month/Season + size line. No key here: the
            grid keeps its selection when you switch between the load-profile and box-plot charts. */}
        <LoadGrid kind={kind} mod={MOD} groupBy={null} leftControls={<>{marketControls}{kindsToggle}</>} />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const MarketIntelligenceLongTermModule = MarketIntelligenceLongTerm;
