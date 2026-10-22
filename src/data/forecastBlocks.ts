// Shared dummy 96-block series for Demand's "Demand Forecast" and "Demand Tune up"
// pages (see ForecastAccuracyDashboard.tsx / DemandTuneupPanel.tsx) — both read from
// this one generator so their Actual / System Forecast numbers match exactly.
import { nowB, type TfId } from "@/data/engine";

export const BLOCKS = 96;

export type ForecastBlock = {
  i: number; actual: number | null; forecast: number | null;
  band: [number, number] | null; roasterRange: [number, number] | null;
  mape: number | null; roasteringDelta: number | null;
};

/** For the Intra-day horizon, "today" is already under way — only block `nowB`
 *  onward is real/available, so every block before it is left out entirely (not
 *  rendered as blank chart space). Every other horizon shows the full 96 blocks
 *  (it's all still ahead). */
export function buildForecastBlocks(tf: TfId): ForecastBlock[] {
  const startAt = tf === "id" ? nowB : 0;
  const rows: ForecastBlock[] = [];
  for (let i = startAt; i < BLOCKS; i++) {
    const h = i / 4;
    const morning = Math.exp(-((h - 9) ** 2) / 8) * 1750;
    const evening = Math.exp(-((h - 19) ** 2) / 10) * 1500;
    const wiggle = 160 * Math.sin(h * 2.3) + 70 * Math.sin(h * 5.1 + 1);
    const actual = Math.round(8300 + morning + evening + wiggle);
    const dip = h > 17 && h < 21 ? 900 * Math.exp(-((h - 19) ** 2) / 2) : 0;
    const forecast = Math.round(actual - 650 - 280 * Math.sin(h / 3) - dip);
    const mape = Math.max(0, Math.min(18, 6 + 8 * Math.abs(Math.sin(h / 2.6)) + 3 * Math.sin(h * 3.1)));
    const roasteringDelta = Math.round(260 + 140 * Math.sin(h / 2.2 + 0.6));
    rows.push({
      i, actual, forecast, band: [actual - 260, actual + 260], roasterRange: [actual, actual + roasteringDelta],
      mape: Math.round(mape * 10) / 10, roasteringDelta,
    });
  }
  return rows;
}
