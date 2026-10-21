// The "Graph Type" picker (Category / Technology / Variable Cost / Plants) — one
// component shared by every page that offers this declared-capacity breakdown
// (Long-term grids, Month-ahead calendar, Week-ahead grid), so they render and
// behave identically instead of each hand-rolling its own dropdown.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GROUP_OPTIONS, type GroupBy } from "./breakdown";

export function GraphTypeSelect({ value, onChange, className, showLabel = true }: { value: GroupBy; onChange: (g: GroupBy) => void; className?: string; showLabel?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as GroupBy)}>
      <SelectTrigger aria-label="Graph Type" className={cn("h-8 w-auto min-w-[172px] gap-1.5 text-[13px]", className)}>
        {showLabel && <span className="text-xs text-muted-foreground">Graph Type:&nbsp;</span>}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GROUP_OPTIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
