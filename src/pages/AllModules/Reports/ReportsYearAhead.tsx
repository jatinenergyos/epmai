import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TFS, modName, tfIdx, tfName, type ModId, type TfId } from "@/data/engine";
import { G } from "@/data/model";
import { PageHead } from "@/components/layout";
import { Pill } from "@/components/status";
import { ReportLibrary } from "@/components/ReportLibrary";
import { KeyDetails } from "../shared/ModuleSections";

const MOD: ModId = "reports";
const TF: TfId = "yr";

/** Reports · Year ahead — Planning-horizon view. */
export function ReportsYearAhead() {
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
        <ReportLibrary tf={TF} />
        <KeyDetails mod={MOD} tf={TF} />
      </div>
    </>
  );
}

/** All modules shows the same view as the Planning horizon. */
export const ReportsYearAheadModule = ReportsYearAhead;
