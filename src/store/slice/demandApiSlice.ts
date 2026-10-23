import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
    DemandApiResponse,
    DemandCalendarData,
    DemandQueryParams,
    DemandState,
} from "../features/demandTypes";
import BASE_URL from '../../../BASE_URL'

const initialState: DemandState = {
    data: null,
    loading: false,
    error: null,
    weekData: null,
    weekLoading: false,
    weekError: null,
};

// Helper to transform API response rows into 96-block calendar format
function transformDemandRows(rows: DemandApiResponse["rows"]): DemandCalendarData {
    const dates: string[] = [];
    const dem: number[][] = [];
    const av: number[][] = [];
    const C: number[][][] = [];
    const P: number[][][] = [];

    rows.forEach((row) => {
        dates.push(row.ts_date);

        const blocks: number[] = [];
        for (let b = 1; b <= 96; b++) {
            blocks.push(Number(row[`block_${b}`]) || 0);
        }

        dem.push(blocks);
        av.push([...blocks]);
        C.push([[...blocks]]);
        P.push([new Array(96).fill(0)]);
    });

    return {
        dates,
        cats: ["Forecast Demand"],
        plants: ["System Forecast"],
        plantType: { "System Forecast": "ISGS" },
        C,
        P,
        dem,
        av,
    };
}

// 1. Month-ahead Thunk
export const fetchDemandForecast = createAsyncThunk<
    DemandCalendarData,
    DemandQueryParams | undefined
>("demand/fetchDemandForecast", async (params) => {
    const query = new URLSearchParams({
        data_id: String(params?.data_id ?? 102130),
        from_date: params?.from_date ?? "2026-11-01",
        to_date: params?.to_date ?? "2026-11-30",
        location_id: String(params?.location_id ?? 10030),
        forcasted_by: params?.forcasted_by ?? "System",
        table: params?.table ?? "daily",
    });

    const res = await fetch(`${BASE_URL}demand-forcast/?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch forecast: ${res.statusText}`);
    const json: DemandApiResponse = await res.json();
    return transformDemandRows(json.rows);
});

// 2. Week-ahead Thunk (data_id=102120)
export const fetchWeekDemandForecast = createAsyncThunk<
    DemandCalendarData,
    DemandQueryParams | undefined
>("demand/fetchWeekDemandForecast", async (params) => {
    const query = new URLSearchParams({
        data_id: String(params?.data_id ?? 102120),
        from_date: params?.from_date ?? "2026-10-19",
        to_date: params?.to_date ?? "2026-10-25",
        location_id: String(params?.location_id ?? 10030),
        forcasted_by: params?.forcasted_by ?? "System",
        table: params?.table ?? "daily",
    });

    const res = await fetch(`${BASE_URL}demand-forcast/?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch week forecast: ${res.statusText}`);
    const json: DemandApiResponse = await res.json();
    return transformDemandRows(json.rows);
});

export const demandSlice = createSlice({
    name: "demand",
    initialState,
    reducers: {
        resetDemandState: (state) => {
            state.data = null;
            state.error = null;
            state.loading = false;
            state.weekData = null;
            state.weekLoading = false;
            state.weekError = null;
        },
    },
    extraReducers: (builder) => {
        // Month Ahead Handlers
        builder
            .addCase(fetchDemandForecast.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDemandForecast.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchDemandForecast.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to load month forecast";
            });

        // Week Ahead Handlers
        builder
            .addCase(fetchWeekDemandForecast.pending, (state) => {
                state.weekLoading = true;
                state.weekError = null;
            })
            .addCase(fetchWeekDemandForecast.fulfilled, (state, action) => {
                state.weekLoading = false;
                state.weekData = action.payload;
            })
            .addCase(fetchWeekDemandForecast.rejected, (state, action) => {
                state.weekLoading = false;
                state.weekError = action.error.message || "Failed to load week forecast";
            });
    },
});

export const { resetDemandState } = demandSlice.actions;
export default demandSlice.reducer;