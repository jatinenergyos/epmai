import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
    DemandApiResponse,
    DemandCalendarData,
    DemandQueryParams,
    DemandState,
    Season,
    SeasonApiResponse,
    WeatherApiResponse,
    WeatherBlocks,
} from "../features/demandTypes";
import BASE_URL from '../../../BASE_URL'

const initialState: DemandState = {
    data: null,
    loading: false,
    error: null,
    weekData: null,
    weekLoading: false,
    weekError: null,
    dayData: null,
    dayLoading: false,
    dayError: null,
    dayRequestId: null,
    yearData: null,
    yearLoading: false,
    yearError: null,
    seasons: null,
    yearDay: null,
    yearDayRequestId: null,
    yearRequestId: null,
    weather: null,
    weatherLoading: false,
    weatherError: null,
    weatherRequestId: null,
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

// 3. Day-ahead Thunk (data_id=102110) — one day, so from_date = to_date
export const fetchDayDemandForecast = createAsyncThunk<
    DemandCalendarData,
    DemandQueryParams & { date: string }
>("demand/fetchDayDemandForecast", async (params) => {
    const query = new URLSearchParams({
        data_id: String(params.data_id ?? 102110),
        from_date: params.date,
        to_date: params.date,
        location_id: String(params.location_id ?? 10030),
        forcasted_by: params.forcasted_by ?? "System",
    });

    const res = await fetch(`${BASE_URL}demand-forcast/?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch day forecast: ${res.statusText}`);
    const json: DemandApiResponse = await res.json();
    return transformDemandRows(json.rows);
});

// 4. Year-ahead Thunk (data_id=102140)
export const fetchYearDemandForecast = createAsyncThunk<
    DemandCalendarData,
    DemandQueryParams | undefined
>("demand/fetchYearDemandForecast", async (params) => {
    const query = new URLSearchParams({
        data_id: String(params?.data_id ?? 102140),
        from_date: params?.from_date ?? "2026-11-01",
        to_date: params?.to_date ?? "2027-10-31",
        location_id: String(params?.location_id ?? 10030),
        forcasted_by: params?.forcasted_by ?? "System",
        table: params?.table ?? "daily",
    });

    const res = await fetch(`${BASE_URL}demand-forcast/?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch year forecast: ${res.statusText}`);
    const json: DemandApiResponse = await res.json();
    return transformDemandRows(json.rows);
});

// 5. Year-ahead single day (data_id=102140, from_date = to_date) — opened from the year grid
export const fetchYearDayDemand = createAsyncThunk<
    { date: string; dem: number[] },
    DemandQueryParams & { date: string }
>("demand/fetchYearDayDemand", async (params) => {
    const query = new URLSearchParams({
        data_id: String(params.data_id ?? 102140),
        from_date: params.date,
        to_date: params.date,
        location_id: String(params.location_id ?? 10030),
        forcasted_by: params.forcasted_by ?? "System",
        table: params.table ?? "daily",
    });

    const res = await fetch(`${BASE_URL}demand-forcast/?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch day forecast: ${res.statusText}`);
    const json: DemandApiResponse = await res.json();
    const data = transformDemandRows(json.rows);
    return { date: params.date, dem: data.dem[0] ?? [] };
});

// 6. Seasons covering a date range
export const fetchSeasons = createAsyncThunk<
    Season[],
    { start_date: string; end_date: string }
>("demand/fetchSeasons", async ({ start_date, end_date }) => {
    const query = new URLSearchParams({ start_date, end_date });
    const res = await fetch(`${BASE_URL}period/season-by-date?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch seasons: ${res.statusText}`);
    const json: SeasonApiResponse = await res.json();
    return json.seasons;
});

// 7. Weather for every location on one date
export const fetchWeather = createAsyncThunk<
    { date: string; locations: Record<string, WeatherBlocks> },
    { date: string; client_id: string; location_id?: string }
>("demand/fetchWeather", async ({ date, client_id, location_id }) => {
    const query = new URLSearchParams({ date, client_id });
    if (location_id) query.set("location_id", location_id);
    const res = await fetch(`${BASE_URL}weather/multi?${query.toString()}`, {
        headers: { accept: "*/*" },
    });

    if (!res.ok) throw new Error(`Failed to fetch weather: ${res.statusText}`);
    const json: WeatherApiResponse = await res.json();
    const locations: Record<string, WeatherBlocks> = {};
    Object.entries(json.locations ?? {}).forEach(([id, l]) => { if (l?.current) locations[id] = l.current; });
    return { date, locations };
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
            state.dayData = null;
            state.dayLoading = false;
            state.dayError = null;
            state.yearData = null;
            state.yearLoading = false;
            state.yearError = null;
            state.seasons = null;
            state.yearDay = null;
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

        // Day Ahead Handlers
        builder
            // Only the latest request may land — paging quickly fires several.
            .addCase(fetchDayDemandForecast.pending, (state, action) => {
                state.dayRequestId = action.meta.requestId;
                state.dayLoading = true;
                state.dayError = null;
            })
            .addCase(fetchDayDemandForecast.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.dayRequestId) return;
                state.dayLoading = false;
                state.dayData = action.payload;
            })
            .addCase(fetchDayDemandForecast.rejected, (state, action) => {
                if (action.meta.requestId !== state.dayRequestId) return;
                state.dayLoading = false;
                state.dayData = null;
                state.dayError = action.error.message || "Failed to load day forecast";
            });

        // Year Ahead Handlers
        builder
            .addCase(fetchYearDemandForecast.pending, (state, action) => {
                state.yearRequestId = action.meta.requestId;
                state.yearLoading = true;
                state.yearError = null;
            })
            .addCase(fetchYearDemandForecast.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.yearRequestId) return;
                state.yearLoading = false;
                state.yearData = action.payload;
            })
            .addCase(fetchYearDemandForecast.rejected, (state, action) => {
                if (action.meta.requestId !== state.yearRequestId) return;
                state.yearLoading = false;
                state.yearError = action.error.message || "Failed to load year forecast";
            });

        // Year Ahead single-day Handlers (only the latest request may land)
        builder
            .addCase(fetchYearDayDemand.pending, (state, action) => {
                state.yearDayRequestId = action.meta.requestId;
            })
            .addCase(fetchYearDayDemand.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.yearDayRequestId) return;
                state.yearDay = action.payload;
            });

        // Weather Handlers (only the latest request may land)
        builder
            .addCase(fetchWeather.pending, (state, action) => {
                state.weatherRequestId = action.meta.requestId;
                state.weatherLoading = true;
                state.weatherError = null;
            })
            .addCase(fetchWeather.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.weatherRequestId) return;
                state.weatherLoading = false;
                state.weather = action.payload;
            })
            .addCase(fetchWeather.rejected, (state, action) => {
                if (action.meta.requestId !== state.weatherRequestId) return;
                state.weatherLoading = false;
                state.weather = null;
                state.weatherError = action.error.message || "Failed to load weather";
            });

        // Season Handlers
        builder
            .addCase(fetchSeasons.pending, (state) => {
                state.seasons = null;
            })
            .addCase(fetchSeasons.fulfilled, (state, action) => {
                state.seasons = action.payload;
            });
    },
});

export const { resetDemandState } = demandSlice.actions;
export default demandSlice.reducer;