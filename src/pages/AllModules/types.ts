import type { ComponentType } from "react";
import type { TfId } from "@/data/engine";

/** One module at one horizon: the Planning-horizon view and the All-modules page. */
export interface HorizonPages { Plan: ComponentType; Module: ComponentType }
/** A module's pages: its Overview (every horizon) plus one entry per horizon. */
export interface ModulePages { Overview: ComponentType; horizons: Record<TfId, HorizonPages> }
