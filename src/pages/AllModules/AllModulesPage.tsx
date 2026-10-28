import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CAD, MODS, TFS, tfIdx, tfName } from "@/data/engine";
import { G } from "@/data/model";
import { Chart, Legend } from "@/components/chart/Chart";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { useModuleTf } from "@/lib/horizon";
import { usePanels } from "@/lib/panels";
import { chartTitle } from "@/pages/AllModules/shared/ModuleSections";
import { ReportLibrary } from "@/components/ReportLibrary";

/** Every module at one horizon, as a gallery of chart sections. The mirror of the Horizon page
 *  (one module across every horizon): here the time-horizon strip picks the horizon, and each
 *  module gets its own chart. Driven by the module horizon (?m), independent of the planning menu. */
export function AllModulesPage() {
  const { tf } = useModuleTf();
  const { openDrill } = usePanels();
  const ti = tfIdx(tf);

  return (
    <>
      <PageHead
        crumb={TFS[ti].hz}
        title={<>{tfName(tf)} <span className="font-normal text-muted-foreground">· all modules</span></>}
      >
        <Link to="/snapshot" search={{ h: tf }}
          className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-primary hover:underline">
          Open quick snapshot <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PageHead>

      {/* headline strip for every module, so the overview stays visible */}
      <Kpis className="mt-5" items={MODS.map((m) => {
        const s = G(m.id, tf).sum;
        return { l: m.name, v: s.big, u: s.u, s: s.sub, st: s.st === "ok" ? undefined : s.st };
      })} />

      <div className="mt-6 space-y-6">
        {MODS.map((m) => {
          const g = G(m.id, tf);
          return (
            <Section key={m.id} id={"mod-" + m.id} className="scroll-mt-40"
              title={<span className="flex items-center gap-2">{m.name} <Pill st={g.sum.st} /></span>}
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
