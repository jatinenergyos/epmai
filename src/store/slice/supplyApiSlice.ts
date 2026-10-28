import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PlantSupplyApiResponse, SupplyDay, SupplyDayDetail, SupplyGraph, SupplyState } from "../features/supplyTypes";
import BASE_URL from '../../../BASE_URL'
import { cachedJson } from "@/lib/idbCache";

const initialState: SupplyState = {
    week: null,
    weekLoading: false,
    weekError: null,
    weekRequestId: null,
    month: null,
    monthLoading: false,
    monthError: null,
    monthRequestId: null,
    day: null,
    dayDate: null,
    dayLoading: false,
    dayError: null,
    dayRequestId: null,
};

const BLOCKS = 96;

/** API days → per-series 96-block arrays (in API order) + demand. A day whose SG and demand are
 *  all zero has no data yet and becomes `null`. */
function transformDays(json: PlantSupplyApiResponse, graph: SupplyGraph): (SupplyDay | null)[] {
    return json.data.map((day) => {
        const series = new Map<string, number[]>();
        const demand = new Array(BLOCKS).fill(0);
        const add = (name: string, b: number, v: number) => {
            if (!series.has(name)) series.set(name, new Array(BLOCKS).fill(0));
            series.get(name)![b] = Math.round((Number(v) || 0) * 100) / 100;
        };
        if (graph === "category") {
            (day.category_graph ?? []).forEach((blk) => {
                const b = blk.block - 1;
                if (b < 0 || b >= BLOCKS) return;
                demand[b] = Number(blk.demand) || 0;
                [...blk.central, ...blk.state].forEach((c) => add(c.category, b, c.sg));
            });
        } else {
            (day.technology_graph ?? []).forEach((blk) => {
                const b = blk.block - 1;
                if (b < 0 || b >= BLOCKS) return;
                demand[b] = Number(blk.demand) || 0;
                blk.data_list.forEach((t) => add(t.technology, b, t.sg));
            });
        }
        const list = [...series.entries()].map(([name, data]) => ({ name, data }));
        const empty = demand.every((v) => !v) && list.every((s) => s.data.every((v) => !v));
        return empty ? null : { date: day.date, series: list, demand };
    });
}

type RangeArgs = { from_date: string; to_date: string; graph: SupplyGraph; sync?: boolean };
type RangeResult = { graph: SupplyGraph; from: string; to: string; days: (SupplyDay | null)[]; changed: boolean };

/** plant-supply/by-category for a date range. Cache-first: the saved IndexedDB copy is used when
 *  there is one; `sync: true` calls the API and saves the response if it differs. */
async function loadRange({ from_date, to_date, graph, sync }: RangeArgs): Promise<RangeResult> {
    const query = new URLSearchParams({ from_date, to_date, graph });
    const { value: json, changed } = await cachedJson(`plant-supply:${query.toString()}`, async () => {
        const res = await fetch(`${BASE_URL}plant-supply/by-category?${query.toString()}`, {
            headers: { accept: "*/*" },
        });
        if (!res.ok) throw new Error(`Failed to fetch plant supply: ${res.statusText}`);
        return (await res.json()) as PlantSupplyApiResponse;
    }, sync);
    return { graph, from: from_date, to: to_date, days: transformDays(json, graph), changed };
}

// Week-ahead Supply Availability (one Monday–Sunday week).
export const fetchWeekPlantSupply = createAsyncThunk<RangeResult, RangeArgs>("supply/fetchWeekPlantSupply", loadRange);

// Month-ahead Supply Availability (one calendar month).
export const fetchMonthPlantSupply = createAsyncThunk<RangeResult, RangeArgs>("supply/fetchMonthPlantSupply", loadRange);

/** One API day → both graphs as 96-block arrays, keeping central / state; `null` when the day has
 *  no supply and no demand yet. */
function transformDetail(json: PlantSupplyApiResponse): SupplyDayDetail | null {
    const day = json.data[0];
    if (!day) return null;
    const r2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;
    const demand = new Array(BLOCKS).fill(0);
    const cat = new Map<string, { name: string; group: "Central" | "State"; data: number[] }>();
    (day.category_graph ?? []).forEach((blk) => {
        const b = blk.block - 1;
        if (b < 0 || b >= BLOCKS) return;
        demand[b] = r2(blk.demand);
        const put = (group: "Central" | "State", name: string, v: number) => {
            const key = group + "|" + name;
            if (!cat.has(key)) cat.set(key, { name, group, data: new Array(BLOCKS).fill(0) });
            cat.get(key)!.data[b] = r2(v);
        };
        blk.central.forEach((c) => put("Central", c.category, c.sg));
        blk.state.forEach((c) => put("State", c.category, c.sg));
    });
    const tech = new Map<string, { name: string; central: number[]; state: number[]; data: number[] }>();
    (day.technology_graph ?? []).forEach((blk) => {
        const b = blk.block - 1;
        if (b < 0 || b >= BLOCKS) return;
        if (!demand[b]) demand[b] = r2(blk.demand);
        blk.data_list.forEach((t) => {
            if (!tech.has(t.technology)) tech.set(t.technology, { name: t.technology, central: new Array(BLOCKS).fill(0), state: new Array(BLOCKS).fill(0), data: new Array(BLOCKS).fill(0) });
            const row = tech.get(t.technology)!;
            row.central[b] = r2(t.central_sg); row.state[b] = r2(t.state_sg); row.data[b] = r2(t.sg);
        });
    });
    const category = [...cat.values()], technology = [...tech.values()];
    const empty = demand.every((v) => !v) && category.every((s) => s.data.every((v) => !v));
    return empty ? null : { date: day.date, demand, category, technology };
}

// Day-ahead Supply Availability: one date, both graphs (no `graph` = both). Not cached — always
// straight from the API.
export const fetchDayPlantSupply = createAsyncThunk<{ date: string; detail: SupplyDayDetail | null }, { date: string }>(
    "supply/fetchDayPlantSupply",
    async ({ date }) => {
        const query = new URLSearchParams({ from_date: date, to_date: date });
        const res = await fetch(`${BASE_URL}plant-supply/by-category?${query.toString()}`, {
            headers: { accept: "*/*" },
        });
        if (!res.ok) throw new Error(`Failed to fetch plant supply: ${res.statusText}`);
        const json: PlantSupplyApiResponse = await res.json();
        return { date, detail: transformDetail(json) };
    }
);

export const supplySlice = createSlice({
    name: "supply",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchWeekPlantSupply.pending, (state, action) => {
                state.weekRequestId = action.meta.requestId;
                // A Sync DB keeps the current charts on screen while it checks the API.
                if (!action.meta.arg.sync) state.weekLoading = true;
                state.weekError = null;
            })
            .addCase(fetchWeekPlantSupply.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.weekRequestId) return;
                state.weekLoading = false;
                const { graph, from, to, days } = action.payload;
                state.week = { graph, from, to, days };
            })
            .addCase(fetchWeekPlantSupply.rejected, (state, action) => {
                if (action.meta.requestId !== state.weekRequestId) return;
                state.weekLoading = false;
                state.weekError = action.error.message || "Failed to load plant supply";
            })
            .addCase(fetchMonthPlantSupply.pending, (state, action) => {
                state.monthRequestId = action.meta.requestId;
                if (!action.meta.arg.sync) state.monthLoading = true;
                state.monthError = null;
            })
            .addCase(fetchMonthPlantSupply.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.monthRequestId) return;
                state.monthLoading = false;
                const { graph, from, to, days } = action.payload;
                state.month = { graph, from, to, days };
            })
            .addCase(fetchMonthPlantSupply.rejected, (state, action) => {
                if (action.meta.requestId !== state.monthRequestId) return;
                state.monthLoading = false;
                state.monthError = action.error.message || "Failed to load plant supply";
            })
            .addCase(fetchDayPlantSupply.pending, (state, action) => {
                state.dayRequestId = action.meta.requestId;
                state.dayLoading = true;
                state.dayError = null;
            })
            .addCase(fetchDayPlantSupply.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.dayRequestId) return;
                state.dayLoading = false;
                state.day = action.payload.detail;
                state.dayDate = action.payload.date;
            })
            .addCase(fetchDayPlantSupply.rejected, (state, action) => {
                if (action.meta.requestId !== state.dayRequestId) return;
                state.dayLoading = false;
                state.dayError = action.error.message || "Failed to load plant supply";
            });
    },
});

export default supplySlice.reducer;
