import { configureStore } from "@reduxjs/toolkit";
import demandReducer from "./slice/demandApiSlice";
import supplyReducer from "./slice/supplyApiSlice";

export const store = configureStore({
    reducer: {
        demand: demandReducer,
        supply: supplyReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;