"use client";

import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiTrendingUp } from "react-icons/fi";

import { getBilanLabel } from "@/lib/b2p";
import { formatDateFR } from "@/lib/dates";
import { formatMoneyLike, getCostUnitLabel } from "@/lib/projectLabels";
import { getProjectDecisionSummary } from "@/lib/projectHealth";
import type { Projet } from "@/types/projet";

type DecisionSummaryProps = {
  project: Projet;
  compact?: boolean;
};

function pct(value: number) {
  return `${Math.round(value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`;
}

export function DecisionSummary({ project, compact }: DecisionSummaryProps) {
  const summary = getProjectDecisionSummary(project);
  const unit = getCostUnitLabel(project);

  const isWatch = summary.status === "watch";
  const isCritical = summary.status === "critical";

  // Border / background color for the header band
  const headerBg = isCritical
    ? "bg-red-50 border-red-200"
    : isWatch
    ? "bg-amber-50 border-amber-200"
    : "bg-emerald-50 border-emerald-200";

  const headlineColor = isCritical
    ? "text-red-900"
    : isWatch
    ? "text-amber-900"
    : "text-emerald-900";

  const StatusIcon = isCritical
    ? FiAlertTriangle
    : isWatch
    ? FiTrendingUp
    : FiCheckCircle;

  const iconColor = isCritical
    ? "text-red-600"
    : isWatch
    ? "text-amber-600"
    : "text-emerald-600";

  const metrics = [
    { label: "BI", value: summary.totalBI },
    { label: "BàD", value: summary.totalBudgetADate },
    { label: "Dépenses", value: summary.totalDepenses },
    { label: "CP", value: summary.totalCPT },
    {
      label: "Écart",
      value: summary.totalEcart,
      highlight: true,
      negative: summary.totalEcart > 0,
    },
    { label: "Variance", value: summary.totalVariance },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      {/* Status header */}
      <div className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 ${headerBg}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
            <StatusIcon size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Synthèse décisionnelle
            </div>
            <div className={`mt-0.5 text-[15px] font-bold ${headlineColor}`}>
              {summary.headline}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span>{summary.lastBilan ? getBilanLabel(summary.lastBilan) : "Aucun B2P"}</span>
              {summary.lastBilan && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>
                    <FiCalendar size={10} className="mr-0.5 inline" />
                    {formatDateFR(summary.lastBilan.triggerDate ?? summary.lastBilan.date)}
                  </span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span>{unit}</span>
              <span className="text-slate-300">·</span>
              <span>Avancement {pct(summary.avancement)}</span>
            </div>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${summary.statusClass}`}>
          {summary.statusLabel}
        </span>
      </div>

      <div className="px-5 py-4">
        {/* Metrics grid */}
        <div className={`grid gap-2 ${compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-6"}`}>
          {metrics.map(({ label, value, highlight, negative }) => (
            <div
              key={label}
              className={`rounded-xl border px-3 py-2.5 ${
                highlight
                  ? negative
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
              <div
                className={`mt-1 truncate text-[13px] font-bold tabular-nums ${
                  highlight ? (negative ? "text-red-700" : "text-emerald-700") : "text-slate-900"
                }`}
              >
                {formatMoneyLike(Number(value), unit)}
              </div>
            </div>
          ))}
        </div>

        {/* Counters */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800">{summary.createdBilans}</span>
            tableau{summary.createdBilans !== 1 ? "x" : ""} créé{summary.createdBilans !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800">{summary.plannedBilans}</span>
            B2P planifié{summary.plannedBilans !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
            <FiCalendar size={10} />
            Prochain : <span className="font-semibold text-slate-800">
              {summary.nextB2PDate ? formatDateFR(summary.nextB2PDate) : "—"}
            </span>
          </span>
        </div>

        {/* Alerts */}
        {!compact && summary.alerts.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
              <FiAlertTriangle size={11} />
              Points à traiter ({summary.alerts.length})
            </div>
            <div className="mt-1.5 grid gap-1 md:grid-cols-2">
              {summary.alerts.map((alert) => (
                <div key={alert} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                  <span className="mt-0.5 flex-shrink-0 text-amber-500">·</span>
                  {alert}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
