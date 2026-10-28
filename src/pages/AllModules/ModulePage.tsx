import { useParams } from "@tanstack/react-router";
import { isMod } from "@/data/engine";
import { useModuleTf } from "@/lib/horizon";
import { MODULE_PAGES } from "@/pages/AllModules";
import { NotFoundPage } from "@/pages/NotFound/NotFoundPage";

/** All modules → a module at a horizon (/modules/$moduleId?m=). The page itself lives in
 *  AllModules/<Module>/<Module><Horizon>.tsx. */
export function ModulePage() {
  const { moduleId } = useParams({ strict: false }) as { moduleId?: string };
  const { tf } = useModuleTf();
  if (!isMod(moduleId)) return <NotFoundPage />;
  const Page = MODULE_PAGES[moduleId].horizons[tf].Module;
  return <Page />;
}
