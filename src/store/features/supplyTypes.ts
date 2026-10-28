/** plant-supply/by-category — one block of the category graph. */
export interface CategoryBlock {
    block: number;
    demand: number | null;
    udm: number | null;
    central: { category: string; sg: number }[];
    state: { category: string; sg: number }[];
}

/** plant-supply/by-category?graph=technology — one block of the technology graph. */
export interface TechnologyBlock {
    block: number;
    demand: number | null;
    udm: number | null;
    data_list: { technology: string; central_sg: number; state_sg: number; sg: number }[];
}

export interface PlantSupplyApiResponse {
    from_date: string;
    to_date: string;
    graph: string | null;
    count: number;
    data: { date: string; category_graph?: CategoryBlock[]; technology_graph?: TechnologyBlock[] }[];
}

export type SupplyGraph = "category" | "technology";

/** One day of supply SG per series (96 blocks each) plus demand; `null` = no data that day. */
export interface SupplyDay {
    date: string;
    series: { name: string; data: number[] }[];
    demand: number[];
}

/** A loaded range (a week or a month) of supply days for one graph. */
export interface SupplyRange { graph: SupplyGraph; from: string; to: string; days: (SupplyDay | null)[] }

/** One day of both graphs with the central / state split kept (Day-ahead page and its tables). */
export interface SupplyDayDetail {
    date: string;
    demand: number[];
    category: { name: string; group: "Central" | "State"; data: number[] }[];
    technology: { name: string; central: number[]; state: number[]; data: number[] }[];
}

export interface SupplyState {
    week: SupplyRange | null;
    weekLoading: boolean;
    weekError: string | null;
    weekRequestId: string | null;
    month: SupplyRange | null;
    monthLoading: boolean;
    monthError: string | null;
    monthRequestId: string | null;
    // Day ahead: one date, both graphs, not cached.
    day: SupplyDayDetail | null;
    dayDate: string | null;
    dayLoading: boolean;
    dayError: string | null;
    dayRequestId: string | null;
}
