import { toast } from "sonner";
import { ALL_REPORTS, modName, tfName } from "@/data/engine";
import { REPORT_ABOUT, drill, reportBlocks } from "@/data/insights";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePanels } from "@/lib/panels";
import { Blocks } from "./blocks";

/** Centered popup: drill-down for a clicked period, or a report preview. */
export function SidePanel() {
  const { panel, close } = usePanels();
  let body: React.ReactNode = null, eyebrow = "", title = "";
  if (panel?.kind === "drill") {
    const d = drill(panel.mod, panel.tf, panel.i);
    eyebrow = modName(panel.mod, panel.tf) + " · " + tfName(panel.tf);
    title = d.label;
    body = (
      <>
        <Blocks blocks={d.blocks} tf={panel.tf} />
        {d.bid && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button onClick={() => toast.success(d.bid!.side + " bid staged for " + d.label, { description: "Sample only: nothing is sent to the exchange." })}>Stage {d.bid.side.toLowerCase()} bid</Button>
            <Button variant="outline" onClick={() => toast("Bid withdrawn for " + d.label)}>Withdraw bid</Button>
          </div>
        )}
      </>
    );
  } else if (panel?.kind === "report") {
    const r = ALL_REPORTS.find((x) => x.id === panel.id);
    eyebrow = "Report · " + tfName(panel.tf);
    title = r?.name ?? "Report";
    const blocks = reportBlocks(panel.id, panel.tf);
    body = (
      <>
        {blocks.length ? <Blocks blocks={blocks} tf={panel.tf} /> : <p className="text-sm text-muted-foreground">Tabular report.</p>}
        <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => toast("PDF export queued (sample)")}>Export PDF</Button>
          <Button variant="outline" onClick={() => toast("Excel export queued (sample)")}>Export Excel</Button>
          <Button variant="ghost" onClick={() => toast("Scheduled daily email (sample)")}>Email daily</Button>
        </div>
      </>
    );
    eyebrow += r ? " · " + r.group : "";
    if (REPORT_ABOUT[panel.id]) body = <><p className="mb-4 text-sm text-muted-foreground">{REPORT_ABOUT[panel.id]}</p>{body}</>;
  }
  return (
    <Dialog open={!!panel} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogDescription className="text-xs">{eyebrow}</DialogDescription>
          <DialogTitle className="condensed text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
