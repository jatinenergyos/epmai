import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CAD, TFS, modName, tfIdx, tfName, type ModId, type TfId } from "@/data/engine";
import { G } from "@/data/model";
import { Chart, Legend } from "@/components/chart/Chart";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { usePanels } from "@/lib/panels";
import { chartTitle } from "../shared/ModuleSections";

const MOD: ModId = "trade";
const TF: TfId = "mo";

/** Trading Strategy · Month ahead — Planning-horizon view. */
export function TradingStrategyMonthAhead() {
  const { openDrill } = usePanels();
  const ti = tfIdx(TF), g = G(MOD, TF);
  return (
    <>
      <PageHead
        crumb={TFS[ti].hz}
        title={<>{modName(MOD)} <span className="font-normal text-muted-foreground">· {tfName(TF)}</span></>}
        after={<Pill st={g.sum.st} />}
      >
        <Link to="/modules/$moduleId/row" params={{ moduleId: MOD }} search={{}}
          className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-primary hover:underline">
          See this module across every horizon <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PageHead>

      <div className="mt-6 space-y-6">
        {g.kpis && <Kpis items={g.kpis} />}
        <Section title={chartTitle(MOD, TF)} desc={"Refresh: " + CAD[MOD][ti]}>
          {g.chart ? (
            <>
              <Legend spec={g.chart} />
              <div className="mt-3">
                <Chart spec={g.chart} height={340} onPick={(i) => openDrill(MOD, TF, i)} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{g.sum.sub}</p>
          )}
        </Section>
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const TradingStrategyMonthAheadModule = TradingStrategyMonthAhead;
