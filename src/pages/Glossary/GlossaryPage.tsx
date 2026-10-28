import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GLOSSARY } from "@/lib/glossary";
import { PageHead, Section } from "@/components/layout";
import { Dot } from "@/components/status";
import { Input } from "@/components/ui/input";

const GUIDE = [
  { t: "Pick a horizon once", d: "The ruler under the top bar sets the time frame for every page: real-time, today, tomorrow, next week, next month, next year or ten years. The choice is kept in the link, so you can share the exact view." },
  { t: "Read the status colours", d: "", dots: true },
  { t: "Ranges, not just numbers", d: "Forecasts show a shaded P10–P90 band. Treat the line as the best guess and the band as where reality will most likely land." },
  { t: "Click to go deeper", d: "Click any point on a main chart, or any value in a table, to open a side panel with the full breakdown for that block or period: plants, zones, consumers, prices and bid tickets." },
  { t: "Four AI lenses", d: "Each module's AI insights card has four tabs. Decide lists recommendations you can accept or hold. Operate shows where the automated workflow is. Report lists relevant reports. Analyse explains accuracy and drivers, with a temperature what-if." },
];

export function GlossaryPage() {
  const [q, setQ] = useState("");
  const terms = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? GLOSSARY.filter((t) => (t.term + " " + t.def).toLowerCase().includes(s)) : GLOSSARY;
  }, [q]);
  const groups = [...new Set(terms.map((t) => t.group))];

  return (
    <>
      <PageHead crumb="Glossary & guide" title="How to read EPM AI" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title="Using the dashboard">
          <ol className="space-y-4">
            {GUIDE.map((g, k) => (
              <li key={g.t} className="grid grid-cols-[24px_1fr] gap-3">
                <span className="num grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{k + 1}</span>
                <div>
                  <h3 className="font-semibold">{g.t}</h3>
                  {g.dots ? (
                    <ul className="mt-1 space-y-1 text-[13px] text-muted-foreground">
                      <li className="flex items-center gap-2"><Dot st="ok" /><b className="text-foreground">On track</b> nothing needs doing</li>
                      <li className="flex items-center gap-2"><Dot st="warn" /><b className="text-foreground">Watch</b> drifting from plan, keep an eye on it</li>
                      <li className="flex items-center gap-2"><Dot st="crit" /><b className="text-foreground">Act now</b> a decision is needed to avoid cost or penalty</li>
                    </ul>
                  ) : <p className="text-[13px] leading-relaxed text-muted-foreground">{g.d}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Glossary" desc={GLOSSARY.length + " terms"}
          action={
            <label className="relative block w-full sm:w-60">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms" className="h-9 pl-8" aria-label="Search terms" />
            </label>
          }>
          {terms.length === 0 && <p className="text-[13px] text-muted-foreground">No term matches “{q}”. Try a shorter word such as “price” or “DSM”.</p>}
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g}>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{g}</h3>
                <dl className="divide-y">
                  {terms.filter((t) => t.group === g).map((t) => (
                    <div key={t.id} className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr] sm:gap-4">
                      <dt className="text-[13px] font-semibold">{t.term}</dt>
                      <dd className="text-[13px] leading-relaxed text-muted-foreground">{t.def}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
