import { Link, useParams } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";
import { CAD, MODS, TFS, isMod, modName, tfIdx, tfName, type Status } from "@/data/engine";
import { G, statusText } from "@/data/model";
import { SUBS, type SubVal } from "@/data/insights";
import { Spark } from "@/components/chart/Spark";
import { VizView } from "@/components/blocks";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Dot, Pill } from "@/components/status";
import { keepH } from "@/lib/horizon";
import { cn } from "@/lib/utils";
import { chartTitle } from "./Module";
import { NotFound } from "./NotFound";

/* status-coloured tile, matching the command-centre grid cells */
const CELL_CARD: Record<Status, string> = {
  crit: "border-bad/45 bg-bad-soft/40 hover:border-bad/80 hover:bg-bad-soft",
  warn: "border-warn/45 bg-warn-soft/30 hover:border-warn/80 hover:bg-warn-soft",
  info: "border-border bg-card hover:border-primary/60 hover:bg-accent",
  ok: "border-border bg-card hover:border-primary/60 hover:bg-accent",
};

/* frozen first column: a solid background plus a divider so it reads as pinned while scrolling */
const STICKY = "sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]";

/** The complete grid row for one module — every planning horizon, with its headline
 *  chart and all detail sub-rows — lifted out of the command centre onto its own page. */
export function ModuleRowPage() {
  const { moduleId } = useParams({ strict: false }) as { moduleId?: string };
  if (!isMod(moduleId)) return <NotFound />;
  const mod = moduleId, M = MODS.find((m) => m.id === mod)!, subs = SUBS[mod];

  return (
    <>
      <PageHead
        crumb={<><Link to="/" search={keepH} className="hover:text-foreground hover:underline">Command centre</Link> / Complete row</>}
        title={<>{M.name} <span className="font-normal text-muted-foreground">· every horizon</span></>}
      />

      {/* headline value for every horizon, at a glance */}
      <Kpis className="mt-5" items={TFS.map((t) => {
        const s = G(mod, t.id).sum;
        return { l: t.name, v: s.big, u: s.u, s: s.sub, st: s.st === "ok" ? undefined : s.st };
      })} />

      <Section className="mt-6" title="Full row · module × every horizon">
        <div className="scroll-x -mx-4 px-4 pb-1 sm:-mx-5 sm:px-5">
          <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col style={{ width: 200 }} />
              {TFS.map((t) => <col key={t.id} />)}
            </colgroup>

            <thead>
              <tr>
                <th className={cn(STICKY, "z-20 rounded-tl-lg border-y border-l border-border bg-muted/50 px-3 py-2.5 text-left align-bottom")}>
                  <div className="text-[13px] font-semibold leading-tight">{M.name}</div>
                  <div className="text-[11px] font-normal leading-tight text-muted-foreground">{M.sub}</div>
                </th>
                {TFS.map((t, i) => (
                  <th key={t.id} className={cn("border-y border-r border-border bg-muted/50 p-1 align-bottom", i === 0 && "border-l")}>
                    <Link to="/modules/$moduleId" params={{ moduleId: mod }} search={{ m: t.id }}
                      title={"Open " + modName(mod, t.id) + " · " + tfName(t.id)}
                      className="group flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent">
                      <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight">
                        <span className="truncate">{modName(mod, t.id)}</span>
                        <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                      <span className="truncate text-[11px] font-normal text-muted-foreground">{t.hz}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* summary row — headline chart per horizon */}
              <tr className="align-top">
                <th scope="row" className={cn(STICKY, "border-b border-l border-border px-3 py-3 text-left align-top")}>
                  <RowLabel title="Headline" desc={M.sub} />
                </th>
                {TFS.map((t, i) => {
                  const g = G(mod, t.id), s = g.sum, ti = tfIdx(t.id);
                  return (
                    <td key={t.id} className={cn("border-b border-r border-border p-2 align-top", i === 0 && "border-l")}>
                      <Link to="/modules/$moduleId" params={{ moduleId: mod }} search={{ m: t.id }}
                        title={"Open " + modName(mod, t.id) + " · " + tfName(t.id)}
                        className={cn("group/cell flex h-full flex-col rounded-lg border p-2.5 text-left shadow-sm transition-colors", CELL_CARD[s.st])}>
                        <span className="flex items-center gap-1.5">
                          <Dot st={s.st} />
                          <span className="num truncate text-[15px] font-semibold">{s.big}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">{s.u}</span>
                        </span>
                        {g.chart ? (
                          <span className="mt-2 block h-[92px]"><Spark spec={g.chart} height={92} /></span>
                        ) : (
                          <span className="mt-2 flex h-[92px] items-center text-[12px] leading-snug text-muted-foreground">{s.sub}</span>
                        )}
                        <span className="mt-2 flex items-center justify-between gap-1.5 border-t border-border/60 pt-2">
                          <span className="truncate text-[11px] text-muted-foreground">{chartTitle(mod, t.id) || CAD[mod][ti]}</span>
                          <Pill st={s.st} className="shrink-0">{statusText[s.st]}</Pill>
                        </span>
                      </Link>
                    </td>
                  );
                })}
              </tr>

              {/* one row per detail metric, across every horizon */}
              {subs.map((S, ri) => (
                <tr key={S.id} className="align-top">
                  <th scope="row" className={cn(STICKY, "border-b border-l border-border px-3 py-3 text-left align-top", ri % 2 === 0 && "bg-muted/20")}>
                    <RowLabel title={S.n} desc={S.d} />
                  </th>
                  {TFS.map((t, i) => (
                    <td key={t.id} className={cn("border-b border-r border-border p-2 align-top", i === 0 && "border-l", ri % 2 === 0 && "bg-muted/20")}>
                      <DetailCell v={S.f(t.id)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function RowLabel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-l-2 border-primary/50 pl-2.5">
      <div className="text-[13px] font-semibold leading-snug">{title}</div>
      <div className="mt-0.5 text-[11px] font-normal leading-snug text-muted-foreground">{desc}</div>
    </div>
  );
}

function DetailCell({ v }: { v: SubVal }) {
  return (
    <div className="flex h-full min-h-[92px] flex-col rounded-lg border border-border/60 bg-card px-2.5 py-2 shadow-sm">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="min-w-0 truncate">
          <span className="num text-[15px] font-semibold">{v.big}</span>
          {v.u && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{v.u}</span>}
        </span>
        {v.tag && <Pill st={v.tag[1]} className="shrink-0">{v.tag[0]}</Pill>}
      </div>
      {v.viz && <div className="mt-2">{<VizView v={v.viz} />}</div>}
      {v.sub && <div className="mt-auto pt-1.5 text-[11px] leading-snug text-muted-foreground">{v.sub}</div>}
    </div>
  );
}
