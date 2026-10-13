import { useMemo } from "react";
import {
  Area, Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtv, inr, isN, sum } from "@/data/engine";
import type { ChartSpec } from "@/data/model";
import { cv } from "./colors";

type Props = { spec: ChartSpec; height?: number; onPick?: (i: number) => void; picked?: number | null };
type Datum = Record<string, number | string | null | number[]>;

/** Renders any ChartSpec from the data model: stacked layers, signed bars, P10–P90 band, lines on two axes. */
export function Chart({ spec, height = 300, onPick, picked }: Props) {
  const { x, layers, bars, band, lines = [] } = spec;
  const dense = x.length > 40;
  const hasY2 = lines.some((l) => l.y2);

  const data = useMemo<Datum[]>(
    () =>
      x.map((_, i) => {
        const d: Datum = { i };
        layers?.forEach((l, k) => (d["L" + k] = l.v[i]));
        if (bars) d.bar = bars.v[i];
        if (band) d.band = [band.lo[i], band.hi[i]];
        lines.forEach((l, k) => (d["l" + k] = l.v[i]));
        return d;
      }),
    [x, layers, bars, band, lines],
  );

  const tickGap = Math.max(1, Math.ceil(x.length / 12));
  const xt = spec.xt ?? x;

  return (
    <div style={{ height }} className={onPick ? "cursor-pointer" : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: hasY2 ? 4 : 12, bottom: 0, left: 4 }}
          onClick={(s: { activeTooltipIndex?: number | string | null } | null) => {
            const i = Number(s?.activeTooltipIndex);
            if (onPick && Number.isFinite(i)) onPick(i);
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis
            dataKey="i" type="category" tickLine={false} axisLine={false} interval={tickGap - 1}
            tickFormatter={(i: number) => x[i] ?? ""} height={24}
          />
          <YAxis
            yAxisId="l" tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => fmtv(v)}
            domain={spec.zero ? [(m: number) => Math.min(0, m), (m: number) => Math.max(0, m)] : ["auto", "auto"]}
            label={spec.yl ? { value: spec.yl, angle: -90, position: "insideLeft", offset: 8, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" } } : undefined}
          />
          {hasY2 && (
            <YAxis
              yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => fmtv(v)}
              domain={["auto", "auto"]}
              label={spec.y2l ? { value: spec.y2l, angle: 90, position: "insideRight", offset: 8, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" } } : undefined}
            />
          )}
          {spec.zero && <ReferenceLine yAxisId="l" y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />}

          {layers?.map((l, k) =>
            dense ? (
              <Area key={l.name} yAxisId="l" dataKey={"L" + k} stackId="s" type="linear" stroke="none"
                fill={cv(l.color)} fillOpacity={0.9} isAnimationActive={false} />
            ) : (
              <Bar key={l.name} yAxisId="l" dataKey={"L" + k} stackId="s" fill={cv(l.color)} isAnimationActive={false} maxBarSize={36} />
            ),
          )}
          {band && (
            <Area yAxisId="l" dataKey="band" type="monotone" stroke="none" fill={cv("--demand")} fillOpacity={0.14}
              isAnimationActive={false} activeDot={false} />
          )}
          {bars && (
            <Bar yAxisId="l" dataKey="bar" isAnimationActive={false} maxBarSize={28}>
              {bars.v.map((v, i) => (
                <Cell key={i} fill={cv(isN(v) && v < 0 ? bars.neg : bars.pos)} fillOpacity={0.82} />
              ))}
            </Bar>
          )}
          {lines.map((l, k) => (
            <Line key={l.name} yAxisId={l.y2 ? "r" : "l"} dataKey={"l" + k} type="monotone" stroke={cv(l.color)}
              strokeWidth={l.w ?? 2} strokeDasharray={l.dash} dot={!dense ? { r: 2.5, fill: cv(l.color), strokeWidth: 0 } : false}
              activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          ))}

          {isN(spec.now) && (
            <ReferenceLine yAxisId="l" x={spec.now} stroke="hsl(var(--foreground))" strokeDasharray="3 3"
              label={{ value: "Now", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--foreground))" }} />
          )}
          {isN(picked) && (
            <ReferenceArea yAxisId="l" x1={picked} x2={picked} fill="hsl(var(--primary))" fillOpacity={0.12} stroke="hsl(var(--primary))" strokeOpacity={0.5} />
          )}

          <Tooltip
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.4 }}
            isAnimationActive={false}
            content={({ active, label }) => {
              if (!active || label == null) return null;
              const i = Number(label);
              return <Tip spec={spec} i={i} title={xt[i]} hint={!!onPick} />;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Tip({ spec, i, title, hint }: { spec: ChartSpec; i: number; title: string; hint: boolean }) {
  const u = spec.unit ?? "";
  const Row = ({ n, c, v, uu = u }: { n: string; c: string; v: number | null | undefined; uu?: string }) =>
    isN(v) ? (
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: cv(c) }} />{n}</span>
        <span className="num font-medium">{fmtv(v)} {uu}</span>
      </div>
    ) : null;
  return (
    <div className="min-w-[200px] rounded-md border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
      <div className="mb-1.5 font-semibold">{title}</div>
      <div className="space-y-0.5">
        {spec.layers && (
          <>
            {[...spec.layers].reverse().map((l) => <Row key={l.name} n={l.name} c={l.color} v={l.v[i]} />)}
            <div className="flex justify-between border-t pt-0.5 font-semibold"><span>Total</span><span className="num">{fmtv(sum(spec.layers.map((l) => l.v[i])))} {u}</span></div>
          </>
        )}
        {spec.bars && <Row n={spec.bars.name} c={(spec.bars.v[i] ?? 0) >= 0 ? spec.bars.pos : spec.bars.neg} v={spec.bars.v[i]} />}
        {spec.band && (
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Likely range (P10–P90)</span><span className="num">{inr(spec.band.lo[i])}–{inr(spec.band.hi[i])}</span></div>
        )}
        {spec.lines?.map((l) => <Row key={l.name} n={l.name} c={l.color} v={l.v[i]} uu={l.y2 && spec.unit2 ? spec.unit2 : u} />)}
      </div>
      {hint && <div className="mt-1.5 border-t pt-1 text-muted-foreground">Click for the full breakdown</div>}
    </div>
  );
}

/** Legend that explains the encodings (sign colours for bars, band, dashed lines). */
export function Legend({ spec }: { spec: ChartSpec }) {
  const items: { label: string; color: string; kind: "box" | "line" | "dash" | "band" }[] = [];
  spec.layers?.forEach((l) => items.push({ label: l.name, color: l.color, kind: "box" }));
  if (spec.bars) {
    if (spec.bars.pos === spec.bars.neg) items.push({ label: spec.bars.name, color: spec.bars.pos, kind: "box" });
    else {
      items.push({ label: spec.bars.pos === "--pos" ? "Surplus" : spec.bars.pos === "--neg" ? "Above schedule" : "Buy", color: spec.bars.pos, kind: "box" });
      items.push({ label: spec.bars.neg === "--neg" ? "Deficit" : spec.bars.neg === "--pos" ? "Below schedule" : "Sell", color: spec.bars.neg, kind: "box" });
    }
  }
  if (spec.band) items.push({ label: "Likely range (P10–P90)", color: "--demand", kind: "band" });
  spec.lines?.forEach((l) => items.push({ label: l.name + (l.y2 ? " (right axis)" : ""), color: l.color, kind: l.dash ? "dash" : "line" }));
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          {it.kind === "box" && <i className="h-2.5 w-2.5 rounded-sm" style={{ background: cv(it.color) }} />}
          {it.kind === "band" && <i className="h-2.5 w-4 rounded-sm opacity-30" style={{ background: cv(it.color) }} />}
          {it.kind === "line" && <i className="h-0.5 w-4" style={{ background: cv(it.color) }} />}
          {it.kind === "dash" && <i className="w-4 border-t-2 border-dashed" style={{ borderColor: cv(it.color) }} />}
          {it.label}
        </li>
      ))}
    </ul>
  );
}
