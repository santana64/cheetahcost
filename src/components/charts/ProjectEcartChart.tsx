"use client";

import { useMemo, useState } from "react";

import { getBilanKind, getBilanLabel } from "@/lib/b2p";
import { formatDateFR } from "@/lib/dates";
import { aggregateBilan, sortBilans } from "@/lib/fgf";
import { getCostUnitLabel } from "@/lib/projectLabels";
import type { Projet } from "@/types/projet";

/* ───────────────────────────────────────────────────────────────────────────
   Refonte v3 (NT.26.008 — UX feedback : « les flèches étaient horribles »)
   ─────────────────────────────────────────────────────────────────────────────
   - Indicateurs et couleurs INCHANGÉS.
   - Les pilules Vc/É qui se chevauchaient avec les end labels sont SUPPRIMÉES.
   - À leur place : un PANNEAU LATÉRAL à droite, séparé du graphique, qui
     contient deux grandes cards « Vc » et « É » avec leur valeur, et une mini
     synthèse BàD / CP / Dép / VA en dessous.
   - Sur le chart, les flèches directionnelles deviennent discrètes (trait fin
     et arrowhead) entre VA→Dép. et BàD→CP, sans label. Elles matérialisent
     visuellement le gap sans alourdir la lecture.
   - End labels supprimés du chart : les valeurs sont désormais dans le panneau.
   ─────────────────────────────────────────────────────────────────────────── */

const COLORS = {
  bad: "#111827",
  depenses: "#BE123C",
  va: "#3730A3",
  cp: "#047857",
  vc: "#BE123C",
  e: "#0A8F3D",
  bi: "#1F4E79",
  grid: "rgba(15,23,42,0.10)",
  axis: "#111827",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  cardBg: "#FBFAF7",
  outerBg: "#F5F1E8",
  panelBg: "#FFFFFF",
  panelBorder: "rgba(15,23,42,0.10)",
  gapDeficit: "rgba(190,18,60,0.10)",
  gapSurplus: "rgba(4,120,87,0.10)",
};

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
  isBaseline: boolean;
};

function n0(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fmtInt(value: number): string {
  return n0(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function fmtSigned(value: number): string {
  const v = n0(value);
  const abs = Math.abs(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${abs}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Lissage Catmull-Rom → cubic Bezier
   ──────────────────────────────────────────────────────────────────────────── */
function smoothPath(
  points: Point[],
  key: "bad" | "depenses" | "va" | "cp",
  x: (index: number) => number,
  y: (value: number) => number,
  tension: number = 0.5,
): string {
  if (!points.length) return "";
  const pts = points.map((p, i) => [x(i), y(p[key])] as const);
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  if (pts.length === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function gapAreaPath(
  points: Point[],
  topKey: "bad" | "cp",
  bottomKey: "bad" | "cp",
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  if (points.length < 2) return "";
  const topPts = points.map((p, i) => [x(i), y(p[topKey])] as const);
  const bottomPts = points.map((p, i) => [x(i), y(p[bottomKey])] as const).reverse();
  const start = topPts[0];
  let d = `M ${start[0]} ${start[1]}`;
  for (let i = 1; i < topPts.length; i++) d += ` L ${topPts[i][0]} ${topPts[i][1]}`;
  for (const p of bottomPts) d += ` L ${p[0]} ${p[1]}`;
  return `${d} Z`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Mini-flèche directionnelle sur le chart — pas de label, juste le trait et
   les têtes pour montrer visuellement le gap entre 2 courbes.
   ──────────────────────────────────────────────────────────────────────────── */
function MiniArrow({
  x,
  yFrom,
  yTo,
  color,
}: {
  x: number;
  yFrom: number;
  yTo: number;
  color: string;
}) {
  if (Math.abs(yTo - yFrom) < 6) return null; // pas la peine si gap minuscule
  const goingDown = yTo > yFrom;
  const headEnd = goingDown
    ? `M ${x - 4} ${yTo - 6} L ${x} ${yTo} L ${x + 4} ${yTo - 6}`
    : `M ${x - 4} ${yTo + 6} L ${x} ${yTo} L ${x + 4} ${yTo + 6}`;
  return (
    <g>
      <line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <path d={headEnd} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export function ProjectEcartChart({ projet, activeBilanId }: Props) {
  const unit = getCostUnitLabel(projet);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const bilans = sortBilans(projet.bilans ?? []).filter((bilan) => {
      if (getBilanKind(bilan) === "i-2j") return false;
      const agg = aggregateBilan(projet, bilan);
      return agg.totalBudgetADate > 0;
    });
    const points: Point[] = bilans.map((bilan) => {
      const aggregate = aggregateBilan(projet, bilan);
      const isBaseline = getBilanKind(bilan) === "b2p0";
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
        isBaseline,
      };
    });

    const totalBI = (projet.lots ?? []).reduce((sum, lot) => sum + Number(lot.budgetInitial ?? 0), 0);

    const rawActiveIndex = activeBilanId ? points.findIndex((p) => p.id === activeBilanId) : points.length - 1;
    const activeIndex = rawActiveIndex >= 0 ? rawActiveIndex : points.length - 1;
    const visiblePoints = points.slice(0, activeIndex + 1);

    const rawMax = Math.max(
      1,
      totalBI,
      ...visiblePoints.flatMap((p) => [p.bad, p.depenses, p.va, p.cp]),
    );
    const maxY = rawMax * 1.1;

    return {
      points: visiblePoints,
      activeIndex: visiblePoints.length - 1,
      maxY,
      totalBI,
    };
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

  /* ──────────────────────────────────────────────────────────────────────────
     Layout : SVG global divisé en 2 zones
     - Zone graphique : pad.l → chartRight
     - Zone panneau   : panelLeft → W - 16
     ────────────────────────────────────────────────────────────────────────── */
  const W = 980;
  const H = 560;
  const panelW = 200;
  const panelGap = 16;
  const pad = { l: 84, r: panelW + panelGap, t: 60, b: 110 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const chartRight = W - pad.r;
  const panelLeft = chartRight + panelGap;

  const x = (index: number) => {
    const denominator = Math.max(1, data.points.length - 1);
    return pad.l + (iw * index) / denominator;
  };
  const y = (value: number) => pad.t + ih - (Math.max(0, value) / data.maxY) * ih;

  const active = data.points[data.activeIndex] ?? data.points[data.points.length - 1];
  const showActiveArrows = !active.isBaseline;
  const activeX = x(data.activeIndex);

  // 4 ticks pour l'axe Y
  const ticks = [
    { value: 0, label: "0" },
    { value: data.maxY * 0.33, label: fmtInt(data.maxY * 0.33) },
    { value: data.maxY * 0.66, label: fmtInt(data.maxY * 0.66) },
    { value: data.maxY, label: fmtInt(data.maxY) },
  ];
  const biY = y(data.totalBI);

  // Tooltip
  const focusIndex = hoverIndex !== null ? hoverIndex : data.activeIndex;
  const focusPoint = data.points[focusIndex];

  // Zone d'écart (rouge si déficit global, vert si économie globale)
  const hasDeficit = data.points.some((p) => p.cp > p.bad);
  const gapFill = hasDeficit ? COLORS.gapDeficit : COLORS.gapSurplus;
  const gapAreaTop = hasDeficit ? "cp" : "bad";
  const gapAreaBottom = hasDeficit ? "bad" : "cp";

  // Légende
  const legendItems = [
    { color: COLORS.bad, label: "BàD" },
    { color: COLORS.depenses, label: "Dépenses" },
    { color: COLORS.va, label: "Valeur acquise" },
    { color: COLORS.cp, label: "CP" },
  ];
  const itemWidths = [78, 110, 140, 64];
  const totalLegendWidth = itemWidths.reduce((a, b) => a + b, 0);
  const legendStartX = pad.l + Math.max(0, (iw - totalLegendWidth) / 2);
  let legendCursor = legendStartX;
  const legendY = H - 30;

  /* ──────────────────────────────────────────────────────────────────────────
     Panneau latéral droit — cards Vc et É
     ────────────────────────────────────────────────────────────────────────── */
  const cardLeft = panelLeft;
  const cardWidth = panelW - 8;
  const cardHeight = 78;
  const cardSpacing = 12;
  const ecartCardY = pad.t;
  const vcCardY = ecartCardY + cardHeight + cardSpacing;
  const summaryCardY = vcCardY + cardHeight + cardSpacing;

  const ecartColor = active.ecart > 0 ? COLORS.depenses : COLORS.cp;
  const vcColor = active.variance > 0 ? COLORS.depenses : COLORS.cp;
  const ecartLabel = active.ecart > 0 ? "Dépassement" : active.ecart < 0 ? "Économie" : "À l'équilibre";
  const vcLabel = active.variance > 0 ? "Sur-coût" : active.variance < 0 ? "Productivité +" : "À l'équilibre";

  // 4 lignes synthèse : BàD, CP, Dép., VA
  const summary = [
    { label: "BàD", value: active.bad, color: COLORS.bad },
    { label: "CP", value: active.cp, color: COLORS.cp },
    { label: "Dép.", value: active.depenses, color: COLORS.depenses },
    { label: "VA", value: active.va, color: COLORS.va },
  ];

  return (
    <div className="relative h-full w-full rounded-2xl border border-black/10 p-3" style={{ background: COLORS.outerBg }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="block">
        <defs>
          <filter id="curveShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.20" />
          </filter>
          <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.10" />
          </filter>
          <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
          </filter>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="12" fill={COLORS.cardBg} />

        {/* En-tête */}
        <text x={pad.l} y="30" fontSize="17" fontWeight="700" fill={COLORS.textPrimary}>
          Méthode FGF des Courbes en S
        </text>
        <text x={pad.l} y="46" fontSize="11" fill={COLORS.textSecondary}>
          {projet.nom} · unité : {unit}
        </text>

        {/* Grille horizontale */}
        {ticks.map((tick) => {
          const yy = y(tick.value);
          return (
            <g key={tick.label}>
              <line
                x1={pad.l}
                y1={yy}
                x2={chartRight}
                y2={yy}
                stroke={COLORS.grid}
                strokeDasharray={tick.value === 0 ? "0" : "3 3"}
              />
              <text
                x={pad.l - 12}
                y={yy + 4}
                textAnchor="end"
                fontSize="10.5"
                fill={COLORS.textSecondary}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {tick.label}
              </text>
            </g>
          );
        })}

        {/* Annotation BI sur l'axe Y */}
        {data.totalBI > 0 && (
          <g>
            <line x1={pad.l - 6} y1={biY} x2={pad.l} y2={biY} stroke={COLORS.bi} strokeWidth="2" />
            <text
              x={pad.l - 12}
              y={biY + 4}
              textAnchor="end"
              fontSize="10.5"
              fontWeight="700"
              fill={COLORS.bi}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              BI {fmtInt(data.totalBI)}
            </text>
          </g>
        )}

        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke={COLORS.axis} strokeWidth="1.2" />
        <line x1={pad.l} y1={H - pad.b} x2={chartRight} y2={H - pad.b} stroke={COLORS.axis} strokeWidth="1.2" />

        {/* Zone d'écart ombrée */}
        {data.points.length >= 2 && (
          <path d={gapAreaPath(data.points, gapAreaTop, gapAreaBottom, x, y)} fill={gapFill} stroke="none" />
        )}

        {/* Labels X */}
        {data.points.map((point, index) => (
          <g key={point.id}>
            <line x1={x(index)} y1={H - pad.b} x2={x(index)} y2={H - pad.b + 4} stroke={COLORS.axis} />
            <text
              x={x(index)}
              y={H - pad.b + 18}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={COLORS.textSecondary}
            >
              {point.label}
            </text>
            <text x={x(index)} y={H - pad.b + 31} textAnchor="middle" fontSize="9" fill={COLORS.textMuted}>
              {formatDateFR(point.date)}
            </text>
          </g>
        ))}

        {/* Vertical highlight du focus */}
        {focusPoint && (
          <line
            x1={x(focusIndex)}
            y1={pad.t}
            x2={x(focusIndex)}
            y2={H - pad.b}
            stroke="rgba(217,119,6,0.20)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Courbes lissées */}
        <path d={smoothPath(data.points, "bad", x, y)} fill="none" stroke={COLORS.bad} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#curveShadow)" />
        <path d={smoothPath(data.points, "depenses", x, y)} fill="none" stroke={COLORS.depenses} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#curveShadow)" />
        <path d={smoothPath(data.points, "va", x, y)} fill="none" stroke={COLORS.va} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#curveShadow)" />
        <path d={smoothPath(data.points, "cp", x, y)} fill="none" stroke={COLORS.cp} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#curveShadow)" />

        {/* Marqueurs */}
        {data.points.map((point, index) => {
          const cx = x(index);
          const isFocused = index === focusIndex;
          const r = isFocused ? 4.5 : 3;
          const op = isFocused || index === data.activeIndex ? 1 : 0.55;
          return (
            <g key={`pts-${point.id}`} opacity={op}>
              <circle cx={cx} cy={y(point.bad)} r={r} fill={COLORS.bad} filter={isFocused ? "url(#dotShadow)" : undefined} />
              <circle cx={cx} cy={y(point.depenses)} r={r} fill={COLORS.depenses} filter={isFocused ? "url(#dotShadow)" : undefined} />
              <circle cx={cx} cy={y(point.va)} r={r} fill={COLORS.va} filter={isFocused ? "url(#dotShadow)" : undefined} />
              <circle cx={cx} cy={y(point.cp)} r={r} fill={COLORS.cp} filter={isFocused ? "url(#dotShadow)" : undefined} />
            </g>
          );
        })}

        {/* Mini-flèches Vc / É — discrètes, sans label (les valeurs sont dans le panneau) */}
        {showActiveArrows && (
          <>
            <MiniArrow x={activeX - 6} yFrom={y(active.va)} yTo={y(active.depenses)} color={COLORS.vc} />
            <MiniArrow x={activeX + 6} yFrom={y(active.bad)} yTo={y(active.cp)} color={COLORS.e} />
          </>
        )}

        {/* Hit-areas pour le hover */}
        {data.points.map((point, index) => {
          const cx = x(index);
          const half = data.points.length > 1 ? iw / (data.points.length - 1) / 2 : iw / 2;
          return (
            <rect
              key={`hit-${point.id}`}
              x={cx - half}
              y={pad.t}
              width={half * 2}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Tooltip au survol */}
        {hoverIndex !== null && focusPoint && (() => {
          const cx = x(hoverIndex);
          const ttW = 168;
          const ttH = focusPoint.isBaseline ? 70 : 100;
          const goLeft = cx + ttW + 16 > chartRight;
          const ttX = goLeft ? cx - ttW - 12 : cx + 12;
          const ttY = Math.max(pad.t + 4, Math.min(H - pad.b - ttH - 4, y(focusPoint.bad) - ttH / 2));
          const lines = focusPoint.isBaseline
            ? [
                { label: "BàD", value: focusPoint.bad, color: COLORS.bad },
                { label: "CP", value: focusPoint.cp, color: COLORS.cp },
              ]
            : [
                { label: "BàD", value: focusPoint.bad, color: COLORS.bad },
                { label: "Dép.", value: focusPoint.depenses, color: COLORS.depenses },
                { label: "VA", value: focusPoint.va, color: COLORS.va },
                { label: "CP", value: focusPoint.cp, color: COLORS.cp },
                { label: "Vc", value: focusPoint.variance, color: COLORS.vc, signed: true },
                { label: "É", value: focusPoint.ecart, color: COLORS.e, signed: true },
              ];
          return (
            <g pointerEvents="none">
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6" fill="#FFFFFF" stroke="rgba(15,23,42,0.18)" strokeWidth="1" filter="url(#dotShadow)" />
              <text x={ttX + 10} y={ttY + 16} fontSize="11" fontWeight="700" fill={COLORS.textPrimary}>{focusPoint.label}</text>
              <text x={ttX + ttW - 10} y={ttY + 16} fontSize="9.5" fill={COLORS.textMuted} textAnchor="end">
                {formatDateFR(focusPoint.date)}
              </text>
              {lines.map((line, i) => (
                <g key={line.label} transform={`translate(${ttX + 10}, ${ttY + 30 + i * 12})`}>
                  <circle cx="3" cy="-3" r="3" fill={line.color} />
                  <text x="12" y="0" fontSize="10" fill={COLORS.textSecondary}>{line.label}</text>
                  <text
                    x={ttW - 20}
                    y="0"
                    fontSize="10"
                    fontWeight="700"
                    fill={line.color}
                    textAnchor="end"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {("signed" in line && line.signed) ? fmtSigned(line.value) : fmtInt(line.value)}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* Légende horizontale (courbes seulement, les flèches sont expliquées par le panneau) */}
        <g transform={`translate(0, ${legendY})`}>
          {legendItems.map((item, i) => {
            const cx = legendCursor;
            legendCursor += itemWidths[i];
            return (
              <g key={item.label} transform={`translate(${cx}, 0)`}>
                <line x1="0" y1="0" x2="20" y2="0" stroke={item.color} strokeWidth="2.5" strokeLinecap="round" />
                <text x="28" y="4" fontSize="10.5" fill={COLORS.textPrimary}>{item.label}</text>
              </g>
            );
          })}
        </g>

        {/* ────────────────────────────────────────────────────────────────────
            PANNEAU LATÉRAL DROIT — Vc / É / Synthèse du B2P actif
            ──────────────────────────────────────────────────────────────────── */}

        {/* Titre du panneau */}
        <text x={cardLeft} y={pad.t - 22} fontSize="11" fontWeight="700" fill={COLORS.textSecondary}>
          {active.label}
        </text>
        <text x={cardLeft + cardWidth} y={pad.t - 22} fontSize="10" fill={COLORS.textMuted} textAnchor="end">
          {formatDateFR(active.date)}
        </text>

        {/* Card Écart */}
        <g filter="url(#cardShadow)">
          <rect
            x={cardLeft}
            y={ecartCardY}
            width={cardWidth}
            height={cardHeight}
            rx="10"
            fill={COLORS.panelBg}
            stroke={ecartColor}
            strokeWidth="1.5"
          />
          {/* Bande verticale colorée à gauche */}
          <rect x={cardLeft} y={ecartCardY} width="5" height={cardHeight} rx="2" fill={ecartColor} />
          <text x={cardLeft + 16} y={ecartCardY + 22} fontSize="11" fontWeight="700" fill={COLORS.textMuted}>
            É — ÉCART
          </text>
          <text
            x={cardLeft + 16}
            y={ecartCardY + 50}
            fontSize="26"
            fontWeight="800"
            fill={ecartColor}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {active.isBaseline ? "0" : fmtSigned(active.ecart)}
          </text>
          <text x={cardLeft + 16} y={ecartCardY + 68} fontSize="10" fill={COLORS.textMuted}>
            {active.isBaseline ? "Référence initiale" : `${ecartLabel} · CP − BàD`}
          </text>
        </g>

        {/* Card Vc */}
        <g filter="url(#cardShadow)">
          <rect
            x={cardLeft}
            y={vcCardY}
            width={cardWidth}
            height={cardHeight}
            rx="10"
            fill={COLORS.panelBg}
            stroke={vcColor}
            strokeWidth="1.5"
          />
          <rect x={cardLeft} y={vcCardY} width="5" height={cardHeight} rx="2" fill={vcColor} />
          <text x={cardLeft + 16} y={vcCardY + 22} fontSize="11" fontWeight="700" fill={COLORS.textMuted}>
            Vc — VARIANCE COÛT
          </text>
          <text
            x={cardLeft + 16}
            y={vcCardY + 50}
            fontSize="26"
            fontWeight="800"
            fill={vcColor}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {active.isBaseline ? "0" : fmtSigned(active.variance)}
          </text>
          <text x={cardLeft + 16} y={vcCardY + 68} fontSize="10" fill={COLORS.textMuted}>
            {active.isBaseline ? "Référence initiale" : `${vcLabel} · Dép. − VA`}
          </text>
        </g>

        {/* Mini-synthèse BàD / CP / Dép. / VA */}
        <g>
          <text x={cardLeft} y={summaryCardY - 6} fontSize="10" fontWeight="700" fill={COLORS.textMuted}>
            SYNTHÈSE
          </text>
          {summary.map((row, i) => {
            const ry = summaryCardY + i * 22;
            return (
              <g key={row.label} transform={`translate(${cardLeft}, ${ry})`}>
                <circle cx="6" cy="10" r="3.5" fill={row.color} />
                <text x="16" y="14" fontSize="11" fill={COLORS.textSecondary}>{row.label}</text>
                <text
                  x={cardWidth - 4}
                  y="14"
                  fontSize="12"
                  fontWeight="700"
                  fill={COLORS.textPrimary}
                  textAnchor="end"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmtInt(row.value)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
