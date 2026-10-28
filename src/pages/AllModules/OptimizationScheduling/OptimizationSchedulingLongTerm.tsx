import LoadGrid from "@/features/loadgrid/LoadGrid";
import { useState } from "react";
import { tfName, type ModId, type TfId } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { cn } from "@/lib/utils";
import { LG_SETS } from "@/features/loadgrid/data";

const MOD: ModId = "opt";
const TF: TfId = "lt";

/** Optimization & Scheduling · Long term — Planning-horizon view. */
export function OptimizationSchedulingLongTerm() {
  const [kind, setKind] = useState<"line" | "box">("line");
  const cfg = LG_SETS[MOD];
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
      <PageHead title={<>{cfg.label} grids <span className="font-normal text-muted-foreground">· {tfName(TF)}</span></>} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kindsToggle}
      </div>
      <div className="mt-3">
        {/* No key here: the grid keeps its Month/Season/Week + size selection when you switch
            between the load-profile and box-plot charts. */}
        <LoadGrid kind={kind} mod={MOD} groupBy={null} />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const OptimizationSchedulingLongTermModule = OptimizationSchedulingLongTerm;
