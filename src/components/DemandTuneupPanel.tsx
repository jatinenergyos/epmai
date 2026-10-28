// A one-off "96-Block Forecast" + Weather/Rules/Control tuneup panel, built to match
// an external reference screenshot exactly (see the ported prompt in chat history).
// Everything here — the 96-block series and every form field — is dummy/placeholder
// data for a visual mockup; none of it reads from or writes to the app's real data
// model. Shown only on Demand · Real-time's "Demand Tune up" page (see pages/CommandCentre/CellPage.tsx), so
// it doesn't affect any other module/horizon/sub-metric.
import { useMemo, useState, type ReactNode } from "react";
import { Download, Info, RotateCcw, RotateCw, Menu } from "lucide-react";
import { CartesianGrid, Legend as RLegend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TfId } from "@/data/engine";
import { buildForecastBlocks } from "@/data/forecastBlocks";

/** Block-number x-axis ticks: every 3rd block across the full 96, always ending
 *  on the last one so the axis never gets cut short. */
function buildTicks(startI: number, endI: number): number[] {
  const ticks: number[] = [];
  for (let v = startI; v < endI; v += 3) ticks.push(v);
  ticks.push(endI);
  return ticks;
}

function XTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  return (
    <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
      {(payload?.value ?? 0) + 1}
    </text>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const inputCls = "h-8 w-28 rounded-md border bg-card px-2 text-right text-sm";
const selectCls = "h-8 w-28 rounded-md border bg-card px-2 text-sm";

const TABS = ["Weather", "Rules", "Control"] as const;
type Tab = (typeof TABS)[number];

export function DemandTuneupPanel({ tf }: { tf: TfId }) {
  const rows = useMemo(() => {
    const blocks = buildForecastBlocks(tf);
    return blocks.map((b) => ({ i: b.i, forecast: b.forecast, manual: b.forecast }));
  }, [tf]);
  const ticks = useMemo(() => buildTicks(rows[0]?.i ?? 0, rows[rows.length - 1]?.i ?? 95), [rows]);
  const [tab, setTab] = useState<Tab>("Control");
  const [adjust, setAdjust] = useState("Yes");
  const [pre, setPre] = useState(5);
  const [post, setPost] = useState(5);
  const [fromBlock, setFromBlock] = useState(1);
  const [toBlock, setToBlock] = useState(96);
  const [action, setAction] = useState("Add");
  const [fromValue, setFromValue] = useState(100);
  const [toValue, setToValue] = useState(100);
  const [reference, setReference] = useState("—");
  const [mpex, setMpex] = useState(1);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.9fr_1fr]">
        <div className="flex flex-col rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">96-Block Forecast</div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button type="button" aria-label="Reload" className="grid h-7 w-7 place-items-center rounded hover:bg-accent hover:text-foreground"><RotateCw className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Info" className="grid h-7 w-7 place-items-center rounded hover:bg-accent hover:text-foreground"><Info className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="More" className="grid h-7 w-7 place-items-center rounded hover:bg-accent hover:text-foreground"><Menu className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="flex-1 rounded-md" style={{ background: "rgba(16, 185, 129, 0.05)" }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={460}>
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 28, left: 4 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="i" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => String(v + 1)} ticks={ticks} height={22} axisLine={false} tickLine={false} tick={<XTick />} />
                <YAxis domain={[7500, 12000]} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={(v) => "Block " + (Number(v) + 1)} />
                <Line dataKey="forecast" name="System Forecast" type="monotone" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false} />
                <Line dataKey="manual" name="Manual Forecast" type="monotone" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                <RLegend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between border-b">
            <div className="flex gap-4">
              {TABS.map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className={"border-b-2 pb-2 text-sm font-medium " + (tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
                  {t}
                </button>
              ))}
            </div>
            <Info className="mb-2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {tab !== "Control" ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tab} — nothing to show here yet.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-semibold">Forecast</button>
                <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-white" style={{ background: "#f97316" }}>Change</button>
                <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-white" style={{ background: "#0d9488" }}>Update</button>
              </div>

              <div className="mt-2 divide-y">
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Adjust</span>
                  <div className="flex items-center gap-3">
                    <select value={adjust} onChange={(e) => setAdjust(e.target.value)} className={selectCls + " w-20"}>
                      <option>Yes</option><option>No</option>
                    </select>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pre</span>
                    <input type="number" value={pre} onChange={(e) => setPre(+e.target.value)} className={inputCls + " w-16"} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Post</span>
                    <input type="number" value={post} onChange={(e) => setPost(+e.target.value)} className={inputCls + " w-16"} />
                  </div>
                </div>
                <FieldRow label="From Block"><input type="number" value={fromBlock} onChange={(e) => setFromBlock(+e.target.value)} className={inputCls} /></FieldRow>
                <FieldRow label="To Block"><input type="number" value={toBlock} onChange={(e) => setToBlock(+e.target.value)} className={inputCls} /></FieldRow>
                <FieldRow label="Action">
                  <select value={action} onChange={(e) => setAction(e.target.value)} className={selectCls}>
                    <option>Add</option><option>Subtract</option><option>Set</option><option>Scale %</option>
                  </select>
                </FieldRow>
                <FieldRow label="From Value"><input type="number" value={fromValue} onChange={(e) => setFromValue(+e.target.value)} className={inputCls} /></FieldRow>
                <FieldRow label="To Value"><input type="number" value={toValue} onChange={(e) => setToValue(+e.target.value)} className={inputCls} /></FieldRow>
                <FieldRow label="Reference">
                  <select value={reference} onChange={(e) => setReference(e.target.value)} className={selectCls}>
                    <option>—</option><option>Actual</option><option>System Forecast</option><option>Manual Forecast</option>
                  </select>
                </FieldRow>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mpex</span>
                  <input type="number" value={mpex} onChange={(e) => setMpex(+e.target.value)} className="h-8 w-14 rounded-md border bg-card px-2 text-center text-sm" />
                </div>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent">
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button type="button" onClick={() => { setAdjust("Yes"); setPre(5); setPost(5); setFromBlock(1); setToBlock(96); setAction("Add"); setFromValue(100); setToValue(100); setReference("—"); setMpex(1); }}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
