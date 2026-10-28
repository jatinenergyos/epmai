import LoadGrid from "@/features/loadgrid/LoadGrid";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CAD, MODS, TFS, modName, tfIdx, tfName, type TfId } from "@/data/engine";
import { G } from "@/data/model";
import { Chart, Legend } from "@/components/chart/Chart";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { CAL_SETS, DemandCalendar } from "@/components/DemandCalendar";
import { usePanels } from "@/lib/panels";
import { cn } from "@/lib/utils";
import { LG_SETS } from "@/features/loadgrid/data";
import { ReportLibrary } from "@/components/ReportLibrary";
import { chartTitle } from "@/pages/AllModules/shared/ModuleSections";
import { useHorizon, useHorizonModule } from "@/lib/horizon";
import { MODULE_PAGES } from "@/pages/AllModules";

/** Planning horizon (/horizon): a module's page comes from AllModules/<Module>/<Module><Horizon>.tsx;
 *  the Overview tab (every module at the horizon) is laid out here. */
export function PlanningHorizonPage() {
  const { mod } = useHorizonModule();
  const { tf } = useHorizon();
  if (mod !== "overview") {
    const Page = MODULE_PAGES[mod].horizons[tf].Plan;
    return <Page />;
  }
  if (tf === "mo") return <OverviewMonthAhead />;
  if (tf === "yr") return <OverviewYearAhead />;
  if (tf === "lt") return <OverviewLongTerm />;
  return <OverviewGallery tf={tf} />;
}

const MOD = "overview";

/** Overview · Month ahead: the demand calendar. */
export function OverviewMonthAhead() {
  const calSet = CAL_SETS[MOD];
  return (
    <>
      <PageHead title={<>{calSet.label} <span className="font-normal text-muted-foreground">· {tfName("mo")}</span></>} />
      <div className="mt-5">
        <DemandCalendar section="month" modes={calSet.modes} defaultMode={calSet.def} />
      </div>
    </>
  );
}

/** Overview · Year ahead: the demand-vs-supply year calendar. */
export function OverviewYearAhead() {
  return (
    <>
      <PageHead
        crumb={TFS[tfIdx("yr")].hz}
        title={<>{CAL_SETS[MOD].label} <span className="font-normal text-muted-foreground">· {tfName("yr")}</span></>}
      />
      <div className="mt-5">
        <DemandCalendar section="year" />
      </div>
    </>
  );
}

/** Overview · Long term: the load-profile / box-plot grids. */
export function OverviewLongTerm() {
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
      <PageHead title={<>{cfg.label} grids <span className="font-normal text-muted-foreground">· {tfName("lt")}</span></>} />
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

/** Overview: every module at the selected horizon, as a gallery of chart sections. */
function OverviewGallery({ tf }: { tf: TfId }) {
  const { openDrill } = usePanels();
  const ti = tfIdx(tf);
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
