"use client";

import { useMemo } from "react";
import type { Projet } from "@/types/projet";
import { aggregateBilan, sortBilans } from "@/lib/fgf";

function n0(x: unknown) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtIntFR(n: number) {
  return (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

const SERIES: { key: "bad" | "dep" | "va" | "cpt" | "ecart"; label: string; color: string }[] = [
  { key: "bad",   label: "BàD",       color: "#0f172a" },
  { key: "dep",   label: "Dépenses",  color: "#be123c" },
  { key: "va",    label: "VA",        color: "#3730a3" },
  { key: "cpt",   label: "CPT",       color: "#047857" },
  { key: "ecart", label: "Écart",     color: "#d97706" },
];

export function ProjectFGFChart({ projet }: { projet: Projet }) {
  const series = useMemo(() => {
    const bilans = sortBilans(projet.bilans ?? []);
    const pts = bilans.map((b) => {
      const a = aggregateBilan(projet, b);
      return {
        id:    b.id,
        label: `#${b.numero}`,
        bad:   n0(a.totalBudgetADate),
        dep:   n0(a.totalDepenses),
        va:    n0(a.totalValeurAcquise),
        cpt:   n0(a.totalCPT),
        ecart: n0(a.totalEcartFinal),
      };
    });

    const maxY = Math.max(
      1,
      ...pts.flatMap((p) => [p.bad, p.dep, p.va, p.cpt, Math.abs(p.ecart)]),
    );

    return { pts, maxY };
  }, [projet]);

  const W = 360;
  const H = 260;
  const pad = { l: 46, r: 10, t: 16, b: 32 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = series.pts.length;

  // bar layout: 5 bars per group, small gap between groups
  const groupW = n > 0 ? Math.floor(iw / n) : iw;
  const barW = Math.max(2, Math.floor(groupW / 7));
  const seriesCount = 5;
  const totalBarsW = barW * seriesCount;
  const groupPad = Math.max(0, Math.floor((groupW - totalBarsW) / 2));

  const groupX = (i: number) => pad.l + i * groupW;
  const barX = (i: number, s: number) => groupX(i) + groupPad + s * barW;
  const y0 = pad.t + ih;

  const y = (v: number) => {
    const vv = Math.max(0, v);
    return pad.t + ih - (ih * vv) / series.maxY;
  };

  const ticks = [
    { v: 0, label: "0" },
    { v: series.maxY * 0.5, label: fmtIntFR(series.maxY * 0.5) },
    { v: series.maxY, label: fmtIntFR(series.maxY) },
  ];

  if (!series.pts.length) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400">
        Aucun B2P — graphique disponible après génération
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-3">
      <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2 py-0.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-[#F5F1E8]">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block">
          {/* Grille */}
          {ticks.map((t, idx) => {
            const yy = y(t.v);
            return (
              <g key={idx}>
                <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="rgba(15,23,42,0.10)" strokeWidth="1" />
                <text x={pad.l - 6} y={yy + 4} textAnchor="end" fontSize="9" fill="rgba(15,23,42,0.55)">{t.label}</text>
              </g>
            );
          })}

          {/* Barres par groupe */}
          {series.pts.map((p, i) => {
            const vals = [p.bad, p.dep, p.va, p.cpt, Math.abs(p.ecart)];
            return (
              <g key={p.id}>
                {vals.map((v, s) => {
                  const bx = barX(i, s);
                  const by = y(v);
                  const bh = Math.max(1, y0 - by);
                  return (
                    <rect
                      key={s}
                      x={bx}
                      y={by}
                      width={barW - 1}
                      height={bh}
                      fill={SERIES[s].color}
                      opacity={0.82}
                      rx={1}
                    />
                  );
                })}
                <text
                  x={groupX(i) + groupPad + totalBarsW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(15,23,42,0.60)"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
