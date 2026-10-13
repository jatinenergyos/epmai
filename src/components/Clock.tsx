import { useEffect, useState } from "react";
import { dLabel, hm, istNow } from "@/data/engine";

export function Clock() {
  const [d, setD] = useState(istNow);
  useEffect(() => {
    const t = setInterval(() => setD(istNow()), 30_000);
    return () => clearInterval(t);
  }, []);
  const m = d.getHours() * 60 + d.getMinutes();
  return (
    <span className="num flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      <span className="hidden sm:inline">{dLabel(d)} ·</span> {hm(m)} IST · Block {Math.floor(m / 15) + 1}/96
    </span>
  );
}
