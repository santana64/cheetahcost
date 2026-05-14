import { getBilanKind, getBilanLabel, getProjectPlannedB2PDates } from "@/lib/b2p";
import { compareISODate, formatDateFR, todayISO } from "@/lib/dates";
import { aggregateBilan, analyzeBilan, getLastBilan, sortBilans } from "@/lib/fgf";
import type { BilanPilotage, Projet } from "@/types/projet";

export type DecisionStatus = "good" | "watch" | "critical" | "empty";

export type ProjectDecisionSummary = {
  status: DecisionStatus;
  statusLabel: string;
  statusClass: string;
  headline: string;
  lastBilan: BilanPilotage | null;
  nextB2PDate: string | null;
  createdBilans: number;
  plannedBilans: number;
  totalBI: number;
  totalBudgetADate: number;
  totalDepenses: number;
  totalCPT: number;
  totalEcart: number;
  totalVariance: number;
  avancement: number;
  alerts: string[];
};

function statusMeta(status: DecisionStatus) {
  if (status === "good") {
    return {
      statusLabel: "Vert",
      statusClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
      headline: "Projet maîtrisé au dernier B2P.",
    };
  }
  if (status === "watch") {
    return {
      statusLabel: "À surveiller",
      statusClass: "border-orange-400/35 bg-orange-400/10 text-orange-800",
      headline: "Écart détecté, arbitrage conseillé.",
    };
  }
  if (status === "critical") {
    return {
      statusLabel: "Critique",
      statusClass: "border-red-500/30 bg-red-500/10 text-red-700",
      headline: "Dérive significative au dernier B2P.",
    };
  }
  return {
    statusLabel: "À initialiser",
    statusClass: "border-slate-300 bg-slate-100 text-slate-700",
    headline: "Aucun B2P exploitable pour décider.",
  };
}

export function getProjectDecisionSummary(project: Projet): ProjectDecisionSummary {
  const lastBilan = getLastBilan(project);
  const plannedDates = getProjectPlannedB2PDates(project);
  const sortedBilans = sortBilans(project.bilans ?? []);
  const createdNumeros = new Set(sortedBilans.map((bilan) => Number(bilan.numero ?? 0)));
  const nextB2PDate = plannedDates.find((_, index) => !createdNumeros.has(index)) ?? null;
  const totalBI = (project.lots ?? []).reduce((sum, lot) => sum + Number(lot.budgetInitial ?? 0), 0);
  const alerts: string[] = [];

  if (!(project.lots ?? []).length) alerts.push("Structure budgétaire absente.");
  if (!sortedBilans.some((bilan) => Number(bilan.numero) === 0)) alerts.push("B2P0 non créé.");
  if (nextB2PDate && compareISODate(nextB2PDate, todayISO()) < 0) alerts.push(`B2P attendu le ${formatDateFR(nextB2PDate)}.`);

  if (!lastBilan) {
    const meta = statusMeta("empty");
    return {
      status: "empty",
      ...meta,
      lastBilan: null,
      nextB2PDate,
      createdBilans: sortedBilans.length,
      plannedBilans: Math.max(0, plannedDates.length - 1),
      totalBI,
      totalBudgetADate: 0,
      totalDepenses: 0,
      totalCPT: 0,
      totalEcart: 0,
      totalVariance: 0,
      avancement: 0,
      alerts,
    };
  }

  const rawAggregate = aggregateBilan(project, lastBilan);
  // §2.1 : Au B2P0, CP = BàD et E (écart) = 0 par définition (baseline du projet).
  const isBaselineLast = getBilanKind(lastBilan) === "b2p0";
  const aggregate = isBaselineLast
    ? {
        ...rawAggregate,
        totalCPT: rawAggregate.totalBudgetADate,
        totalEcartFinal: 0,
        totalVarianceCout: 0,
      }
    : rawAggregate;
  const ratio = aggregate.totalBudgetADate > 0 ? aggregate.totalEcartFinal / aggregate.totalBudgetADate : 0;
  const varianceRatio = aggregate.totalBudgetADate > 0 ? aggregate.totalVarianceCout / aggregate.totalBudgetADate : 0;
  const lineFlags = isBaselineLast ? [] : analyzeBilan(project, lastBilan);

  if (lineFlags.length) alerts.push(`${lineFlags.length} alerte(s) ligne au ${getBilanLabel(lastBilan)}.`);
  if (aggregate.totalEcartFinal > 0) alerts.push(`Écart final ${Math.round(ratio * 100)} % du BàD.`);
  if (aggregate.totalVarianceCout > 0) alerts.push(`Variance coûts positive au dernier B2P.`);

  let status: DecisionStatus = "good";
  if (ratio > 0.08 || varianceRatio > 0.08 || lineFlags.length >= 3) status = "critical";
  else if (ratio > 0 || varianceRatio > 0 || lineFlags.length > 0) status = "watch";

  const meta = statusMeta(status);
  return {
    status,
    ...meta,
    lastBilan,
    nextB2PDate,
    createdBilans: sortedBilans.length,
    plannedBilans: Math.max(0, plannedDates.length - 1),
    totalBI,
    totalBudgetADate: aggregate.totalBudgetADate,
    totalDepenses: aggregate.totalDepenses,
    totalCPT: aggregate.totalCPT,
    totalEcart: aggregate.totalEcartFinal,
    totalVariance: aggregate.totalVarianceCout,
    avancement: aggregate.avancementPhysiqueProjet,
    alerts: alerts.slice(0, 6),
  };
}
