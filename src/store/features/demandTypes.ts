export interface DemandApiRow {
    data_id: number;
    client_id: string | null;
    forecasted_by: string;
    ts_period: string;
    ts_date: string;
    location_id: number;
    created_at: string;
    [key: `block_${number}`]: number;
}

export interface DemandApiResponse {
    data_id: number;
    horizon: string;
    table: string;
    from_date: string;
    to_date: string;
    location_id: number;
    forcasted_by: string;
    count: number;
    rows: DemandApiRow[];
}

export interface DemandCalendarData {
    dates: string[];
    cats: string[];
    plants: string[];
    plantType: Record<string, string>;
    C: number[][][]; // [day][category][96]
    P: number[][][]; // [day][plantGroup][96]
    dem: number[][]; // [day][96]
    av: number[][];  // [day][96]
}

export interface DemandQueryParams {
    data_id?: number;
    from_date?: string;
    to_date?: string;
    location_id?: number;
    forcasted_by?: string;
    table?: string;
}

export interface Season {
    cal_year: number;
    period_code: string;
    period_name: string;
    season_start: string;
    season_end: string;
    from_date: string;
    to_date: string;
    days_in_range: number;
}

export interface SeasonApiResponse {
    start_date: string;
    end_date: string;
    count: number;
    seasons: Season[];
}

/** One location's weather for a day: each field is 96 blocks keyed "1".."96". */
export type WeatherBlocks = Record<
    "cloudCover" | "relativeHumidity" | "temperature" | "temperatureDewPoint" | "temperatureFeelsLike" | "windGust" | "windSpeed",
    Record<string, number>
>;

export interface WeatherApiResponse {
    date: string;
    ref_date: string | null;
    client_id: string;
    locations: Record<string, { current: WeatherBlocks; reference: unknown }>;
}

export interface DemandState {
    data: DemandCalendarData | null;
    loading: boolean;
    error: string | null;
    weekData: DemandCalendarData | null;
    weekLoading: boolean;
    weekError: string | null;
    dayData: DemandCalendarData | null;
    dayLoading: boolean;
    dayError: string | null;
    dayRequestId: string | null;
    yearData: DemandCalendarData | null;
    yearLoading: boolean;
    yearError: string | null;
    seasons: Season[] | null;
    // One day of the year-ahead series, fetched when a day is opened.
    yearDay: { date: string; dem: number[] } | null;
    yearDayRequestId: string | null;
    yearRequestId: string | null;
    // Weather for every location on one date (weather/multi).
    weather: { date: string; locations: Record<string, WeatherBlocks> } | null;
    weatherLoading: boolean;
    weatherError: string | null;
    weatherRequestId: string | null;
}