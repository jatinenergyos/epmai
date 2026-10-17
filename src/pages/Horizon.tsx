import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CAD, MODS, TFS, modName, tfIdx, tfName } from "@/data/engine";
import { G } from "@/data/model";
import { Chart, Legend } from "@/components/chart/Chart";
import { CAL_SETS, DemandCalendar } from "@/components/DemandCalendar";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { useHorizon, useHorizonModule } from "@/lib/horizon";
import { usePanels } from "@/lib/panels";
import { cn } from "@/lib/utils";
import LoadGrid, { hasLoadGrid } from "@/features/loadgrid/LoadGrid";
import { LG_SETS } from "@/features/loadgrid/data";
import { chartTitle, KeyDetails } from "./Module";
import { ReportLibrary } from "./Reports";

/** The selected module (module strip) at the selected horizon (the "Planning horizon" header
 *  dropdown) — one view, not every horizon stacked. Module ruler picks the module; the planning
 *  horizon picks which single horizon to show. */
export function HorizonPage() {
  const { mod } = useHorizonModule();
  const { tf } = useHorizon();
  const { openDrill } = usePanels();
  const ti = tfIdx(tf);

  // Month ahead on the Planning-horizon page is the UP DC demand calendar, scoped to the focused
  // module: the Demand data lives under Demand, supply data under Supply, surplus/deficit under
  // Optimization; the all-module Overview keeps every mode.
  const calSet = CAL_SETS[mod];
  if (tf === "mo" && calSet) {
    return (
      <>
        <PageHead
          crumb={TFS[ti].hz}
          title={<>{calSet.label} <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
        >
          <p className="pt-1 text-[13px] text-muted-foreground">
            UP declared-capacity vs demand, every day of the month.
            {calSet.modes.length > 1 ? " Pick a mode," : ""} hover any day for block values, or click a day to open it full size.
          </p>
        </PageHead>
        <div className="mt-5"><DemandCalendar section="month" modes={calSet.modes} defaultMode={calSet.def} /></div>
      </>
    );
  }

  // Year ahead stays the holistic demand-vs-supply calendar; shown for Overview and Demand.
  if (tf === "yr" && (mod === "overview" || mod === "demand")) {
    return (
      <>
        <PageHead
          crumb={TFS[ti].hz}
          title={<>Demand calendar <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
        >
          <p className="pt-1 text-[13px] text-muted-foreground">
            UP declared-capacity vs demand across the whole year. Hover the charts or grid for values; click a day to open it full size, or a month to jump to its calendar.
          </p>
        </PageHead>
        <div className="mt-5"><DemandCalendar section="year" /></div>
      </>
    );
  }

  // Long term: the load-profile / box-plot small-multiples grids (ported from the
  // EPM Demand views), one mini-chart per month/week, years as rows. The series
  // shown follows the focused module — demand, declared-capacity supply, or
  // surplus/deficit. Modules without a load series fall through to the gallery.
  if (tf === "lt" && hasLoadGrid(mod)) {
    return <LongTermGrids mod={mod} ti={ti} tf={tf} />;
  }

  // Overview: every module at the selected horizon, as a gallery of chart sections.
  if (mod === "overview") {
    return (
      <>
        <PageHead
          crumb={TFS[ti].hz}
          title={<>Overview <span className="font-normal text-muted-foreground">· {tfName(tf)} · all modules</span></>}
        >
          <p className="pt-1 text-[13px] text-muted-foreground">The headline for each module at this horizon — pick a module above, or open any for its full view.</p>
        </PageHead>

        <Kpis className="mt-5" items={MODS.map((m) => {
          const s = G(m.id, tf).sum;
          return { l: m.name, v: s.big, u: s.u, s: s.sub, st: s.st === "ok" ? undefined : s.st };
        })} />

        <div className="mt-6 space-y-6">
          {MODS.map((m) => {
            const g = G(m.id, tf);
            return (
              <Section key={m.id}
                title={<span className="flex items-center gap-2">{modName(m.id)} <Pill st={g.sum.st} /></span>}
                desc={"Refresh: " + CAD[m.id][ti] + (g.chart ? " · " + chartTitle(m.id, tf) : "")}
                action={<Link to="/modules/$moduleId" params={{ moduleId: m.id }} search={{ m: tf }} className="text-[13px] font-medium text-primary hover:underline">Open module</Link>}>
                {m.id === "reports" ? <ReportLibrary tf={tf} /> : g.chart ? (
                  <div className="space-y-4">
                    <Kpis items={g.kpis!.slice(0, 5)} />
                    <Legend spec={g.chart} />
                    <Chart spec={g.chart} height={240} onPick={(i) => openDrill(m.id, tf, i)} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{g.sum.sub}</p>
                )}
              </Section>
            );
          })}
        </div>
      </>
    );
  }

  const g = G(mod, tf);

  return (
    <>
      <PageHead
        crumb={TFS[ti].hz}
        title={<>{modName(mod)} <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
        after={<Pill st={g.sum.st} />}
      >
        <Link to="/modules/$moduleId/row" params={{ moduleId: mod }} search={{}}
          className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-primary hover:underline">
          See this module across every horizon <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PageHead>

      {mod === "reports" ? (
        <div className="mt-6 space-y-6">
          <ReportLibrary tf={tf} />
          <KeyDetails mod={mod} tf={tf} />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {g.kpis && <Kpis items={g.kpis} />}
          <Section title={chartTitle(mod, tf)} desc={"Refresh: " + CAD[mod][ti]}>
            {g.chart ? (
              <>
                <Legend spec={g.chart} />
                <div className="mt-3"><Chart spec={g.chart} height={340} onPick={(i) => openDrill(mod, tf, i)} /></div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{g.sum.sub}</p>
            )}
          </Section>
          <KeyDetails mod={mod} tf={tf} />
        </div>
      )}
    </>
  );
}

/** Long-term view: the two ported EPM grids (Load-profile + Box-plot) with a
 *  toggle between them, scoped to the focused module's series. */
function LongTermGrids({ mod, ti, tf }: { mod: string; ti: number; tf: import("@/data/engine").TfId }) {
  const [kind, setKind] = useState<"line" | "box">("line");
  const cfg = LG_SETS[mod] ?? LG_SETS.demand;
  const KINDS: { id: "line" | "box"; label: string }[] = [
    { id: "line", label: "Load-profile grid" },
    { id: "box", label: "Box-plot grid" },
  ];
  return (
    <>
      <PageHead
        crumb={TFS[ti].hz}
        title={<>{cfg.label} grids <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
      >
        <p className="pt-0.5 text-[13px] text-muted-foreground">{cfg.sub} · years as rows, one chart per month or week.</p>
      </PageHead>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
      </div>

      <div className="mt-3">
        {/* No key here: the grid keeps its Month/Season/Week + size selection when you
            switch between the load-profile and box-plot charts (the inner charts re-key
            themselves on kind/series/period, so they still refresh correctly). */}
        <LoadGrid kind={kind} mod={mod} />
      </div>
    </>
  );
}
