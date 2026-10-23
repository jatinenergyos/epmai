// Shared dummy 96-block series for Demand's "Demand Forecast" and "Demand Tune up"
// pages (see ForecastAccuracyDashboard.tsx / DemandTuneupPanel.tsx) — both read from
// this one generator so their Actual / System Forecast numbers match exactly.
import { NOW, nowB, type TfId } from "@/data/engine";

export const BLOCKS = 96;

export type ForecastBlock = {
  i: number; actual: number | null; forecast: number | null;
  band: [number, number] | null; roasterRange: [number, number] | null;
  mape: number | null; roasteringDelta: number | null;
};

/** Last block that carries data for a given day: every block of a past day, up to
 *  `nowB` today, none for a future day. */
export function lastBlockForDate(date: Date): number {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(NOW); today.setHours(0, 0, 0, 0);
  return d < today ? BLOCKS - 1 : d > today ? -1 : nowB;
}

/** Every horizon lays out all 96 blocks. On Intra-day and Day-ahead (default: the
 *  current day), only blocks up to `lastWithData` carry data — later blocks are left
 *  blank so the axis still spans the whole day. Other horizons are filled end to end. */
export function buildForecastBlocks(tf: TfId, lastWithData = tf === "id" || tf === "da" ? nowB : BLOCKS - 1): ForecastBlock[] {
  const rows: ForecastBlock[] = [];
  for (let i = 0; i < BLOCKS; i++) {
    if (i > lastWithData) {
      rows.push({ i, actual: null, forecast: null, band: null, roasterRange: null, mape: null, roasteringDelta: null });
      continue;
    }
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
