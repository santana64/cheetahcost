"use client";

import { useMemo } from "react";

import { getBilanKind, getBilanLabel } from "@/lib/b2p";
import { formatDateFR } from "@/lib/dates";
import { aggregateBilan, sortBilans } from "@/lib/fgf";
import { getCostUnitLabel } from "@/lib/projectLabels";
import type { Projet } from "@/types/projet";

type Props = {
  projet: Projet;
  activeBilanId?: string;
};

type Point = {
  id: string;
  label: string;
  date: string;
  bad: number;
  depenses: number;
  va: number;
  cp: number;
  variance: number;
  ecart: number;
};

function n0(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fmtInt(value: number): string {
  return n0(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function linePath(points: Point[], key: "bad" | "depenses" | "va" | "cp", x: (index: number) => number, y: (value: number) => number): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(point[key]).toFixed(2)}`).join(" ");
}

/**
 * Flèche directionnelle : trait vertical depuis (x, yFrom) vers (x, yTo)
 * avec une seule tête à l'extrémité (yTo). Direction physique respectée.
 * §2.3 — Flèche Vc rouge : Valeur Acquise → Dépenses
 * §2.3 — Flèche E verte  : BàD → CP
 */
function Arrow({
  x,
  yFrom,
  yTo,
  color,
  label,
}: {
  x: number;
  yFrom: number;
  yTo: number;
  color: string;
  label: string;
}) {
  const goingDown = yTo > yFrom;
  const head = goingDown
    ? `M ${x - 6} ${yTo - 8} L ${x} ${yTo} L ${x + 6} ${yTo - 8}`
    : `M ${x - 6} ${yTo + 8} L ${x} ${yTo} L ${x + 6} ${yTo + 8}`;
  const mid = (yFrom + yTo) / 2;

  return (
    <g>
      <line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={color} strokeWidth="3" />
      <path d={head} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x={x + 10} y={mid + 4} fontSize="11" fontWeight="700" fill={color}>
        {label}
      </text>
    </g>
  );
}

export function ProjectEcartChart({ projet, activeBilanId }: Props) {
  const unit = getCostUnitLabel(projet);

  const data = useMemo(() => {
    // §2.3 — Tous les B2P doivent apparaître sous l'axe des abscisses (axe du temps).
    // §3.2 — Les scénarios B2Pi-2j (non retenus) ne sont PAS représentés sur le graphique :
    // ils partagent la date du B2Pi-1 et créeraient des doublons visuels.
    // Seuls le B2P0, les B2Pi-1 et le B2Pi-2 « retenu » apparaissent sur l'axe du temps.
    const bilans = sortBilans(projet.bilans ?? []).filter((bilan) => {
      if (getBilanKind(bilan) === "i-2j") return false;
      const agg = aggregateBilan(projet, bilan);
      return agg.totalBudgetADate > 0;
    });
    const points = bilans.map((bilan) => {
      const aggregate = aggregateBilan(projet, bilan);
      const isBaseline = getBilanKind(bilan) === "b2p0";
      // For B2P0: CP = BàD (no over/under-run at baseline), so Écart = 0
      const cp = isBaseline ? aggregate.totalBudgetADate : aggregate.totalCPT;
      return {
        id: bilan.id,
        label: getBilanLabel(bilan),
        date: bilan.triggerDate ?? bilan.date,
        bad: aggregate.totalBudgetADate,
        depenses: aggregate.totalDepenses,
        va: aggregate.totalValeurAcquise,
        cp,
        variance: isBaseline ? 0 : aggregate.totalVarianceCout,
        ecart: isBaseline ? 0 : aggregate.totalEcartFinal,
      } satisfies Point;
    });

    const activeIndex = Math.max(
      0,
      activeBilanId ? points.findIndex((point) => point.id === activeBilanId) : points.length - 1,
    );
    const maxY = Math.max(1, ...points.flatMap((point) => [point.bad, point.depenses, point.va, point.cp]));

    return { points, activeIndex: activeIndex >= 0 ? activeIndex : points.length - 1, maxY };
  }, [activeBilanId, projet]);

  if (!data.points.length) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
        <span className="text-2xl">📈</span>
        <p className="text-sm font-semibold text-slate-600">Aucune donnée à afficher</p>
        <p className="text-xs text-slate-400">Créez et renseignez au moins un B2P pour voir les courbes en S.</p>
      </div>
    );
  }

  const W = 980;
  const H = 520;
  const pad = { l: 72, r: 180, t: 58, b: 72 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const x = (index: number) => {
    const denominator = Math.max(1, data.points.length - 1);
    return pad.l + (iw * index) / denominator;
  };

  const y = (value: number) => pad.t + ih - (Math.max(0, value) / data.maxY) * ih;
  const active = data.points[data.activeIndex] ?? data.points[data.points.length - 1];
  const activeX = x(data.activeIndex);
  const varianceX = Math.min(W - pad.r + 30, activeX + 28);
  const ecartX = Math.min(W - pad.r + 105, activeX + 92);

  const ticks = [
    { value: 0, label: "0" },
    { value: data.maxY * 0.5, label: fmtInt(data.maxY * 0.5) },
    { value: data.maxY, label: fmtInt(data.maxY) },
  ];

  return (
    <div className="h-full w-full rounded-2xl border border-black/10 bg-[#F5F1E8] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="block">
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="10" fill="#FBFAF7" />
        <text x={pad.l} y="30" fontSize="18" fontWeight="800" fill="#111827">
          Méthode FGF des Courbes en S
        </text>
        <text x={pad.l} y="48" fontSize="12" fill="#4B5563">
          {projet.nom} · unité : {unit}
        </text>

        {ticks.map((tick) => {
          const yy = y(tick.value);
          return (
            <g key={tick.label}>
              <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="rgba(15,23,42,0.12)" />
              <text x={pad.l - 10} y={yy + 4} textAnchor="end" fontSize="11" fill="#4B5563">
                {tick.label}
              </text>
            </g>
          );
        })}

        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#111827" strokeWidth="1.2" />
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#111827" strokeWidth="1.2" />

        {data.points.map((point, index) => (
          <g key={point.id}>
            <line x1={x(index)} y1={H - pad.b} x2={x(index)} y2={H - pad.b + 5} stroke="#111827" />
            <text x={x(index)} y={H - pad.b + 20} textAnchor="middle" fontSize="10" fill="#4B5563">
              {point.label}
            </text>
            <text x={x(index)} y={H - pad.b + 34} textAnchor="middle" fontSize="9" fill="#6B7280">
              {formatDateFR(point.date)}
            </text>
          </g>
        ))}

        <path d={linePath(data.points, "bad", x, y)} fill="none" stroke="#111827" strokeWidth="3" filter="url(#softShadow)" />
        <path d={linePath(data.points, "depenses", x, y)} fill="none" stroke="#BE123C" strokeWidth="3" filter="url(#softShadow)" />
        <path d={linePath(data.points, "va", x, y)} fill="none" stroke="#3730A3" strokeWidth="3" filter="url(#softShadow)" />
        <path d={linePath(data.points, "cp", x, y)} fill="none" stroke="#047857" strokeWidth="3" filter="url(#softShadow)" />

        {data.points.map((point, index) => {
          const cx = x(index);
          const isActive = point.id === active.id;
          return (
            <g key={`points-${point.id}`}>
              {isActive ? <line x1={cx} y1={pad.t} x2={cx} y2={H - pad.b} stroke="rgba(217,119,6,0.35)" strokeWidth="2" /> : null}
              <circle cx={cx} cy={y(point.bad)} r={isActive ? 4.5 : 3} fill="#111827" />
              <circle cx={cx} cy={y(point.depenses)} r={isActive ? 4.5 : 3} fill="#BE123C" />
              <circle cx={cx} cy={y(point.va)} r={isActive ? 4.5 : 3} fill="#3730A3" />
              <circle cx={cx} cy={y(point.cp)} r={isActive ? 4.5 : 3} fill="#047857" />
            </g>
          );
        })}

        {/* §2.3 — Flèche Vc rouge orientée de Valeur Acquise vers Dépenses */}
        <Arrow x={varianceX} yFrom={y(active.va)} yTo={y(active.depenses)} color="#BE123C" label={`Vc ${fmtInt(active.variance)}`} />
        {/* §2.3 — Flèche E verte orientée de BàD vers CP */}
        <Arrow x={ecartX} yFrom={y(active.bad)} yTo={y(active.cp)} color="#0A8F3D" label={`E ${fmtInt(active.ecart)}`} />

        {/* Légende — courbes seulement (Vc et E sont représentés par des flèches sur le graphique, §2.3) */}
        <g transform={`translate(${W - 155}, ${pad.t})`}>
          {[
            ["#111827", "BàD"],
            ["#BE123C", "Dépenses"],
            ["#3730A3", "Valeur acquise"],
            ["#047857", "CP"],
          ].map(([color, label], index) => (
            <g key={label} transform={`translate(0, ${index * 24})`}>
              <line x1="0" y1="0" x2="20" y2="0" stroke={color} strokeWidth="3" />
              <text x="28" y="4" fontSize="11" fill="#111827">
                {label}
              </text>
            </g>
          ))}
          {/* Vc et E dans la légende : flèches directionnelles, pas de traits horizontaux */}
          <g transform={`translate(0, ${4 * 24})`}>
            <path d="M 10 -6 L 10 6 M 6 2 L 10 6 L 14 2" fill="none" stroke="#BE123C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="28" y="4" fontSize="11" fill="#111827">Variance coûts (Vc)</text>
          </g>
          <g transform={`translate(0, ${5 * 24})`}>
            <path d="M 10 -6 L 10 6 M 6 2 L 10 6 L 14 2" fill="none" stroke="#0A8F3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="28" y="4" fontSize="11" fill="#111827">Écart final (E)</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
