# EPM AI · Energy Portfolio Management (React rebuild)

React 19 + TypeScript + TanStack Router + Vite + Tailwind + shadcn/ui + Recharts.
All data is a seeded simulation (no backend) ported from the original `EPM_AI1.html`.

## Run
```bash
pnpm i
pnpm dev        # http://localhost:5173
pnpm build      # -> dist/
```

## Structure
```
src/
  data/engine.ts     simulation: 96 blocks, plants, merit-order optimise, WK/MO/YR/LT aggregates, DR, catalogs
  data/model.ts      per module × horizon KPIs + chart specs (G(mod, tf)), alerts, home KPIs
  data/insights.ts   sub-metrics, AI recs, workflow steps, lenses, drill-downs, report content
  theme/             ThemeProvider (4 palettes × light/dark/system) + themes.css (generated)
  lib/               glossary (35 terms, KPI ⓘ tooltips), horizon (?h= in URL), side-panel context
  components/        AppShell, HorizonRuler, Kpis, Chart/Spark, SidePanel, blocks
  pages/             Overview, Module, Horizon, Reports, Glossary, NotFound
  router.tsx         /  /modules/$moduleId  /horizon  /reports  /glossary   (search: ?h=dr|id|da|wk|mo|yr|lt)
```

## Customise
- Themes: edit `scripts/gen-themes.py`, then `python3 scripts/gen-themes.py` → `src/theme/themes.css`.
- Router uses hash history so the single-file build works anywhere. For a server with SPA fallback,
  switch `createHashHistory()` → `createBrowserHistory()` in `src/router.tsx`.
- Real data: replace the generators in `src/data/engine.ts`; `model.ts`/`insights.ts` only read from it.
