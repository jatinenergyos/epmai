import type { Status } from "@/data/engine";
import { cn } from "@/lib/utils";

const STYLE: Record<Status, string> = {
  ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", crit: "bg-bad-soft text-bad", info: "bg-info-soft text-info",
};
const LABEL: Record<Status, string> = { ok: "On track", warn: "Watch", crit: "Act now", info: "Info" };
const DOT: Record<Status, string> = { ok: "bg-ok", warn: "bg-warn", crit: "bg-bad", info: "bg-info" };

export function Pill({ st, children, className }: { st: Status; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold", STYLE[st], className)}>
      {children ?? LABEL[st]}
    </span>
  );
}
export function Dot({ st, className }: { st: Status; className?: string }) {
  return <span aria-label={LABEL[st]} className={cn("inline-block h-2 w-2 shrink-0 rounded-full", DOT[st], className)} />;
}
