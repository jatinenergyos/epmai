import { Link, useLocation } from "@tanstack/react-router";
import { TFS, isMod, type ModId } from "@/data/engine";
import { keepH, useModuleTf } from "@/lib/horizon";
import { cn } from "@/lib/utils";

const segCls = (k: number, last: boolean) =>
  cn("ruler-seg px-2 py-1.5 text-left transition-colors hover:bg-accent",
    k > 0 && "border-l", k === 0 && "rounded-l-[5px]", last && "rounded-r-[5px]");

/** Time-horizon strip for a module page: pick which planning horizon the current module is shown
 *  at (drives ?m). Leads with an "Overview" tab — scoped to the selected module (its complete
 *  "every horizon" view) when one is open, or the all-module Overview page at the top level. */
export function HorizonStrip() {
  const { tf, setTf } = useModuleTf();
  const { pathname } = useLocation();
  const parts = pathname.split("/");
  const mod: ModId | undefined = parts[1] === "modules" && isMod(parts[2]) ? parts[2] : undefined;
  const onRow = !!mod && parts[3] === "row";
  const onOverview = pathname === "/overview";
  const overviewActive = onOverview || onRow;
  // A horizon click changes ?m in place on the single-module page and the all-modules gallery;
  // from an overview view it navigates to that module (or the gallery) at the chosen horizon.
  const inPlace = pathname === "/modules" || (!!mod && !onRow);
  const total = TFS.length + 1;

  const ovLabel = (
    <>
      <span className="block truncate text-[13px] font-semibold leading-tight">Overview</span>
      <span className={cn("block truncate text-[11px] leading-tight", overviewActive ? "opacity-85" : "text-muted-foreground")}>{mod ? "Every horizon" : "At a glance"}</span>
    </>
  );

  return (
    <div className="flex items-center gap-3">
      <span className="hidden shrink-0 text-xs text-muted-foreground xl:block">Planning horizon</span>
      <div role="group" aria-label="Planning horizon" className="scroll-x -mx-1 flex-1 px-1 pb-2">
        <div className="grid overflow-visible rounded-md border bg-card"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))`, minWidth: total * 92 }}>
          {/* Overview — the selected module's complete view, or the all-module Overview page */}
          {mod ? (
            <Link to="/modules/$moduleId/row" params={{ moduleId: mod }} data-on={overviewActive} aria-current={overviewActive ? "page" : undefined} className={segCls(0, false)}>{ovLabel}</Link>
          ) : (
            <Link to="/overview" search={keepH} data-on={overviewActive} aria-current={overviewActive ? "page" : undefined} className={segCls(0, false)}>{ovLabel}</Link>
          )}

          {TFS.map((t, i) => {
            const k = i + 1, last = k === total - 1, on = !overviewActive && t.id === tf;
            const label = (
              <>
                <span className="block truncate text-[13px] font-semibold leading-tight">{t.name}</span>
                <span className={cn("block truncate text-[11px] leading-tight", on ? "opacity-85" : "text-muted-foreground")}>{t.span}</span>
              </>
            );
            if (inPlace) {
              return <button key={t.id} type="button" role="radio" aria-checked={on} data-on={on} onClick={() => setTf(t.id)} className={segCls(k, last)}>{label}</button>;
            }
            return mod ? (
              <Link key={t.id} to="/modules/$moduleId" params={{ moduleId: mod }} search={{ m: t.id }} data-on={on} className={segCls(k, last)}>{label}</Link>
            ) : (
              <Link key={t.id} to="/modules" search={{ m: t.id }} data-on={on} className={segCls(k, last)}>{label}</Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
