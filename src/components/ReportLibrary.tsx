import { DR_REPORTS, REPORTS, is96f, type TfId } from "@/data/engine";
import { REPORT_ABOUT, repChart } from "@/data/insights";
import { Spark } from "@/components/chart/Spark";
import { Pill } from "@/components/status";
import { usePanels } from "@/lib/panels";

/** Report cards grouped by type; used on the Reports page and inside the Reports module. */
export function ReportLibrary({ tf }: { tf: TfId }) {
  const { openReport } = usePanels();
  const list = tf === "dr" ? DR_REPORTS : REPORTS;
  const groups = [...new Set(list.map((r) => r.group))];
  const ready = tf === "dr" || is96f(tf);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 text-lg font-semibold">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.filter((r) => r.group === g).map((r) => {
              const c = repChart(r.id, tf);
              return (
                <button key={r.id} onClick={() => openReport(r.id, tf)}
                  className="flex min-w-0 flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/60">
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="font-semibold">{r.name}</span>
                    <Pill st={ready ? "ok" : "info"}>{ready ? "Ready" : "On demand"}</Pill>
                  </span>
                  <span className="mt-1 text-[13px] leading-snug text-muted-foreground">{REPORT_ABOUT[r.id]}</span>
                  <span className="mt-3 block h-12 w-full">
                    {c ? <Spark spec={c} height={48} /> : <span className="block pt-3 text-xs text-muted-foreground">Table report</span>}
                  </span>
                  <span className="mt-2 text-xs font-medium text-primary">Open report</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
