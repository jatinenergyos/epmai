import { ChevronLeft, ChevronRight } from "lucide-react";
import { weekLabel } from "./weekSupplyData";

/** ‹ label › — moves one Monday–Sunday week at a time; › is disabled when `canNext` is false. */
export function WeekNavigator({ monday, onShift, canNext = true }: { monday: Date; onShift: (dir: -1 | 1) => void; canNext?: boolean }) {
  const btn = "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border bg-card p-0.5 text-[12px]">
      <button type="button" aria-label="Previous week" className={btn} onClick={() => onShift(-1)}><ChevronLeft className="h-3.5 w-3.5" /></button>
      <span className="min-w-[15rem] whitespace-nowrap px-2 text-center font-medium">{weekLabel(monday)}</span>
      <button type="button" aria-label="Next week" className={btn} disabled={!canNext} onClick={() => onShift(1)}><ChevronRight className="h-3.5 w-3.5" /></button>
    </div>
  );
}
