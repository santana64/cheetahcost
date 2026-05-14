"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateFR, getYearFromISO, parseFrenchDateInput } from "@/lib/dates";

type FrenchDateInputProps = {
  value: string;
  onChange: (nextISO: string) => void;
  label?: string;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
};

export function FrenchDateInput({
  value,
  onChange,
  label,
  min,
  max,
  className,
  disabled,
}: FrenchDateInputProps) {
  const [display, setDisplay] = useState(formatDateFR(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDisplay(formatDateFR(value));
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const fallbackYear = useMemo(() => getYearFromISO(value), [value]);

  const commit = (raw: string) => {
    const parsed = parseFrenchDateInput(raw, fallbackYear);
    if (!parsed) {
      setError("Date attendue : jj/mm/aaaa.");
      setDisplay(raw);
      return;
    }

    if (min && parsed < min) {
      setError(`Date avant le minimum (${formatDateFR(min)}).`);
      setDisplay(formatDateFR(parsed));
      return;
    }

    if (max && parsed > max) {
      setError(`Date apres le maximum (${formatDateFR(max)}).`);
      setDisplay(formatDateFR(parsed));
      return;
    }

    setError(null);
    setDisplay(formatDateFR(parsed));
    onChange(parsed);
  };

  return (
    <div className={className}>
      {label ? <div className="mb-1 text-[11px] text-slate-600">{label}</div> : null}

      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          disabled={disabled}
          placeholder="jj/mm/aaaa"
          onChange={(e) => setDisplay(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(e.currentTarget.value);
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:bg-slate-100"
        />

        <input
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label ? `${label} calendrier` : "Calendrier"}
          onChange={(e) => {
            setError(null);
            setDisplay(formatDateFR(e.target.value));
            onChange(e.target.value);
          }}
          className="h-10 w-[48px] rounded-lg border border-slate-200 bg-white px-2 text-transparent outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      {error ? <div className="mt-1 text-[11px] text-red-600">{error}</div> : null}
    </div>
  );
}
