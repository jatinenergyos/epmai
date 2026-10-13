import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CAD, MODS, modName, tfIdx, tfName } from "@/data/engine";
import { G, statusText } from "@/data/model";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { keepH, useHorizon } from "@/lib/horizon";

/** A simple per-horizon page reached by clicking a column heading on the command centre.
 *  One line per module for the chosen horizon — no charts, just the read and a way in. */
export function SnapshotPage() {
  const { tf } = useHorizon();
  const ti = tfIdx(tf);

  return (
    <>
      <PageHead
        crumb={<><Link to="/" search={keepH} className="hover:text-foreground hover:underline">Command centre</Link> / Snapshot</>}
        title={<>{tfName(tf)} <span className="font-normal text-muted-foreground">· snapshot</span></>}
      >
        <Link to="/horizon" search={{ h: tf }}
          className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-primary hover:underline">
          Open full charts for every module <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PageHead>

      <Kpis className="mt-5" items={MODS.map((m) => {
        const s = G(m.id, tf).sum;
        return { l: modName(m.id, tf), v: s.big, u: s.u, s: s.sub, st: s.st === "ok" ? undefined : s.st };
      })} />

      <Section className="mt-6" title="Modules at a glance">
        <div className="scroll-x">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">Module</th>
                <th className="py-1.5 pr-3 text-right font-medium">Headline</th>
                <th className="py-1.5 pr-3 font-medium">Detail</th>
                <th className="py-1.5 pr-3 font-medium">Refresh</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {MODS.map((m) => {
                const s = G(m.id, tf).sum;
                return (
                  <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-accent/50">
                    <td className="py-2.5 pr-3 font-semibold">{modName(m.id, tf)}</td>
                    <td className="num py-2.5 pr-3 text-right font-semibold">{s.big} <span className="text-xs font-normal text-muted-foreground">{s.u}</span></td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{s.sub}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{CAD[m.id][ti]}</td>
                    <td className="py-2.5 pr-3"><Pill st={s.st}>{statusText[s.st]}</Pill></td>
                    <td className="py-2.5 text-right">
                      <Link to="/modules/$moduleId" params={{ moduleId: m.id }} search={{ m: tf }}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
