import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MON, NOW } from "@/data/engine";
import { WINDOW_START } from "@/components/WeekSupplyGrid";
import { useDcData } from "@/features/loadgrid/data";

/* Small controls and helpers shared by the module × horizon pages: the Market / Exchange
   lists, week-range helpers and the week / day navigator badges. */

export const MARKETS = ["DAM", "RTM", "GDAM", "HPDAM"];
export const EXCHANGES = ["IEX", "PXIL", "HPX"];
// Helper to format Date -> YYYY-MM-DD
export function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday = 0, Sunday = 6
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekRange(offset: number) {
  const currentMonday = getMonday(new Date()); // Anchors to real current week
  const monday = new Date(currentMonday);
  monday.setDate(monday.getDate() + offset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    from_date: formatIso(monday),
    to_date: formatIso(sunday),
    mondayDate: monday,
  };
}

/** "01 - 07 Apr 2019" (same month) or "29 Mar - 04 Apr 2019" (spans two months) for
 *  the 7-day window starting at `startIso` ("YYYY-MM-DD"); day numbers zero-padded. */
function weekRangeLabel(mondayDate: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);

  const startDay = pad(mondayDate.getDate());
  const endDay = pad(sundayDate.getDate());
  const startMon = MON[mondayDate.getMonth()].slice(0, 3);
  const endMon = MON[sundayDate.getMonth()].slice(0, 3);
  const year = sundayDate.getFullYear();

  if (mondayDate.getMonth() === sundayDate.getMonth()) {
    return `${startDay} - ${endDay} ${endMon} ${year}`;
  }
  return `${startDay} ${startMon} - ${endDay} ${endMon} ${year}`;
}

/** The week navigator for Supply's, Demand's, and Market Intelligence's week-ahead
 *  pages — `weekOffset` picks which 7-day window <WeekSupplyGrid> shows, shifted a
 *  week at a time from its sample "current" week (1 Apr 2019). Only ±1 week gets the
 *  "Previous/Current/Next Week" label; further out it's just the date range. Backward
 *  paging is unbounded down to the dataset's actual first day; forward paging stops
 *  at Next week. */
// function WeekBadge({ weekOffset, setWeekOffset }: { weekOffset: number; setWeekOffset: (n: number) => void }) {
//   const { D } = useDcData();
//   const { label, minOffset, maxOffset } = useMemo(() => {
//     if (!D) return { label: "", minOffset: weekOffset, maxOffset: weekOffset };
//     const anchor = Math.max(0, D.dates.indexOf(WINDOW_START));
//     const idx = Math.max(0, Math.min(anchor + weekOffset * 7, D.dates.length - 7));
//     const range = weekRangeLabel(D.dates[idx]);
//     const relative = weekOffset === 0 ? "Current Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Previous Week" : null;
//     return {
//       label: relative ? relative + ", " + range : range,
//       // Backward paging is unbounded down to the dataset's first day; forward paging
//       // stops at Next week — there's no data beyond that to show.
//       minOffset: Math.floor(-anchor / 7),
//       maxOffset: 1,
//     };
//   }, [D, weekOffset]);
//   return (
//     <div className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
//       <button
//         type="button" aria-label="Previous week" disabled={weekOffset <= minOffset} onClick={() => setWeekOffset(Math.max(minOffset, weekOffset - 1))}
//         className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
//       >
//         <ChevronLeft className="h-3.5 w-3.5" />
//       </button>
//       <span className="whitespace-nowrap px-2 font-medium">{label}</span>
//       <button
//         type="button" aria-label="Next week" disabled={weekOffset >= maxOffset} onClick={() => setWeekOffset(Math.min(maxOffset, weekOffset + 1))}
//         className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
//       >
//         <ChevronRight className="h-3.5 w-3.5" />
//       </button>
//     </div>
//   );
// }

export function WeekBadge({
  weekOffset,
  setWeekOffset,
  isDemand = false,
}: {
  weekOffset: number;
  setWeekOffset: (n: number) => void;
  isDemand?: boolean;
}) {
  const { D } = useDcData();

  const { label, minOffset, maxOffset } = useMemo(() => {
    // 1. Demand module (real calendar dates)
    if (isDemand) {
      const { mondayDate } = getWeekRange(weekOffset);
      const range = weekRangeLabel(mondayDate);
      const relative =
        weekOffset === 0
          ? "Current Week"
          : weekOffset === 1
            ? "Next Week"
            : weekOffset === -1
              ? "Previous Week"
              : null;

      return {
        label: relative ? `${relative}, ${range}` : range,
        minOffset: -Infinity, // <-- Unbounded for past weeks (free backward paging)
        maxOffset: 1,         // <-- Restricted strictly up to Next Week
      };
    }

    // 2. Fallback for Supply module
    if (!D) return { label: "", minOffset: weekOffset, maxOffset: weekOffset };
    const anchor = Math.max(0, D.dates.indexOf(WINDOW_START));
    const idx = Math.max(0, Math.min(anchor + weekOffset * 7, D.dates.length - 7));
    const [sy, sm, sd] = D.dates[idx].split("-").map(Number);
    const range = weekRangeLabel(new Date(sy, sm - 1, sd));
    const relative =
      weekOffset === 0
        ? "Current Week"
        : weekOffset === 1
          ? "Next Week"
          : weekOffset === -1
            ? "Previous Week"
            : null;

    return {
      label: relative ? `${relative}, ${range}` : range,
      minOffset: -Infinity, // <-- Unbounded for past weeks
      maxOffset: 1,         // <-- Restricted up to Next Week
    };
  }, [D, weekOffset, isDemand]);

  return (
    <div className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
      <button
        type="button"
        aria-label="Previous week"
        disabled={weekOffset <= minOffset}
        onClick={() => setWeekOffset(weekOffset - 1)}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="whitespace-nowrap px-2 font-medium">{label}</span>
      <button
        type="button"
        aria-label="Next week"
        disabled={weekOffset >= maxOffset}
        onClick={() => setWeekOffset(Math.min(maxOffset, weekOffset + 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** "22 Oct 2026" for a single day, zero-padded. */
function dayRangeLabel(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return pad(d.getDate()) + " " + MON[d.getMonth()] + " " + d.getFullYear();
}

/** The day navigator for Demand's and Supply's Day-ahead pages. On Demand it picks the
 *  date the API is queried for (from_date = to_date): unbounded into the past, up to
 *  7 days ahead of today. On Supply it's a placeholder bounded to the current week
 *  (Monday–Sunday around today) and doesn't change the chart. Only ±1 day gets the
 *  "Yesterday/Today/Tomorrow" label; further out it's just the date. */
export function DayBadge({ dayOffset, setDayOffset, isDemand = false }: { dayOffset: number; setDayOffset: (n: number) => void; isDemand?: boolean }) {
  const { label, minOffset, maxOffset } = useMemo(() => {
    const daysSinceMonday = (NOW.getDay() + 6) % 7;
    const date = new Date(NOW); date.setDate(date.getDate() + dayOffset);
    const range = dayRangeLabel(date);
    const relative = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : dayOffset === -1 ? "Yesterday" : null;
    return {
      label: relative ? relative + ", " + range : range,
      minOffset: isDemand ? -Infinity : -daysSinceMonday,
      maxOffset: isDemand ? 7 : 6 - daysSinceMonday,
    };
  }, [dayOffset, isDemand]);
  return (
    <div className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
      <button
        type="button" aria-label="Previous day" disabled={dayOffset <= minOffset} onClick={() => setDayOffset(Math.max(minOffset, dayOffset - 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="whitespace-nowrap px-2 font-medium">{label}</span>
      <button
        type="button" aria-label="Next day" disabled={dayOffset >= maxOffset} onClick={() => setDayOffset(Math.min(maxOffset, dayOffset + 1))}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
