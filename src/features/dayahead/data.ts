// Data for the Day-ahead Demand "Forecast" page. The System Forecast comes from the demand API
// (Redux `fetchDayDemandForecast`, data_id 102110) and the weather from `weather/multi`
// (`fetchWeather`); actuals are still a deterministic placeholder seeded by the date, marked
// where a real API should plug in.
import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDayDemandForecast, fetchWeather } from "@/store/slice/demandApiSlice";
import type { WeatherBlocks } from "@/store/features/demandTypes";
import { NOW } from "@/data/engine";

export const BLOCKS = 96;

/** "00:00" … "23:45" for block b (0-based). */
export const blockTime = (b: number) =>
  String(Math.floor(b / 4)).padStart(2, "0") + ":" + String((b % 4) * 15).padStart(2, "0");

export const isoDate = (d: Date) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const todayIso = () => isoDate(NOW);

/** Small seeded PRNG so placeholders stay stable for a given date/location. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- forecast (API) ---------- */

export type DayForecast = {
  forecast: number[] | null;
  loading: boolean;
  error: string | null;
};

/** System Forecast for one date, from the demand API via Redux (from_date = to_date = date). */
export function useDayForecast(date: string): DayForecast {
  const dispatch = useAppDispatch();
  const { dayData, dayLoading, dayError } = useAppSelector((s) => s.demand);
  useEffect(() => {
    dispatch(fetchDayDemandForecast({ date, location_id: 10030, forcasted_by: "System" }));
  }, [dispatch, date]);
  const blocks = dayData?.dem[0];
  return {
    forecast: blocks && blocks.length === BLOCKS && dayData?.dates[0] === date ? blocks : null,
    loading: dayLoading,
    error: dayError,
  };
}

/* ---------- actuals, roastering, MAPE (placeholders) ---------- */

export type Actuals = {
  actual: number[];
  roastering: number[];
  mape: number[];
  manual: number[] | null;
  manualMape: number[] | null;
};

/** Actual, Roastering and System MAPE exist only for today or earlier; null for a future date.
 *  Manual Forecast isn't available yet, so it stays null and its series are hidden. */
export function mockActuals(forecast: number[], date: string): Actuals | null {
  if (date > todayIso()) return null;
  // TODO: connect API — actual (SCADA) demand for this date
  // TODO: connect API — roastering
  // TODO: connect API — manual forecast (and its MAPE)
  const r = rng("act" + date);
  const actual = forecast.map((f, b) => Math.round(f * (1 + 0.035 * Math.sin(b / 7 + r() * 0.4) + (r() - 0.5) * 0.02)));
  const roastering = forecast.map(() => Math.round(90 + r() * 170));
  const mape = actual.map((a, b) => +(Math.abs(a - forecast[b]) / (a || 1) * 100).toFixed(2));
  return { actual, roastering, mape, manual: null, manualMape: null };
}

/* ---------- weather (API: weather/multi) ---------- */

export const WEATHER_CLIENT_ID = "mp";

// City names for the location codes the API returns; unknown codes show as the code itself.
const CITY: Record<string, string> = {
  BH_AL: "Bhopal", CH_WRA: "Chhindwara", DH_R: "Dhar", GW_R: "Gwalior", ID_RE: "Indore",
  RW_A: "Rewa", SG_R: "Sagar", ST_N: "Satna", UJ_AIN: "Ujjain",
};
export const cityOf = (id: string) => CITY[id] ?? id;

export type WeatherHour = {
  t: string; temp: number; feels: number; hum: number; wind: number; gust: number; dew: number; cloud: number; day: boolean;
};
/** A location's day: 24 hourly points for the chart plus the raw 96-block temperatures. */
export type WeatherDay = { hours: WeatherHour[]; temps: number[] };

const r2 = (v: number) => Math.round(v * 100) / 100;

/** 96 API blocks → 24 hourly averages (labelled 00:30 … 23:30). Null if temperature is missing. */
function toDay(w: WeatherBlocks): WeatherDay | null {
  const arr = (f: keyof WeatherBlocks) => Array.from({ length: BLOCKS }, (_, b) => Number(w[f]?.[String(b + 1)]));
  const temps = arr("temperature");
  if (temps.some((v) => Number.isNaN(v))) return null;
  const feels = arr("temperatureFeelsLike"), hum = arr("relativeHumidity"), wind = arr("windSpeed"), gust = arr("windGust");
  const dew = arr("temperatureDewPoint"), cloud = arr("cloudCover");
  const hr = (a: number[], h: number) => { const s = a.slice(h * 4, h * 4 + 4).filter((v) => !Number.isNaN(v)); return s.length ? r2(s.reduce((x, y) => x + y, 0) / s.length) : 0; };
  return {
    temps,
    hours: Array.from({ length: 24 }, (_, h) => ({
      t: String(h).padStart(2, "0") + ":30",
      temp: hr(temps, h), feels: hr(feels, h), hum: hr(hum, h), wind: hr(wind, h), gust: hr(gust, h), dew: hr(dew, h), cloud: hr(cloud, h),
      day: h >= 6 && h < 18,
    })),
  };
}

export type Weather = {
  locations: string[]; days: Record<string, WeatherDay>; loading: boolean; error: string | null;
};

/** Every location's weather for a date, from the weather API via Redux (one call per date). */
export function useWeather(date: string): Weather {
  const dispatch = useAppDispatch();
  const { weather, weatherLoading, weatherError } = useAppSelector((s) => s.demand);
  useEffect(() => {
    dispatch(fetchWeather({ date, client_id: WEATHER_CLIENT_ID }));
  }, [dispatch, date]);
  const days = useMemo(() => {
    const out: Record<string, WeatherDay> = {};
    if (weather?.date === date) Object.entries(weather.locations).forEach(([id, w]) => { const d = toDay(w); if (d) out[id] = d; });
    return out;
  }, [weather, date]);
  return { locations: Object.keys(days), days, loading: weatherLoading, error: weatherError };
}

export const conditionOf = (cloud: number) => (cloud >= 70 ? "Cloudy" : cloud >= 35 ? "Partly cloudy" : "Clear sky");

export type WeatherSummary = {
  temp: number; label: "NOW" | "PEAK"; condition: string; cloud: number;
  high: number; low: number; humidity: number; maxWind: number; peakAt: string;
};

/** "Now" values when the date is today, else the day's peak. */
export function weatherSummary(w: WeatherDay, date: string): WeatherSummary {
  const h = w.hours;
  const peakB = w.temps.reduce((m, v, b) => (v > w.temps[m] ? b : m), 0);
  const isToday = date === todayIso();
  const i = isToday ? NOW.getHours() : Math.floor(peakB / 4);
  return {
    temp: isToday ? h[i].temp : w.temps[peakB], label: isToday ? "NOW" : "PEAK", condition: conditionOf(h[i].cloud), cloud: h[i].cloud,
    high: Math.max(...w.temps), low: Math.min(...w.temps),
    humidity: Math.round(h[i].hum), maxWind: Math.round(Math.max(...h.map((x) => x.wind))),
    peakAt: String(Math.floor(peakB / 4)).padStart(2, "0") + ":00",
  };
}

/* ---------- calculations from the 96-block arrays ---------- */

export type Kpis = { total: number; peak: number; peakB: number; min: number; avg: number };

export function kpisOf(a: number[]): Kpis {
  let peakB = 0, minB = 0, total = 0;
  a.forEach((v, b) => { total += v; if (v > a[peakB]) peakB = b; if (v < a[minB]) minB = b; });
  return { total, peak: a[peakB], peakB, min: a[minB], avg: total / a.length };
}

export const PERIODS = [
  { label: "Night (00–06)", color: "#111827", from: 0 },
  { label: "Morning Ramp (06–12)", color: "#3b82f6", from: 24 },
  { label: "Afternoon (12–18)", color: "#f97316", from: 48 },
  { label: "Evening Peak (18–24)", color: "#ef4444", from: 72 },
];

export function periodsOf(a: number[]) {
  return PERIODS.map((p) => {
    const s = a.slice(p.from, p.from + 24);
    return { ...p, peak: Math.max(...s), min: Math.min(...s), avg: s.reduce((x, y) => x + y, 0) / s.length };
  });
}

export const SYSTEM_RANGES = ["0–1%", "1–2%", "2–3%", "3–4%", "4–5%", "5–6%", ">6%"];
export const MANUAL_RANGES = ["0–0.5%", "0.5–1%", "1–1.5%", "1.5–2%", "2–2.5%", "2.5–3%", ">3%"];

/** Share of blocks (%) whose MAPE falls in each band of width `step`, last band open-ended. */
export function errorBuckets(mape: number[] | null, step: number): number[] {
  const out = new Array(7).fill(0);
  if (!mape?.length) return out;
  mape.forEach((m) => { out[Math.min(6, Math.floor(m / step))]++; });
  return out.map((c) => Math.round((c / mape.length) * 100));
}
