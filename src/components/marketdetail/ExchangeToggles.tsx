import { EXCHANGES, type Exchange } from "./marketDetailData";

export function Toggle({ on, label, onClick, locked }: { on: boolean; label: string; onClick: () => void; locked?: boolean }) {
  return (
    <button
      type="button" aria-pressed={on} onClick={onClick} disabled={locked}
      title={locked ? "At least one exchange stays on" : undefined}
      className={
        "h-8 rounded-md disabled:cursor-not-allowed border px-3 text-[11px] font-semibold uppercase tracking-wide transition-colors " +
        (on ? "border-[#2563eb] bg-[#eff6ff] text-[#1e3a8a]" : "border-slate-300 bg-white text-slate-500 hover:text-slate-700")
      }
    >
      {label}
    </button>
  );
}

/** IEX · PXIL · HPX on/off (the last one on can't be turned off), a divider, then TABLE. */
export function ExchangeToggles({ active, onToggle, table, onTable }: {
  active: Set<Exchange>;
  onToggle: (e: Exchange) => void;
  table: boolean;
  onTable: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {EXCHANGES.map((e) => <Toggle key={e} on={active.has(e)} label={e} onClick={() => onToggle(e)} locked={active.size === 1 && active.has(e)} />)}
      <span className="mx-1.5 h-5 w-px bg-slate-200" />
      <Toggle on={table} label="Table" onClick={onTable} />
    </div>
  );
}

/** One-of-many toggles (Week / Month ahead pick one market and one exchange). */
export function ToggleGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
      <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {options.map((o) => <Toggle key={o} on={value === o} label={o} onClick={() => onChange(o)} />)}
    </div>
  );
}
