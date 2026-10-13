import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  CAD, MARKET, TFS, BL, fmtv, inr, isMod, isN, modName, mw, tfIdx, tfName, type ModId, type TfId,
} from "@/data/engine";
import { G, statusText } from "@/data/model";
import {
  LENSES, SUBS, analysisBlocks, contextBlocks, contextTitle, det, lensLine, lensReports, recs, steps, type LensId,
} from "@/data/insights";
import { Chart, Legend } from "@/components/chart/Chart";
import { Blocks, BlockView, HBars, Steps, VizView } from "@/components/blocks";
import { Kpis } from "@/components/Kpis";
import { PageHead, Section } from "@/components/layout";
import { Pill } from "@/components/status";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { keepH, useModuleTf } from "@/lib/horizon";
import { usePanels } from "@/lib/panels";
import { cn } from "@/lib/utils";
import { NotFound } from "./NotFound";
import { ReportLibrary } from "./Reports";

export const chartTitle = (m: ModId, tf: TfId) =>
  ({
    demand: tf === "dr" ? "Actual vs forecast: last 2 hours and next hour" : "Demand forecast with its likely range",
    supply: tf === "dr" ? "Available vs scheduled vs actual drawal" : "Supply stack by source vs demand",
    opt: tf === "dr" ? "Real-time gap vs schedule" : "Gap after merit-order optimisation",
    trade: tf === "dr" ? "Demand response: target vs achieved" : MARKET[tf] + " bid volume and price",
    mi: (tf === "dr" || tf === "id" ? "RTM" : tf === "da" ? "DAM" : "Exchange") + " price forecast and probable market volume",
    analytics: tf === "dr" ? "Scheduled cost vs DSM charges, with ₹/kWh" : "Cost of power: own vs market, with average ₹/kWh",
    reports: "",
  })[m];

/* module-level so accepted/held state survives navigation in this session */
const decisions: Record<string, "Accepted" | "On hold"> = {};

function RecList({ mod, tf }: { mod: ModId; tf: TfId }) {
  const [, force] = useState(0);
  const [why, setWhy] = useState<number | null>(null);
  const R = recs(mod, tf);
  const set = (k: string, v?: "Accepted" | "On hold") => { if (v) decisions[k] = v; else delete decisions[k]; force((x) => x + 1); };
  return (
    <ul className="divide-y">
      {R.map((r, i) => {
        const k = mod + tf + i, s = decisions[k];
        return (
          <li key={k} className="py-3 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-[13px] font-semibold">{r.t}</span>
              <span className="num text-xs text-muted-foreground"><b className="text-ok">{r.imp}</b> · {r.cf}% confident</span>
            </div>
            <p className="text-[13px] text-muted-foreground">{r.w}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {s ? (
                <>
                  <Pill st={s === "Accepted" ? "ok" : "warn"}>{s}</Pill>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => set(k)}>Undo</Button>
                </>
              ) : (
                <>
                  <Button size="sm" className="h-7" onClick={() => { set(k, "Accepted"); toast.success("Accepted: " + r.t, { description: "Pushed to the workflow (sample)." }); }}>Accept</Button>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => set(k, "On hold")}>Hold</Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-primary" aria-expanded={why === i} onClick={() => setWhy(why === i ? null : i)}>
                Why? {why === i ? <ChevronDown className="ml-1 h-3 w-3" /> : <ChevronRight className="ml-1 h-3 w-3" />}
              </Button>
            </div>
            {why === i && (
              <div className="mt-2 space-y-3 rounded-md bg-muted p-3">
                <p className="text-[13px] leading-relaxed">{r.why}</p>
                <div>
                  <div className="mb-1.5 text-xs font-semibold">Inputs the model weighed</div>
                  <HBars unit="%" items={[{ n: "Demand forecast", v: 34 }, { n: "Price forecast", v: 27 }, { n: "Plant availability", v: 21 }, { n: "Weather", v: 11 }, { n: "Regulatory limits", v: 7 }]} />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function WhatIf() {
  const [d, setD] = useState(0);
  const dp = 135 * d, cost = (dp * 6 * 7800) / 1e5;
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">What if the temperature changes?</span>
        <span className="num text-sm">{d >= 0 ? "+" : ""}{d.toFixed(1)} °C</span>
      </div>
      <Slider className="my-3" min={-3} max={5} step={0.5} value={[d]} onValueChange={(v) => setD(v[0])} aria-label="Temperature change" />
      <p className="text-[13px] text-muted-foreground">
        Peak demand <b className="num text-foreground">{dp >= 0 ? "+" : ""}{mw(dp)} MW</b> · extra purchase about{" "}
        <b className="num text-foreground">{cost >= 0 ? "" : "−"}₹{inr(Math.abs(cost), 1)} L/day</b> at evening prices.
      </p>
    </div>
  );
}

function AiInsights({ mod, tf }: { mod: ModId; tf: TfId }) {
  const { openReport } = usePanels();
  const [lens, setLens] = useState<LensId>("dec");
  return (
    <Section title="AI insights">
      <Tabs value={lens} onValueChange={(v) => setLens(v as LensId)}>
        <TabsList className="grid w-full grid-cols-4">
          {LENSES.map((l) => <TabsTrigger key={l.id} value={l.id} className="text-[13px]">{l.name}</TabsTrigger>)}
        </TabsList>
        <p className="mt-3 rounded-md border-l-[3px] border-primary bg-accent/60 px-3 py-2 text-[13px]">
          <span className="text-muted-foreground">{LENSES.find((l) => l.id === lens)!.hint}: </span>
          <b>{lensLine(lens, tf, mod)}</b>
        </p>
        <TabsContent value="dec" className="mt-4"><RecList mod={mod} tf={tf} /></TabsContent>
        <TabsContent value="ops" className="mt-4"><Steps steps={steps(tf)} /></TabsContent>
        <TabsContent value="rep" className="mt-4">
          <ul className="divide-y">
            {lensReports(mod).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                <span>{r.name} <span className="text-muted-foreground">· {tfName(tf)}</span></span>
                <span className="flex items-center gap-2"><Pill st="ok">Ready</Pill><Button size="sm" variant="outline" className="h-7" onClick={() => openReport(r.id, tf)}>Open</Button></span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="ana" className="mt-4 space-y-5">
          <Blocks blocks={analysisBlocks(tf)} tf={tf} />
          <WhatIf />
        </TabsContent>
      </Tabs>
    </Section>
  );
}

export function KeyDetails({ mod, tf }: { mod: ModId; tf: TfId }) {
  const subs = SUBS[mod];
  return (
    <Section title="Key details">
      <Accordion type="multiple" defaultValue={[subs[0].id]} className="-mt-1">
        {subs.map((S) => {
          const v = S.f(tf), d = det(mod, tf, S.id);
          return (
            <AccordionItem key={S.id} value={S.id}>
              <AccordionTrigger className="gap-3 py-3 hover:no-underline">
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[13px] font-semibold">{S.n}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{S.d}</span>
                </span>
                <span className="num whitespace-nowrap text-right text-sm font-semibold">{v.big} <span className="text-xs font-normal text-muted-foreground">{v.u}</span></span>
                {v.tag && <Pill st={v.tag[1]}>{v.tag[0]}</Pill>}
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                {v.viz && <VizView v={v.viz} />}
                {v.sub && <p className="text-xs text-muted-foreground">{v.sub}</p>}
                {d && <BlockView b={d} tf={tf} />}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Section>
  );
}

function CompareHorizons({ mod }: { mod: ModId }) {
  const { tf, setTf } = useModuleTf();
  return (
    <Section title="Compare horizons" desc="Click a row to switch.">
      <div className="scroll-x">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-1.5 pr-3 font-medium">Horizon</th><th className="py-1.5 pr-3 font-medium">Refresh</th>
            <th className="py-1.5 pr-3 text-right font-medium">Headline</th><th className="py-1.5 pr-3 font-medium">Detail</th><th className="py-1.5 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {TFS.map((t, i) => {
              const s = G(mod, t.id).sum;
              return (
                <tr key={t.id} onClick={() => setTf(t.id)} className={cn("cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/60", t.id === tf && "bg-accent")}>
                  <td className="py-2 pr-3 font-semibold">{t.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{CAD[mod][i]}</td>
                  <td className="num py-2 pr-3 text-right font-semibold">{s.big} <span className="text-xs font-normal text-muted-foreground">{s.u}</span></td>
                  <td className="py-2 pr-3 text-muted-foreground">{s.sub}</td>
                  <td className="py-2"><Pill st={s.st}>{statusText[s.st]}</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function DataTable({ mod, tf }: { mod: ModId; tf: TfId }) {
  const [open, setOpen] = useState(false);
  const { openDrill } = usePanels();
  const g = G(mod, tf), c = g.chart!, x = c.x, nb = c.now;
  const unitWord = x.length === 96 ? "block" : "period";
  return (
    <Section
      title={(x.length === 96 ? "Block-wise" : "Period-wise") + " table"}
      desc={"Click a value to open that " + unitWord + "."}
      action={<Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide table" : "Show table"}</Button>}
    >
      {open && (
        <div className="scroll-x max-h-[420px] overflow-y-auto rounded-md border">
          <table className="text-xs">
            <thead className="sticky top-0 z-20 bg-muted">
              <tr>
                <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold">{x.length === 96 ? "Block" : "Period"}</th>
                {x.map((l, i) => <th key={i} title={(c.xt ?? x)[i]} className={cn("num whitespace-nowrap px-2 py-2 text-right font-medium", i === nb && "bg-primary text-primary-foreground")}>{x.length === 96 ? BL[i] : l}</th>)}
              </tr>
            </thead>
            <tbody>
              {g.rows!.map((r) => (
                <tr key={r.n} className="border-t">
                  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 text-left font-medium">{r.n}</th>
                  {r.v.map((v, i) => (
                    <td key={i} onClick={() => openDrill(mod, tf, i)}
                      className={cn("num cursor-pointer whitespace-nowrap px-2 py-1.5 text-right hover:bg-accent", i === nb && "bg-accent",
                        r.sign && isN(v) && (v < 0 ? "text-bad" : v > 0 ? "text-ok" : ""))}>
                      {isN(v) ? fmtv(v) : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export function ModulePage() {
  const { moduleId } = useParams({ strict: false }) as { moduleId?: string };
  const { tf } = useModuleTf();
  const { panel, openDrill } = usePanels();
  if (!isMod(moduleId)) return <NotFound />;
  const mod = moduleId, g = G(mod, tf), ti = tfIdx(tf);
  const picked = panel?.kind === "drill" && panel.mod === mod && panel.tf === tf ? panel.i : null;
  const unitWord = tf === "id" || tf === "da" ? "time block" : tf === "dr" ? "5-minute slot" : "period";

  return (
    <>
      <PageHead
        crumb={<><Link to="/overview" search={keepH} className="hover:text-foreground hover:underline">Overview</Link> / Modules</>}
        title={<>{modName(mod, tf)} <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
        after={<Pill st={g.sum.st}>{statusText[g.sum.st]}</Pill>}
      >
        <dl className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-[13px]">
          <div className="flex gap-1.5"><dt className="text-muted-foreground">Period</dt><dd>{TFS[ti].hz}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted-foreground">Refreshes</dt><dd>{CAD[mod][ti]}</dd></div>
          {(mod === "trade" || mod === "mi") && <div className="flex gap-1.5"><dt className="text-muted-foreground">Market</dt><dd>{MARKET[tf]}</dd></div>}
        </dl>
      </PageHead>

      {mod === "reports" ? (
        <div className="space-y-6">
          <ReportLibrary tf={tf} />
          <KeyDetails mod={mod} tf={tf} />
          <CompareHorizons mod={mod} />
        </div>
      ) : (
        <div className="space-y-6">
          <Kpis items={g.kpis!} />

          <Section title={chartTitle(mod, tf)} action={<span className="hidden text-xs text-muted-foreground md:block">Click any {unitWord} for its breakdown</span>}>
            <Legend spec={g.chart!} />
            <div className="mt-3">
              <Chart spec={g.chart!} height={340} onPick={(i) => openDrill(mod, tf, i)} picked={picked} />
            </div>
          </Section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <AiInsights key={mod + tf} mod={mod} tf={tf} />
            <KeyDetails mod={mod} tf={tf} />
          </div>

          {contextTitle[mod] && (
            <Section title={contextTitle[mod]}
              action={mod === "trade" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => toast.success(tf === "dr" ? "DR signal staged for 12 feeders" : "All bids staged for review", { description: "Sample only: nothing is sent." })}>{tf === "dr" ? "Dispatch DR signal" : "Stage all bids"}</Button>
                  <Button size="sm" variant="outline" onClick={() => toast(tf === "dr" ? "Feeders released" : "Bids withdrawn")}>{tf === "dr" ? "Release feeders" : "Withdraw bids"}</Button>
                </div>
              ) : undefined}>
              <Blocks blocks={contextBlocks(mod, tf)} tf={tf} className="grid gap-6 space-y-0 lg:grid-cols-2 [&>*:only-child]:lg:col-span-2" />
            </Section>
          )}

          <CompareHorizons mod={mod} />
          <DataTable key={mod + tf} mod={mod} tf={tf} />
        </div>
      )}
    </>
  );
}
