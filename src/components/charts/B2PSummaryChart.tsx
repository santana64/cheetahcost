"use client";

import { useMemo } from "react";
import type { BilanPilotage, Projet } from "@/types/projet";
import { aggregateBilan } from "@/lib/fgf";

type Props = {
  projet: Projet;
  bilan: BilanPilotage;
};

function n0(x: unknown) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmt(n: number, unit: string) {
  return `${n0(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${unit}`;
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function B2PSummaryChart({ projet, bilan }: Props) {
  const unit = projet.uniteCoutType === "charge" ? projet.uniteCoutLibelle : projet.monnaie;

  const data = useMemo(() => {
    const a = aggregateBilan(projet, bilan);
    const max = Math.max(1, a.totalBudgetADate, a.totalDepenses, a.totalValeurAcquise, a.totalCPT);
    const ratio = a.totalBudgetADate > 0 ? a.totalEcartFinal / a.totalBudgetADate : 0;

    return {
      ...a,
      max,
      ratio,
      ecart: n0(a.totalEcartFinal),
    };
  }, [projet, bilan]);

  const rows = [
    { label: "BÃ D", value: data.totalBudgetADate },
    { label: "DÃ©penses", value: data.totalDepenses },
    { label: "Valeur acquise", value: data.totalValeurAcquise },
    { label: "CPT", value: data.totalCPT },
  ];

  const ecartOk = data.ecart <= 0;

  // Mini chart SVG (barres verticales, trÃ¨s simple, sans lib)
  const svg = useMemo(() => {
    const W = 320;
    const H = 90;
    const padX = 12;
    const padY = 10;

    const values = rows.map((r) => n0(r.value));
    const maxV = Math.max(1, ...values);

    const barW = 52;
    const gap = 22;
    const baseY = H - padY;

    const bars = values.map((v, i) => {
      const h = Math.round(clamp01(v / maxV) * (H - padY * 2));
      const x = padX + i * (barW + gap);
      const y = baseY - h;
      return { x, y, w: barW, h };
    });

    return { W, H, bars };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.totalBudgetADate, data.totalDepenses, data.totalValeurAcquise, data.totalCPT]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[13px] font-semibold text-slate-900">Graphique de synthÃ¨se</div>
        <div className="mt-0.5 text-[12px] text-slate-600">Totaux du B2P sÃ©lectionnÃ©.</div>
      </div>

      {/* MINI CHART */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-3">
        <div className="text-[11px] font-semibold text-slate-700">Vue rapide</div>

        <div className="mt-2 overflow-x-auto">
          <svg width={svg.W} height={svg.H} viewBox={`0 0 ${svg.W} ${svg.H}`}>
            {/* grille lÃ©gÃ¨re */}
            <line x1="0" y1={svg.H - 10} x2={svg.W} y2={svg.H - 10} stroke="rgba(0,0,0,0.12)" />
            <line x1="0" y1={svg.H - 45} x2={svg.W} y2={svg.H - 45} stroke="rgba(0,0,0,0.07)" />
            <line x1="0" y1={svg.H - 80} x2={svg.W} y2={svg.H - 80} stroke="rgba(0,0,0,0.07)" />

            {svg.bars.map((b, i) => (
              <g key={i}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="10"
                  fill="rgba(15,23,42,0.78)"
                />
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-xl border border-black/10 bg-white/50 px-3 py-2">
              <span className="font-semibold">{r.label}</span>
              <span className="tabular-nums">{fmt(n0(r.value), unit)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BARRES HORIZONTALES (FULL WIDTH) */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-3">
        <div className="text-[11px] font-semibold text-slate-700">DÃ©tails</div>

        <div className="mt-3 space-y-3">
          {rows.map((r) => {
            const pct = clamp01(n0(r.value) / data.max) * 100;

            return (
              <div key={r.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-semibold text-slate-900">{r.label}</div>
                  <div className="text-[12px] font-semibold text-slate-900 tabular-nums">
                    {fmt(n0(r.value), unit)}
                  </div>
                </div>

                <div className="h-4 rounded-full bg-black/10">
                  <div
                    className="h-4 rounded-full bg-slate-800"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ECART FINAL */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold text-slate-900">Ã‰cart final (CPT âˆ’ BÃ D)</div>
            <div className="mt-0.5 text-[11px] text-slate-600">
              Ratio sur BÃ D :{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {(n0(data.ratio) * 100).toFixed(2)} %
              </span>
            </div>
          </div>

          <div
            className={[
              "rounded-xl border px-3 py-1.5 text-[12px] font-semibold tabular-nums",
              ecartOk
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                : "border-orange-500/30 bg-orange-500/10 text-orange-800",
            ].join(" ")}
          >
            {fmt(data.ecart, unit)}
          </div>
        </div>
      </div>
    </div>
  );
}

