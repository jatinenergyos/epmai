import { useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { TFS } from "@/data/engine";
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink,
  NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useHorizon } from "@/lib/horizon";
import { cn } from "@/lib/utils";

/** Header "Planning horizon" entry rendered as a shadcn Navigation Menu (same as "All modules"):
 *  a trigger showing the active horizon that opens a panel of every horizon. Picking one opens the
 *  Planning-horizon page for that horizon, which leads with the all-module Overview. */
export function HorizonNav() {
  const { tf } = useHorizon();
  const navigate = useNavigate();
  // Picking a horizon opens the Planning-horizon page for it; its module strip defaults to the
  // Overview (every module at that horizon).
  const pick = (id: typeof TFS[number]["id"]) =>
    navigate({ to: "/horizon", search: (prev: Record<string, unknown>) => ({ ...prev, h: id }) });

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className="h-auto gap-1 bg-transparent px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Planning horizon
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[min(90vw,34rem)] p-3">
              <ul className="grid gap-1 sm:grid-cols-2">
                {TFS.map((t) => (
                  <HorizonItem key={t.id} active={t.id === tf} onPick={() => pick(t.id)}
                    name={t.name} hz={t.hz} span={t.span} />
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function HorizonItem({ active, onPick, name, hz, span }: {
  active: boolean; onPick: () => void; name: string; hz: string; span: string;
}) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <button onClick={onPick}
          className={cn("block w-full select-none rounded-md border p-3 text-left leading-none outline-none transition-colors hover:bg-accent focus:bg-accent",
            active ? "border-primary bg-accent" : "border-transparent")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold leading-tight">{name}</span>
            <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{span}</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{hz}</p>
        </button>
      </NavigationMenuLink>
    </li>
  );
}
