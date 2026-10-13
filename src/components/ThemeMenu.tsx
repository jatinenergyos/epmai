import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PALETTES, useTheme, type Mode, type Palette as P } from "@/theme/ThemeProvider";

export function ThemeMenu() {
  const { palette, mode, setPalette, setMode } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme"><Palette className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={palette} onValueChange={(v) => setPalette(v as P)}>
          {PALETTES.map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id} className="gap-2">
              <span className="flex overflow-hidden rounded-sm border">
                {p.swatch.map((c) => <i key={c} className="h-4 w-2.5" style={{ background: c }} />)}
              </span>
              <span className="flex flex-col leading-tight">
                <span>{p.name}</span>
                <span className="text-[11px] text-muted-foreground">{p.note}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Appearance{palette === "tech" && " (Tech Innovation is always dark)"}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <DropdownMenuRadioItem value="system" className="gap-2"><Monitor className="h-3.5 w-3.5" />System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" className="gap-2"><Sun className="h-3.5 w-3.5" />Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="gap-2"><Moon className="h-3.5 w-3.5" />Dark</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
