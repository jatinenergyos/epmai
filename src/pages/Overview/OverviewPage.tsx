import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Info, OctagonAlert } from "lucide-react";
import { CAD, MODS, NOW, TFS, dLabel, modName, nowB, tfIdx, tfName, type Status } from "@/data/engine";
import { G, alerts, homeKpis } from "@/data/model";
import { recs } from "@/data/insights";
import { Spark } from "@/components/chart/Spark";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Dot, Pill } from "@/components/status";
import { keepH, useHorizon } from "@/lib/horizon";
import { cn } from "@/lib/utils";

const ALERT_ICON: Record<Status, typeof Info> = { crit: OctagonAlert, warn: AlertTriangle, info: Info, ok: Info };
const ALERT_TONE: Record<Status, string> = { crit: "text-bad", warn: "text-warn", info: "text-info", ok: "text-ok" };

export function OverviewPage() {
  const { tf, setTf } = useHorizon();
  const ti = tfIdx(tf);
  const nextSteps = recs("trade", tf).slice(0, 3);

  return (
    <>
      <PageHead
        crumb={dLabel(NOW) + " · Block " + (nowB + 1) + " of 96"}
        title="Power purchase at a glance"
      />

      <Kpis items={homeKpis()} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Plan for {tfName(tf).toLowerCase()} <span className="font-normal text-muted-foreground">· {TFS[ti].hz}</span></h2>
            <Link to="/horizon" search={keepH} className="text-[13px] font-medium text-primary hover:underline">See every chart for this horizon</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {MODS.map((m) => {
              const g = G(m.id, tf), s = g.sum;
              return (
                <Link key={m.id} to="/modules/$moduleId" params={{ moduleId: m.id }} search={{ m: tf }}
                  className="group flex min-w-0 flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{modName(m.id, tf)}</h3>
                      <p className="text-[13px] leading-snug text-muted-foreground">{m.question}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <div className="num mt-3 text-2xl font-semibold leading-none">
                    {s.big}<span className="ml-1 text-xs font-normal text-muted-foreground">{s.u}</span>
                  </div>
                  <div className="mt-2 h-11">
                    {g.chart ? <Spark spec={g.chart} height={44} /> : <p className="text-xs text-muted-foreground">Operational, commercial and performance reports</p>}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{s.sub}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
                    <Pill st={s.st} />
                    <span className="truncate text-[11px] text-muted-foreground">Refresh: {CAD[m.id][ti]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Needs attention">
            <ul className="space-y-2">
              {alerts().map((a) => {
                const Icon = ALERT_ICON[a.st];
                return (
                  <li key={a.title}>
                    <Link to="/modules/$moduleId" params={{ moduleId: a.mod }} search={{ m: a.tf }}
                      className="flex gap-3 rounded-md border p-3 transition-colors hover:bg-accent">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ALERT_TONE[a.st])} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold">{a.title}</span>
                        <span className="block text-[13px] leading-snug text-muted-foreground">{a.text}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title={"Suggested next steps"}>
            <ol className="space-y-3">
              {nextSteps.map((r, k) => (
                <li key={r.t} className="grid grid-cols-[22px_1fr] gap-2">
                  <span className="num grid h-[22px] w-[22px] place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{k + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-snug">{r.t}</span>
                    <span className="block text-xs text-muted-foreground">{r.w}</span>
                    <span className="num mt-0.5 block text-xs"><b className="text-ok">{r.imp}</b> impact · {r.cf}% confidence</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link to="/modules/$moduleId" params={{ moduleId: "trade" }} search={{ m: tf }} className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">Review in Trading Strategy</Link>
          </Section>
        </div>
      </div>

      <Section className="mt-6" title="Every horizon at a glance"
        desc="Click a cell to open it, or a column heading to switch the whole app to that horizon.">
        <div className="scroll-x -mx-4 px-4 sm:-mx-5 sm:px-5">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card py-2 pr-3 text-left text-xs font-medium text-muted-foreground">Module</th>
                {TFS.map((t) => (
                  <th key={t.id} className={cn("px-1 py-1 text-left", t.id === tf && "rounded-t-md bg-accent")}>
                    <button onClick={() => setTf(t.id)} className="w-full rounded px-1.5 py-1 text-left hover:bg-accent">
                      <span className="block text-[13px] font-semibold">{t.name}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">{t.span}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODS.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="sticky left-0 z-10 border-t bg-card py-2 pr-3 text-left font-semibold">{m.name}</th>
                  {TFS.map((t) => {
                    const s = G(m.id, t.id).sum;
                    return (
                      <td key={t.id} className={cn("border-t p-1", t.id === tf && "bg-accent")}>
                        <Link to="/modules/$moduleId" params={{ moduleId: m.id }} search={{ m: t.id }}
                          className="block rounded px-1.5 py-1 hover:bg-background" title={s.sub}>
                          <span className="flex items-center gap-1.5">
                            <Dot st={s.st} />
                            <span className="num truncate font-semibold">{s.big}</span>
                          </span>
                          <span className="block truncate pl-3.5 text-[11px] text-muted-foreground">{s.u}</span>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Dot st="ok" />On track</span>
          <span className="flex items-center gap-1.5"><Dot st="warn" />Watch</span>
          <span className="flex items-center gap-1.5"><Dot st="crit" />Act now</span>
        </div>
      </Section>
    </>
  );
}
