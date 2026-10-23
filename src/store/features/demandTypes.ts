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

export interface DemandState {
    data: DemandCalendarData | null;
    loading: boolean;
    error: string | null;
    weekData: DemandCalendarData | null;
    weekLoading: boolean;
    weekError: string | null;
}