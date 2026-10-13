import type { Block, Cell, HItem, Viz } from "@/data/insights";
import { inr } from "@/data/engine";
import type { TfId } from "@/data/engine";
import { Chart } from "./chart/Chart";
import { Spark } from "./chart/Spark";
import { cv } from "./chart/colors";
import { Pill } from "./status";
import { Button } from "@/components/ui/button";
import { usePanels } from "@/lib/panels";
import { Check, Circle, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export function HBars({ items, unit = "" }: { items: HItem[]; unit?: string }) {
  const mx = Math.max(...items.map((i) => Math.abs(i.v))) || 1;
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.n} className="grid grid-cols-[minmax(90px,38%)_1fr_auto] items-center gap-2.5 text-[13px]">
          <span className="truncate">{i.n}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: (Math.abs(i.v) / mx) * 100 + "%", background: cv(i.c ?? "--accent") }} />
          </span>
          <span className="num whitespace-nowrap text-right text-muted-foreground">{i.lab ?? inr(i.v) + (unit ? " " + unit : "")}</span>
        </li>
      ))}
    </ul>
  );
}

function CellView({ c, tf }: { c: Cell; tf: TfId }) {
  const { openReport } = usePanels();
  if (typeof c === "string") return <>{c}</>;
  if ("tag" in c) return <Pill st={c.st}>{c.tag}</Pill>;
  return <Button size="sm" variant="outline" className="h-7" onClick={() => openReport(c.report, tf)}>Open</Button>;
}

export function Steps({ steps }: { steps: Extract<Block, { kind: "steps" }>["steps"] }) {
  return (
    <ol className="relative space-y-3 border-l pl-5">
      {steps.map((s) => (
        <li key={s.label} className="relative">
          <span className={cn("absolute -left-[29px] top-0.5 grid h-4 w-4 place-items-center rounded-full border bg-card",
            s.state === "done" && "border-ok bg-ok text-white", s.state === "run" && "border-primary text-primary")}>
            {s.state === "done" ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : s.state === "run" ? <Loader className="h-2.5 w-2.5 animate-spin" /> : <Circle className="h-1.5 w-1.5 fill-muted-foreground text-muted-foreground" />}
          </span>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className={cn(s.state === "pending" && "text-muted-foreground")}>{s.label}</span>
            <span className="num shrink-0 text-xs text-muted-foreground">{s.state === "done" ? s.time : s.state === "run" ? "running" : s.time ? "due " + s.time : "next"}</span>
          </div>
          {s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}
        </li>
      ))}
    </ol>
  );
}

export function BlockView({ b, tf }: { b: Block; tf: TfId }) {
  const title = "title" in b && b.title ? <h4 className="mb-1.5 text-sm font-semibold">{b.title}</h4> : null;
  const note = "note" in b && b.note ? <p className="mb-2 text-xs text-muted-foreground">{b.note}</p> : null;
  switch (b.kind) {
    case "stats":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {b.items.map((s) => (
            <div key={s.l} className="rounded-md bg-muted px-3 py-2">
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className="num font-semibold">{s.v}</div>
            </div>
          ))}
        </div>
      );
    case "hbars":
      return <section>{title}{note}<HBars items={b.items} unit={b.unit} /></section>;
    case "steps":
      return <section>{title}<Steps steps={b.steps} /></section>;
    case "text":
      return <section>{title}<p className="text-[13px] leading-relaxed">{b.text}</p></section>;
    case "chart":
      return <section>{title}{note}<Chart spec={b.spec} height={b.h ?? 220} /></section>;
    case "table":
      return (
        <section>
          {title}{note}
          <div className="scroll-x">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {b.head.map((h, i) => <th key={i} className={cn("py-1.5 pr-3 font-medium", i > 0 && "text-right")}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-border/60 last:border-0">
                    {r.map((c, i) => (
                      <td key={i} className={cn("py-1.5 pr-3 align-middle", i > 0 && "num text-right")}><CellView c={c} tf={tf} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
  }
}

export function Blocks({ blocks, tf, className }: { blocks: Block[]; tf: TfId; className?: string }) {
  return <div className={cn("space-y-5", className)}>{blocks.map((b, i) => <BlockView key={i} b={b} tf={tf} />)}</div>;
}

/** Small inline visual next to a detail metric. */
export function VizView({ v }: { v: Viz }) {
  switch (v.kind) {
    case "meter":
      return (
        <div className="relative h-2 rounded-full bg-muted" title="Bar shows the value against its target (tick)">
          <span className="block h-full rounded-full" style={{ width: v.pct + "%", background: cv(v.color) }} />
          {v.marker != null && <span className="absolute -top-0.5 h-3 w-0.5 bg-foreground/60" style={{ left: v.marker + "%" }} />}
        </div>
      );
    case "stack": {
      const t = v.parts.reduce((a, p) => a + p.v, 0) || 1;
      return (
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {v.parts.map((p) => <span key={p.n} title={p.n} style={{ width: (p.v / t) * 100 + "%", background: cv(p.c) }} />)}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            {v.parts.map((p) => (
              <span key={p.n} className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: cv(p.c) }} />{p.n}</span>
            ))}
          </div>
        </div>
      );
    }
    case "vbars": {
      const mx = Math.max(...v.items.map((i) => i.v)) || 1;
      return (
        <div className="flex items-end gap-1.5">
          {v.items.map((i) => (
            <span key={i.n} className="flex flex-1 flex-col items-center gap-0.5">
              <span className="w-full rounded-sm bg-[var(--ch-accent)]" style={{ height: Math.max(2, Math.round((i.v / mx) * 26)) }} />
              <span className="text-[10px] text-muted-foreground">{i.n}</span>
            </span>
          ))}
        </div>
      );
    }
    case "squares": {
      const last = v.on.lastIndexOf(true);
      return (
        <div className="flex gap-1" title="Each square is a plant, cheapest first. Ringed square is the marginal plant.">
          {v.on.map((o, k) => (
            <span key={k} className={cn("h-3 w-3 rounded-sm", o ? "bg-[var(--ch-c-isgs)]" : "bg-muted", k === last && "ring-2 ring-[var(--ch-warn)] ring-offset-1 ring-offset-card")} />
          ))}
        </div>
      );
    }
    case "buysell": {
      const mx = Math.max(v.b, v.s) || 1;
      return (
        <div className="space-y-1 text-[11px]">
          {([["Buy", v.b, "--buy"], ["Sell", v.s, "--sell"]] as const).map(([n, x, c]) => (
            <div key={n} className="grid grid-cols-[28px_1fr] items-center gap-2">
              <span className="text-muted-foreground">{n}</span>
              <span className="h-2 rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: Math.max(1, (x / mx) * 100) + "%", background: cv(c) }} /></span>
            </div>
          ))}
        </div>
      );
    }
    case "spark":
      return <Spark spec={v.spec} height={40} />;
    case "list":
      return <ul className="text-[13px] leading-snug">{v.items.map((i) => <li key={i}>{i}</li>)}</ul>;
  }
}
