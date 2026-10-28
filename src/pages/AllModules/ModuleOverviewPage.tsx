import { useParams } from "@tanstack/react-router";
import { isMod } from "@/data/engine";
import { MODULE_PAGES } from "@/pages/AllModules";
import { NotFoundPage } from "@/pages/NotFound/NotFoundPage";

/** All modules → a module's Overview (/modules/$moduleId/row): the complete grid row for that
 *  module across every horizon. The page lives in AllModules/<Module>/<Module>Overview.tsx. */
export function ModuleOverviewPage() {
  const { moduleId } = useParams({ strict: false }) as { moduleId?: string };
  if (!isMod(moduleId)) return <NotFoundPage />;
  const Page = MODULE_PAGES[moduleId].Overview;
  return <Page />;
}
