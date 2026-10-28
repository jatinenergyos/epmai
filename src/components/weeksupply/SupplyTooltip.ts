// HTML for the day-chart tooltip: a small header (block number or plant), then one
// "● Name: value" row per visible series — supply series, then Demand and Rostering.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type TipRow = { name: string; color: string; value: number };

export function supplyTooltipHtml(header: string, rows: TipRow[]) {
  const lines = rows.map((r) =>
    `<div style="white-space:nowrap"><span style="color:${r.color};font-size:13px;line-height:1">●</span> ${esc(r.name)}: <b>${r.value.toFixed(2)}</b></div>`);
  return `<div style="font-size:11px;line-height:1.45;color:#0f172a">`
    + `<div style="font-size:12px;font-weight:600;color:#0f172a;margin-bottom:3px">${esc(header)}</div>${lines.join("")}</div>`;
}
