"use client";

import { useMemo } from "react";
import type { Projet } from "@/types/projet";
import { aggregateBilan, sortBilans } from "@/lib/fgf";

type Props = {
  projet: Projet;
  /** optionnel : pour surligner le B2P courant */
  activeBilanId?: string;
  /** hauteur du graphe */
  height?: number;
};

function n0(x: unknown) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtIntFR(n: number) {
  return (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export function ProjectTrendChart({ projet, activeBilanId, height = 180 }: Props) {
  const unit = projet.uniteCoutType === "charge" ? projet.uniteCoutLibelle : projet.monnaie;

  const series = useMemo(() => {
    const bilans = sortBilans(projet.bilans ?? []);
    const pts = bilans.map((b) => {
      const a = aggregateBilan(projet, b);
      return {
        id: b.id,
        label: `#${b.numero}`,
        bad: n0(a.totalBudgetADate),
        dep: n0(a.totalDepenses),
        va: n0(a.totalValeurAcquise),
        cpt: n0(a.totalCPT),
      };
    });

    const maxY = Math.max(
      1,
      ...pts.flatMap((p) => [p.bad, p.dep, p.va, p.cpt]),
    );

    return { pts, maxY };
  }, [projet]);

  const W = 340; // largeur interne (panneau)
  const H = height;

  const pad = { l: 42, r: 10, t: 14, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const x = (i: number) => {
    const n = Math.max(1, series.pts.length - 1);
    return pad.l + (iw * i) / n;
  };

  const y = (v: number) => {
    const vv = Math.max(0, v);
    return pad.t + ih - (ih * vv) / series.maxY;
  };

  const mkPath = (key: "bad" | "dep" | "va" | "cpt") => {
    if (series.pts.length === 0) return "";
    return series.pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p[key]).toFixed(2)}`)
      .join(" ");
  };

  const activeIndex =
    activeBilanId ? series.pts.findIndex((p) => p.id === activeBilanId) : -1;

  // ticks Y (0, 50%, 100%)
  const ticks = [
    { v: 0, label: "0" },
    { v: series.maxY * 0.5, label: fmtIntFR(series.maxY * 0.5) },
    { v: series.maxY, label: fmtIntFR(series.maxY) },
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-slate-900">Évolution (projet)</div>
          <div className="mt-0.5 text-[11px] text-slate-600">
            BàD / Dépenses / VA / CPT sur les B2P
          </div>
        </div>
        <div className="text-[11px] font-semibold text-slate-700">{unit}</div>
      </div>

      {/* Légende */}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-slate-900" /> BàD
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-rose-700" /> Dépenses
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-indigo-700" /> VA
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-700" /> CPT
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-[#F5F1E8]">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block">
          {/* Grille horizontale */}
          {ticks.map((t, idx) => {
            const yy = y(t.v);
            return (
              <g key={idx}>
                <line
                  x1={pad.l}
                  y1={yy}
                  x2={W - pad.r}
                  y2={yy}
                  stroke="rgba(15,23,42,0.12)"
                  strokeWidth="1"
                />
                <text
                  x={pad.l - 8}
                  y={yy + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="rgba(15,23,42,0.70)"
                  className="tabular-nums"
                >
                  {t.label}
                </text>
              </g>
            );
          })}

          {/* Axe X labels (#B2P) */}
          {series.pts.map((p, i) => (
            <text
              key={p.id}
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(15,23,42,0.70)"
            >
              {p.label}
            </text>
          ))}

          {/* Courbes */}
          <path d={mkPath("bad")} fill="none" stroke="#0f172a" strokeWidth="2.2" />
          <path d={mkPath("dep")} fill="none" stroke="#be123c" strokeWidth="2.2" />
          <path d={mkPath("va")} fill="none" stroke="#3730a3" strokeWidth="2.2" />
          <path d={mkPath("cpt")} fill="none" stroke="#047857" strokeWidth="2.2" />

          {/* Points + surlignage */}
          {series.pts.map((p, i) => {
            const isActive = i === activeIndex;
            const cx = x(i);
            const cyBad = y(p.bad);

            return (
              <g key={`pt-${p.id}`}>
                {/* repère vertical B2P courant */}
                {isActive && (
                  <line
                    x1={cx}
                    y1={pad.t}
                    x2={cx}
                    y2={H - pad.b}
                    stroke="rgba(0,0,0,0.20)"
                    strokeWidth="1.5"
                  />
                )}

                {/* petit point sur BàD (repère) */}
                <circle
                  cx={cx}
                  cy={cyBad}
                  r={isActive ? 4.5 : 3}
                  fill={isActive ? "#111827" : "rgba(15,23,42,0.55)"}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mini résumé du dernier point */}
      {series.pts.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
          {(() => {
            const last = series.pts[series.pts.length - 1];
            return (
              <>
                <div className="rounded-xl border border-black/10 bg-white/70 px-2 py-2">
                  <div className="font-semibold text-slate-900">Dernier B2P {last.label}</div>
                  <div className="mt-1">BàD {fmtIntFR(last.bad)} &bull; CPT {fmtIntFR(last.cpt)}</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white/70 px-2 py-2">
                  <div className="font-semibold text-slate-900">Exécution</div>
                  <div className="mt-1">Dép. {fmtIntFR(last.dep)} &bull; VA {fmtIntFR(last.va)}</div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
