import { createHashHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { isMod, isTf, type ModId, type TfId } from "@/data/engine";
import { AppShell } from "@/components/AppShell";
import { OverviewPage } from "@/pages/Overview";
import { CommandCentrePage } from "@/pages/CommandCentre";
import { ModulesPage } from "@/pages/Modules";
import { ModulePage } from "@/pages/Module";
import { ModuleRowPage } from "@/pages/ModuleRow";
import { CellPage } from "@/pages/Cell";
import { SnapshotPage } from "@/pages/Snapshot";
import { HorizonPage } from "@/pages/Horizon";
import { ReportsPage } from "@/pages/Reports";
import { GlossaryPage } from "@/pages/Glossary";
import { NotFound } from "@/pages/NotFound";

const rootRoute = createRootRoute({
  // h = planning horizon, m = module horizon (single-module pages), mod = module focused on the
  // all-horizons page, t = the open tab on a cell page — all kept separate.
  validateSearch: (s: Record<string, unknown>): { h?: TfId; m?: TfId; mod?: ModId; t?: string } => ({
    ...(isTf(s.h) ? { h: s.h } : {}),
    ...(isTf(s.m) ? { m: s.m } : {}),
    ...(isMod(s.mod) ? { mod: s.mod } : {}),
    ...(typeof s.t === "string" ? { t: s.t } : {}),
  }),
  component: AppShell,
  notFoundComponent: NotFound,
});

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: "/", component: CommandCentrePage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/overview", component: OverviewPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/modules", component: ModulesPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/modules/$moduleId", component: ModulePage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/modules/$moduleId/row", component: ModuleRowPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/cell/$moduleId", component: CellPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/snapshot", component: SnapshotPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/horizon", component: HorizonPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/reports", component: ReportsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/glossary", component: GlossaryPage }),
]);

// Hash history keeps deep links working when the app is served as a single static file.
// Switch to createBrowserHistory() if you deploy behind a server with SPA fallback.
export const router = createRouter({ routeTree, history: createHashHistory(), scrollRestoration: true, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
