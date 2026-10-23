import { configureStore } from "@reduxjs/toolkit";
import demandReducer from "./slice/demandApiSlice";

export const store = configureStore({
    reducer: {
        demand: demandReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;