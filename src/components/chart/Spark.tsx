import { isN, sum } from "@/data/engine";
import type { ChartSpec } from "@/data/model";
import { cv } from "./colors";

/** Lightweight SVG sparkline for tiles and detail rows (no axes, no interaction). */
export function Spark({ spec, height = 44, className }: { spec: ChartSpec; height?: number; className?: string }) {
  const W = 200, H = height, n = spec.x.length;
  const vals: number[] = [];
  let tot: number[] | null = null;
  if (spec.layers) { tot = spec.x.map((_, i) => sum(spec.layers!.map((l) => l.v[i]))); vals.push(...tot, 0); }
  if (spec.bars) vals.push(...spec.bars.v.filter(isN), 0);
  if (spec.band) vals.push(...spec.band.lo, ...spec.band.hi);
  spec.lines?.filter((l) => !l.y2).forEach((l) => vals.push(...l.v.filter(isN)));
  if (spec.zero) vals.push(0);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (!isFinite(lo) || !isFinite(hi)) return null;
  if (lo === hi) { lo -= 1; hi += 1; }
  const st = W / n, X = (i: number) => st * (i + 0.5), Y = (v: number) => 2 + (H - 4) - ((v - lo) / (hi - lo)) * (H - 4);

  const y2 = spec.lines?.filter((l) => l.y2).flatMap((l) => l.v.filter(isN)) ?? [];
  const lo2 = Math.min(...y2), hi2 = Math.max(...y2);
  const Y2 = (v: number) => 2 + (H - 4) - ((v - lo2) / (hi2 - lo2 || 1)) * (H - 4);

  const parts: React.ReactNode[] = [];
  if (spec.layers) {
    let cum = spec.x.map(() => 0);
    spec.layers.forEach((L, k) => {
      const top = cum.map((b, i) => b + (L.v[i] || 0));
      let d = "M" + X(0) + "," + Y(top[0]);
      for (let i = 1; i < n; i++) d += "L" + X(i) + "," + Y(top[i]);
      for (let i = n - 1; i >= 0; i--) d += "L" + X(i) + "," + Y(cum[i]);
      parts.push(<path key={"a" + k} d={d + "Z"} fill={cv(L.color)} opacity={0.9} />);
      cum = top;
    });
  }
  if (spec.band) {
    let d = "M" + X(0) + "," + Y(spec.band.hi[0]);
    for (let i = 1; i < n; i++) d += "L" + X(i) + "," + Y(spec.band.hi[i]);
    for (let i = n - 1; i >= 0; i--) d += "L" + X(i) + "," + Y(spec.band.lo[i]);
    parts.push(<path key="band" d={d + "Z"} fill={cv("--demand")} opacity={0.15} />);
  }
  if (spec.bars) {
    const w = Math.max(1, st * 0.8), y0 = Y(0);
    spec.bars.v.forEach((v, i) => {
      if (!isN(v)) return;
      const y = Y(v);
      parts.push(<rect key={"b" + i} x={X(i) - w / 2} y={Math.min(y, y0)} width={w} height={Math.max(0.6, Math.abs(y - y0))} fill={cv(v >= 0 ? spec.bars!.pos : spec.bars!.neg)} opacity={0.85} />);
    });
  }
  spec.lines?.forEach((L, k) => {
    const yy = L.y2 ? Y2 : Y;
    let d = "", on = false;
    L.v.forEach((v, i) => {
      if (!isN(v)) { on = false; return; }
      d += (on ? "L" : "M") + X(i).toFixed(1) + "," + yy(v).toFixed(1);
      on = true;
    });
    parts.push(<path key={"l" + k} d={d} fill="none" stroke={cv(L.color)} strokeWidth={Math.min(1.8, L.w ?? 1.6)} strokeDasharray={L.dash} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />);
  });
  if (isN(spec.now)) parts.push(<line key="now" x1={X(spec.now)} x2={X(spec.now)} y1={0} y2={H} stroke="hsl(var(--foreground))" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" opacity={0.6} />);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} className={className} aria-hidden="true">
      {parts}
    </svg>
  );
}
