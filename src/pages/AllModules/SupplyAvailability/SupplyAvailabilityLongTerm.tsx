import LoadGrid from "@/features/loadgrid/LoadGrid";
import { useState } from "react";
import { type ModId } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { cn } from "@/lib/utils";
import { GraphTypeSelect } from "@/features/loadgrid/GraphTypeSelect";
import type { GroupBy } from "@/features/loadgrid/breakdown";

const MOD: ModId = "supply";

/** Supply Availability · Long term — Planning-horizon view. */
export function SupplyAvailabilityLongTerm() {
  const [kind, setKind] = useState<"line" | "box">("line");
  // Graph Type is a placeholder: the grid always plots the aggregate Total supply (DC).
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
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

  return (
    <>
      <PageHead title={null} after={<GraphTypeSelect value={groupBy} onChange={setGroupBy} className="ml-auto" />} />
      <div className="mt-3">
        {/* The grid-type toggle sits on the grid's own Month/Season + size line. No key here: the
            grid keeps its selection when you switch between the load-profile and box-plot charts. */}
        <LoadGrid kind={kind} mod={MOD} groupBy={null} leftControls={kindsToggle} />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const SupplyAvailabilityLongTermModule = SupplyAvailabilityLongTerm;
