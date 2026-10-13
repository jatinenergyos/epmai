import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CAD, MODS, TFS, modName, tfIdx, tfName } from "@/data/engine";
import { G } from "@/data/model";
import { Chart, Legend } from "@/components/chart/Chart";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { useHorizon, useHorizonModule } from "@/lib/horizon";
import { usePanels } from "@/lib/panels";
import { chartTitle, KeyDetails } from "./Module";
import { ReportLibrary } from "./Reports";

/** The selected module (module strip) at the selected horizon (the "Planning horizon" header
 *  dropdown) — one view, not every horizon stacked. Module ruler picks the module; the planning
 *  horizon picks which single horizon to show. */
export function HorizonPage() {
  const { mod } = useHorizonModule();
  const { tf } = useHorizon();
  const { openDrill } = usePanels();
  const g = G(mod, tf);
  const ti = tfIdx(tf);

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
          {mod === "analytics" && (
            <Section title={<>Every module <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
              desc="The headline for each module at this horizon — open any for its full view.">
              <Kpis items={MODS.map((m) => {
                const s = G(m.id, tf).sum;
                return { l: m.name, v: s.big, u: s.u, s: s.sub, st: s.st === "ok" ? undefined : s.st };
              })} />
            </Section>
          )}
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
