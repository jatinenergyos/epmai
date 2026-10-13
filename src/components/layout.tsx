import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHead({ crumb, title, after, children }: { crumb?: ReactNode; title: ReactNode; after?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 space-y-2">
      {crumb && <div className="text-xs text-muted-foreground">{crumb}</div>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1>
        {after}
      </div>
      {children}
    </header>
  );
}

export function Section({ title, desc, action, children, className, id }: { title?: ReactNode; desc?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("min-w-0 rounded-lg border bg-card p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold leading-snug">{title}</h2>}
            {desc && <p className="mt-0.5 text-[13px] text-muted-foreground">{desc}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
