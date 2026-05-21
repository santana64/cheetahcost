"use client";

import { useMemo, useState } from "react";

import { getBilanKind, getBilanLabel, getProjectPlannedB2PDates } from "@/lib/b2p";
import { formatDateFR } from "@/lib/dates";
import { aggregateBilan, isBilanEmpty, sortBilans } from "@/lib/fgf";
import { getCostUnitLabel } from "@/lib/projectLabels";
import type { BilanPilotage, Projet } from "@/types/projet";

/* ───────────────────────────────────────────────────────────────────────────
   Refonte v4 — Demande du boss :
   ─────────────────────────────────────────────────────────────────────────────
   1. TOUS les B2P prévus sur l'axe horizontal (échelle fixe, ne change pas
      selon le B2P consulté). Les B2P futurs (non encore saisis) sont
      représentés par leur label/date sur l'axe X sans marqueur sur les
      courbes.
   2. Les courbes s'allongent de B2P en B2P au fur et à mesure des saisies
      (du B2P0 jusqu'au dernier B2P saisi, pas tronquées au B2P actif).
   3. Vc et É RETIRÉS du graphique : suppression des mini-flèches, du
      panneau latéral droit et de la zone d'écart ombrée.
   4. Indicateurs et couleurs des courbes inchangés :
        BàD #111827, Dépenses #BE123C, VA #3730A3, CP #047857, BI #1F4E79.
   ─────────────────────────────────────────────────────────────────────────── */

const COLORS = {
  bad: "#111827",
  depenses: "#BE123C",
  va: "#3730A3",
  cp: "#047857",
  bi: "#1F4E79",
  grid: "rgba(15,23,42,0.10)",
  axis: "#111827",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textFuture: "#6B7280",
  cardBg: "#FBFAF7",
  outerBg: "#F5F1E8",
};

type Props = {
  projet: Projet;
  activeBilanId?: string;
};

/** Un point sur la timeline = une position sur l'axe X.
 *  Si `saved=true`, il porte les valeurs agrégées ; sinon c'est un label seul. */
type TimelinePoint = {
  numero: number;
  date: string;
  label: string;
  bilanId?: string;
  saved: boolean;
  isBaseline?: boolean;
  bad?: number;
  depenses?: number;
  va?: number;
  cp?: number;
};

function n0(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fmtInt(value: number): string {
  return n0(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

/* ────────────────────────────────────────────────────────────────────────────
   Lissage Catmull-Rom → cubic Bezier (sur les points saisis uniquement)
   ──────────────────────────────────────────────────────────────────────────── */
function smoothPath(
  savedTimelineIndices: number[],
  values: number[],
  x: (index: number) => number,
  y: (value: number) => number,
  tension: number = 0.5,
): string {
  if (!savedTimelineIndices.length) return "";
  const pts = savedTimelineIndices.map((idx, i) => [x(idx), y(values[i])] as const);
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

export function ProjectEcartChart({ projet, activeBilanId }: Props) {
  const unit = getCostUnitLabel(projet);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const totalBI = (projet.lots ?? []).reduce((sum, lot) => sum + Number(lot.budgetInitial ?? 0), 0);

    // Toutes les dates planifiées (B2P0 + tous les B2P i-1)
    const plannedDates = getProjectPlannedB2PDates(projet);

    // Pour chaque numero (0..N), on cherche le bilan i-1 ou b2p0 correspondant
    const bilans = sortBilans(projet.bilans ?? []);
    const findBilan = (numero: number): BilanPilotage | undefined => {
      if (numero === 0) {
        return bilans.find((b) => getBilanKind(b) === "b2p0");
      }
      // Préférer i-2 retenu si présent, sinon i-1
      const retenu = bilans.find((b) => Number(b.numero) === numero && getBilanKind(b) === "i-2");
      if (retenu) return retenu;
      return bilans.find((b) => Number(b.numero) === numero && getBilanKind(b) === "i-1");
    };

    const timeline: TimelinePoint[] = plannedDates.map((date, numero) => {
      const bilan = findBilan(numero);
      const fallbackLabel = numero === 0 ? "B2P0" : `B2P n°${numero}-1`;
      if (!bilan) {
        return { numero, date, label: fallbackLabel, saved: false };
      }
      const isBaseline = getBilanKind(bilan) === "b2p0";
      // B2P0 est toujours "saved" car il porte la référence initiale (BI)
      const empty = !isBaseline && isBilanEmpty(bilan);
      if (empty) {
        return {
          numero,
          date: bilan.triggerDate ?? bilan.date ?? date,
          label: getBilanLabel(bilan),
          bilanId: bilan.id,
          saved: false,
        };
      }
      const aggregate = aggregateBilan(projet, bilan);
      return {
        numero,
        date: bilan.triggerDate ?? bilan.date ?? date,
        label: getBilanLabel(bilan),
        bilanId: bilan.id,
        saved: true,
        isBaseline,
        bad: aggregate.totalBudgetADate,
        depenses: aggregate.totalDepenses,
        va: aggregate.totalValeurAcquise,
        cp: isBaseline ? aggregate.totalBudgetADate : aggregate.totalCPT,
      };
    });

    // Indices saved (TOUS les bilans saisis, indépendamment du B2P consulté)
    const allSavedIndices = timeline
      .map((p, i) => (p.saved ? i : -1))
      .filter((i) => i >= 0);

    // Index du B2P actif (consulté). Si l'id ne match pas, on prend le dernier saisi.
    let activeIndex = activeBilanId
      ? timeline.findIndex((p) => p.bilanId === activeBilanId)
      : -1;
    if (activeIndex < 0) {
      activeIndex = allSavedIndices.length > 0 ? allSavedIndices[allSavedIndices.length - 1] : 0;
    }

    // §3 (NT.26.008) — Historisation des courbes : les courbes s'allongent de
    // B2P en B2P au fur et à mesure que l'on consulte un B2P plus récent.
    // Donc on borne les courbes à l'index du B2P consulté (et pas au dernier
    // saisi globalement). L'AXE X reste lui inchangé : tous les B2P prévus
    // apparaissent dessus (point 1 du boss).
    const savedIndices = allSavedIndices.filter((i) => i <= activeIndex);

    // Échelle Y : max parmi les valeurs visibles (= saisies jusqu'au B2P actif)
    // + BI (qui sert de plancher). L'échelle ne bouge pas selon les futurs.
    const rawMax = Math.max(
      1,
      totalBI,
      ...savedIndices.flatMap((i) => {
        const p = timeline[i];
        return [p.bad ?? 0, p.depenses ?? 0, p.va ?? 0, p.cp ?? 0];
      }),
    );
    const maxY = rawMax * 1.1;

    return { timeline, savedIndices, activeIndex, maxY, totalBI };
  }, [activeBilanId, projet]);

  if (data.timeline.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
        <span className="text-2xl">📈</span>
        <p className="text-sm font-semibold text-slate-600">Aucune date B2P planifiée</p>
        <p className="text-xs text-slate-400">Définissez les dates B2P dans l&apos;onglet Planning.</p>
      </div>
    );
  }

  const W = 980;
  const H = 560;
  const pad = { l: 88, r: 110, t: 60, b: 110 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  // Échelle X basée sur le nombre total de B2P prévus — FIXE (point 1 du boss)
  const denom = Math.max(1, data.timeline.length - 1);
  const x = (index: number) => pad.l + (iw * index) / denom;
  const y = (value: number) => pad.t + ih - (Math.max(0, value) / data.maxY) * ih;

  // Ticks Y
  const ticks = [
    { value: 0, label: "0" },
    { value: data.maxY * 0.33, label: fmtInt(data.maxY * 0.33) },
    { value: data.maxY * 0.66, label: fmtInt(data.maxY * 0.66) },
    { value: data.maxY, label: fmtInt(data.maxY) },
  ];
  const biY = y(data.totalBI);

  // Tooltip : index survolé (priorité). On accepte aussi le survol d'un futur.
  const focusIndex = hoverIndex !== null ? hoverIndex : data.activeIndex;
  const focusPoint = data.timeline[focusIndex];

  // End labels : sur le DERNIER point saisi (pas sur le B2P actif)
  const lastSavedIndex = data.savedIndices.length > 0 ? data.savedIndices[data.savedIndices.length - 1] : -1;
  const lastSaved = lastSavedIndex >= 0 ? data.timeline[lastSavedIndex] : null;
  const lastSavedX = lastSavedIndex >= 0 ? x(lastSavedIndex) : pad.l;

  // Construire les paths des courbes (sur saved seulement)
  const badPath = smoothPath(
    data.savedIndices,
    data.savedIndices.map((i) => data.timeline[i].bad ?? 0),
    x,
    y,
  );
  const depPath = smoothPath(
    data.savedIndices,
    data.savedIndices.map((i) => data.timeline[i].depenses ?? 0),
    x,
    y,
  );
  const vaPath = smoothPath(
    data.savedIndices,
    data.savedIndices.map((i) => data.timeline[i].va ?? 0),
    x,
    y,
  );
  const cpPath = smoothPath(
    data.savedIndices,
    data.savedIndices.map((i) => data.timeline[i].cp ?? 0),
    x,
    y,
  );

  // End labels pour les 4 séries (sur le dernier saved)
  let endLabels: { key: string; color: string; label: string; value: number; yRaw: number }[] = [];
  if (lastSaved) {
    endLabels = [
      { key: "bad", color: COLORS.bad, label: "BàD", value: lastSaved.bad ?? 0 },
      { key: "cp", color: COLORS.cp, label: "CP", value: lastSaved.cp ?? 0 },
      { key: "depenses", color: COLORS.depenses, label: "Dép.", value: lastSaved.depenses ?? 0 },
      { key: "va", color: COLORS.va, label: "VA", value: lastSaved.va ?? 0 },
    ].map((s) => ({ ...s, yRaw: y(s.value) }));
    endLabels.sort((a, b) => a.yRaw - b.yRaw);
    // Anti-chevauchement (min 18px d'écart vertical)
    for (let i = 1; i < endLabels.length; i++) {
      const prev = endLabels[i - 1];
      if (endLabels[i].yRaw - prev.yRaw < 18) endLabels[i].yRaw = prev.yRaw + 18;
    }
  }

  // Légende — chaque item reflète le motif de la courbe (plein / tirets / pointillés)
  const legendItems = [
    { color: COLORS.bad, label: "BàD", dash: "" },
    { color: COLORS.depenses, label: "Dépenses", dash: "7 4" },
    { color: COLORS.va, label: "Valeur acquise", dash: "1.5 4" },
    { color: COLORS.cp, label: "CP", dash: "" },
  ];
  const itemWidths = [78, 110, 140, 64];
  const totalLegendWidth = itemWidths.reduce((a, b) => a + b, 0);
  const legendStartX = pad.l + Math.max(0, (iw - totalLegendWidth) / 2);
  let legendCursor = legendStartX;
  const legendY = H - 30;

  return (
    <div className="relative h-full w-full rounded-2xl border border-black/10 p-3" style={{ background: COLORS.outerBg }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="block">
        <defs>
          <filter id="curveShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.20" />
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
                x2={W - pad.r}
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

        {/* Annotation BI sur l'axe Y (gauche, libellé + tick) */}
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
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke={COLORS.axis} strokeWidth="1.2" />

        {/* Labels X — TOUS les B2P prévus apparaissent (point 1 du boss).
            Les B2P après le B2P consulté (= « futurs » non encore atteints)
            ont une typo en italique discrète pour distinguer du présent. */}
        {data.timeline.map((point, index) => {
          const xx = x(index);
          const isPast = index <= data.activeIndex;
          const isActive = index === data.activeIndex;
          return (
            <g key={`label-${point.numero}-${index}`}>
              <line x1={xx} y1={H - pad.b} x2={xx} y2={H - pad.b + 4} stroke={COLORS.axis} opacity={isPast ? 1 : 0.6} />
              <text
                x={xx}
                y={H - pad.b + 18}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isActive ? "700" : "600"}
                fontStyle={isPast ? "normal" : "italic"}
                fill={isPast ? COLORS.textSecondary : COLORS.textFuture}
              >
                {point.label}
              </text>
              <text
                x={xx}
                y={H - pad.b + 31}
                textAnchor="middle"
                fontSize="9"
                fontStyle={isPast ? "normal" : "italic"}
                fill={isPast ? COLORS.textMuted : COLORS.textFuture}
              >
                {formatDateFR(point.date)}
              </text>
            </g>
          );
        })}

        {/* Highlight vertical du B2P focus/actif */}
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

        {/* Courbes lissées (du B2P0 jusqu'au B2P consulté).
            Convention FGF (modèle PDF) :
              - BàD : trait plein noir  → données déterministes (budget)
              - CP  : trait plein vert  → données déterministes (prévision)
              - Dépenses    : tirets rouges (- - -) → données mesurées (réalisé)
              - VA          : pointillés bleus (....) → données mesurées (acquis)
            Ordre de dessin : on met BàD EN DERNIER (sur le dessus). Si BàD
            et CP se superposent (variation = 0 au début), c'est la ligne
            BàD qu'on voit, comme dans le modèle PDF où BàD = horizontale BI. */}
        <path d={depPath} fill="none" stroke={COLORS.depenses} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 4" filter="url(#curveShadow)" />
        <path d={vaPath} fill="none" stroke={COLORS.va} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 4" filter="url(#curveShadow)" />
        <path d={cpPath} fill="none" stroke={COLORS.cp} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#curveShadow)" />
        <path d={badPath} fill="none" stroke={COLORS.bad} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#curveShadow)" />

        {/* Marqueurs : SEULEMENT sur les B2P saisis ET dans l'historique
            (jusqu'au B2P consulté). Bornage à activeIndex pour respecter
            l'historisation des courbes (sinon on voyait des points isolés
            aux B2P futurs sans courbe qui les relie). */}
        {data.timeline.map((point, index) => {
          if (!point.saved) return null;
          if (index > data.activeIndex) return null;
          const cx = x(index);
          const isFocused = index === focusIndex;
          const r = isFocused ? 4.5 : 3;
          const op = isFocused || index === data.activeIndex ? 1 : 0.85;
          return (
            <g key={`pts-${index}`} opacity={op}>
              {/* Ordre : VA en bas, Dép, CP, BàD en haut pour que les dots
                  superposés (par ex. CP = BàD au B2P0) montrent toujours BàD. */}
              <circle cx={cx} cy={y(point.va ?? 0)} r={r} fill={COLORS.va} filter={isFocused ? "url(#dotShadow)" : undefined} />
              <circle cx={cx} cy={y(point.depenses ?? 0)} r={r} fill={COLORS.depenses} filter={isFocused ? "url(#dotShadow)" : undefined} />
              <circle cx={cx} cy={y(point.cp ?? 0)} r={r} fill={COLORS.cp} filter={isFocused ? "url(#dotShadow)" : undefined} />
              <circle cx={cx} cy={y(point.bad ?? 0)} r={r} fill={COLORS.bad} stroke="#FFFFFF" strokeWidth="0.8" filter={isFocused ? "url(#dotShadow)" : undefined} />
            </g>
          );
        })}

        {/* End labels — collés au dernier point saisi */}
        {lastSaved && endLabels.map((s) => (
          <g key={s.key}>
            <line x1={lastSavedX} y1={y(s.value)} x2={lastSavedX + 8} y2={s.yRaw} stroke={s.color} strokeWidth="1" opacity="0.5" />
            <rect
              x={lastSavedX + 10}
              y={s.yRaw - 9}
              width="64"
              height="18"
              rx="4"
              fill="#FFFFFF"
              stroke={s.color}
              strokeWidth="1.3"
            />
            <text
              x={lastSavedX + 16}
              y={s.yRaw + 4}
              fontSize="10.5"
              fontWeight="700"
              fill={s.color}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {s.label} {fmtInt(s.value)}
            </text>
          </g>
        ))}

        {/* Hit-areas pour le hover (sur TOUTES les colonnes, saisies ou non) */}
        {data.timeline.map((point, index) => {
          const cx = x(index);
          const half = data.timeline.length > 1 ? iw / (data.timeline.length - 1) / 2 : iw / 2;
          return (
            <rect
              key={`hit-${index}`}
              x={cx - half}
              y={pad.t}
              width={half * 2}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: point.saved ? "pointer" : "default" }}
            />
          );
        })}

        {/* Tooltip — pour les B2P SAISIS uniquement (Vc et É retirés sur demande boss) */}
        {hoverIndex !== null && focusPoint && focusPoint.saved && (() => {
          const cx = x(hoverIndex);
          const ttW = 168;
          const ttH = focusPoint.isBaseline ? 60 : 80;
          const goLeft = cx + ttW + 16 > W - pad.r;
          const ttX = goLeft ? cx - ttW - 12 : cx + 12;
          const ttY = Math.max(pad.t + 4, Math.min(H - pad.b - ttH - 4, y(focusPoint.bad ?? 0) - ttH / 2));
          const lines = focusPoint.isBaseline
            ? [
                { label: "BàD", value: focusPoint.bad ?? 0, color: COLORS.bad },
                { label: "CP", value: focusPoint.cp ?? 0, color: COLORS.cp },
              ]
            : [
                { label: "BàD", value: focusPoint.bad ?? 0, color: COLORS.bad },
                { label: "Dép.", value: focusPoint.depenses ?? 0, color: COLORS.depenses },
                { label: "VA", value: focusPoint.va ?? 0, color: COLORS.va },
                { label: "CP", value: focusPoint.cp ?? 0, color: COLORS.cp },
              ];
          return (
            <g pointerEvents="none">
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6" fill="#FFFFFF" stroke="rgba(15,23,42,0.18)" strokeWidth="1" filter="url(#dotShadow)" />
              <text x={ttX + 10} y={ttY + 16} fontSize="11" fontWeight="700" fill={COLORS.textPrimary}>
                {focusPoint.label}
              </text>
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
                    {fmtInt(line.value)}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* Légende horizontale — motif de la courbe (plein / tirets / pointillés) */}
        <g transform={`translate(0, ${legendY})`}>
          {legendItems.map((item, i) => {
            const cx = legendCursor;
            legendCursor += itemWidths[i];
            return (
              <g key={item.label} transform={`translate(${cx}, 0)`}>
                <line
                  x1="0"
                  y1="0"
                  x2="22"
                  y2="0"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={item.dash || undefined}
                />
                <text x="30" y="4" fontSize="10.5" fill={COLORS.textPrimary}>{item.label}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
