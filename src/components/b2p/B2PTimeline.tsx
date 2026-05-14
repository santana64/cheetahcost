"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FiAlertTriangle, FiArrowRight } from "react-icons/fi";

import { getBilanKind, getBilanLabel } from "@/lib/b2p";
import { formatDateFR } from "@/lib/dates";
import { aggregateBilan, analyzeBilan, isBilanEmpty, sortBilans, type BilanAlertFlag } from "@/lib/fgf";
import { formatMoneyLike, getCostUnitLabel } from "@/lib/projectLabels";
import type { Projet } from "@/types/projet";

type B2PTimelineProps = {
  project?: Projet | null;
  activeBilanId?: string;
};

function pct(v: number | null | undefined) {
  if (!v || !Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v * 100)));
}

export function B2PTimeline({ project, activeBilanId }: B2PTimelineProps) {
  const unitLabel = project ? getCostUnitLabel(project) : "EUR";

  const items = useMemo(() => {
    if (!project?.bilans?.length) return [];
    return sortBilans(project.bilans).map((bilan) => {
      // §2.5 — B2P0 doit toujours être considéré comme saisi : ses valeurs proviennent
      // de la saisie du projet (BI, dates) effectuée à la création. CP = BàD, E = 0.
      const isBaseline = getBilanKind(bilan) === "b2p0";
      const empty = !isBaseline && isBilanEmpty(bilan);
      const rawAggregate = empty ? null : aggregateBilan(project, bilan);
      const aggregate = rawAggregate && isBaseline
        ? { ...rawAggregate, totalCPT: rawAggregate.totalBudgetADate, totalEcartFinal: 0, totalVarianceCout: 0 }
        : rawAggregate;
      const flags = (empty || isBaseline) ? ([] as BilanAlertFlag[]) : analyzeBilan(project, bilan);

      let statusLabel = "Non saisi";
      let dotBg = "#cbd5e1";
      let accentColor = "#cbd5e1";
      let statusBg = "bg-slate-100";
      let statusText = "text-slate-500";
      let statusBorder = "border-slate-200";

      if (isBaseline && aggregate) {
        // Au B2P0, l'écart est nul par construction : statut "Référence initiale".
        statusLabel = "Référence initiale";
        dotBg = "#3b82f6"; accentColor = "#3b82f6";
        statusBg = "bg-blue-50"; statusText = "text-blue-800"; statusBorder = "border-blue-200";
      } else if (aggregate) {
        const ratio = aggregate.totalBudgetADate > 0
          ? aggregate.totalEcartFinal / aggregate.totalBudgetADate : 0;
        if (aggregate.totalEcartFinal <= 0) {
          statusLabel = "Dans les clous";
          dotBg = "#22c55e"; accentColor = "#56a45b";
          statusBg = "bg-emerald-50"; statusText = "text-emerald-800"; statusBorder = "border-emerald-200";
        } else if (ratio <= 0.05) {
          statusLabel = "À surveiller";
          dotBg = "#f59e0b"; accentColor = "#f4a321";
          statusBg = "bg-amber-50"; statusText = "text-amber-800"; statusBorder = "border-amber-200";
        } else {
          statusLabel = "Surcoût probable";
          dotBg = "#ef4444"; accentColor = "#ef4444";
          statusBg = "bg-red-50"; statusText = "text-red-700"; statusBorder = "border-red-200";
        }
      }

      return { bilan, aggregate, flags, statusLabel, dotBg, accentColor, statusBg, statusText, statusBorder };
    });
  }, [project]);

  if (!project || !items.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-8 py-12 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <span className="text-[18px]">📋</span>
        </div>
        <p className="text-[13px] font-semibold text-slate-600">Aucun tableau B2P</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Commencez par créer le B2P0 (situation initiale)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map(({ bilan, aggregate, flags, statusLabel, dotBg, accentColor, statusBg, statusText, statusBorder }) => {
        const active = bilan.id === activeBilanId;
        const avancement = pct(aggregate?.avancementPhysiqueProjet);
        const ecart = aggregate?.totalEcartFinal ?? 0;
        const ecartPositive = ecart > 0;

        return (
          <div
            key={bilan.id}
            className="group relative overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)]"
            style={{
              border: active ? `1px solid ${accentColor}40` : "1px solid rgba(0,0,0,0.07)",
              boxShadow: active
                ? `0 0 0 1px ${accentColor}20, 0 4px 16px ${accentColor}10`
                : "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Status left accent */}
            <div
              className="absolute left-0 top-0 h-full w-1"
              style={{ background: accentColor }}
            />

            <div className="pl-5 pr-4 pt-4 pb-3.5">

              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-slate-900 leading-tight">
                      {getBilanLabel(bilan)}
                    </span>
                    <span className="text-[12px] text-slate-400">
                      {formatDateFR(bilan.triggerDate ?? bilan.date)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBg} ${statusText} ${statusBorder}`}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: dotBg }}
                      />
                      {statusLabel}
                    </span>
                    {flags.length > 0 && (
                      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <FiAlertTriangle size={9} />
                        {flags.length}
                      </span>
                    )}
                    {active && (
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700 uppercase tracking-wide">
                        Actif
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/projets/${project.id}/b2p/${bilan.id}`}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all duration-150 active:scale-[0.97]"
                  style={{ background: accentColor === "#cbd5e1" ? "#94a3b8" : accentColor }}
                >
                  Éditer
                  <FiArrowRight size={11} />
                </Link>
              </div>

              {/* Financial metrics grid */}
              {aggregate ? (
                <div className="mt-3.5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  {[
                    { label: "BàD", value: aggregate.totalBudgetADate, highlight: false },
                    { label: "Dépenses", value: aggregate.totalDepenses, highlight: false },
                    { label: "CP", value: aggregate.totalCPT, highlight: false },
                    { label: "Écart", value: ecart, highlight: true },
                  ].map(({ label, value, highlight }, idx) => (
                    <div
                      key={label}
                      className={`px-3.5 py-2.5 ${idx < 3 ? "border-r border-slate-100" : ""} ${
                        highlight
                          ? ecartPositive
                            ? "bg-red-50"
                            : "bg-emerald-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                      </div>
                      <div
                        className={`mt-1 text-[12.5px] font-bold tabular-nums leading-tight ${
                          highlight
                            ? ecartPositive
                              ? "text-red-700"
                              : "text-emerald-700"
                            : "text-slate-800"
                        }`}
                      >
                        {formatMoneyLike(value, unitLabel)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-[11px] italic text-slate-400">
                  Tableau créé — données non encore saisies
                </div>
              )}

              {/* Avancement progress bar */}
              {aggregate && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-20 flex-shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    Avancement
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full" style={{ height: 5, background: "#f1f5f9" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${avancement}%`, background: accentColor }}
                    />
                  </div>
                  <span
                    className="w-8 flex-shrink-0 text-right text-[11px] font-bold tabular-nums"
                    style={{ color: accentColor === "#cbd5e1" ? "#94a3b8" : accentColor }}
                  >
                    {avancement}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default B2PTimeline;
