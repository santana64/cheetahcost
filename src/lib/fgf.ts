import type { BilanPilotage, LigneBilan, LotTache, Projet } from "@/types/projet";
import { getBilanSortRank } from "@/lib/b2p";

export function computeBudgetADate(lot: LotTache, variation: number): number {
  return Number(lot?.budgetInitial ?? 0) + Number(variation ?? 0);
}

export function computeValeurAcquise(budgetADate: number, avancement: number): number {
  const ratio = Math.max(0, Math.min(100, Number(avancement ?? 0))) / 100;
  return Number(budgetADate ?? 0) * ratio;
}

export function computeVarianceCout(depenses: number, valeurAcquise: number): number {
  return Number(depenses ?? 0) - Number(valeurAcquise ?? 0);
}

export function computeCoutPrevisionnelTerminaison(depenses: number, resteAFaire: number): number {
  return Number(depenses ?? 0) + Number(resteAFaire ?? 0);
}

export function computeEcartFinal(budgetADate: number, coutPrevisionnelTerminaison: number): number {
  return Number(coutPrevisionnelTerminaison ?? 0) - Number(budgetADate ?? 0);
}

export type LigneDerivesFGF = {
  budgetInitial: number;
  variation: number;
  budgetADate: number;
  depenses: number;
  avancementPhysique: number;
  valeurAcquise: number;
  resteAFaire: number;
  coutPrevisionnelTerminaison: number;
  varianceCout: number;
  ecartFinal: number;
  e: number;
  eOverBad: number;
  ePrec: number;
  d: number;
};

export function computeLigneDerivesFGF(lot: LotTache, ligne?: LigneBilan, previousLigne?: LigneBilan): LigneDerivesFGF {
  const budgetInitial = Number(lot?.budgetInitial ?? 0);
  const variation = Number(ligne?.variation ?? 0);
  const depenses = Number(ligne?.depenses ?? 0);
  const avancementPhysique = Number(ligne?.avancementPhysique ?? 0);
  const resteAFaire = Number(ligne?.resteAFaire ?? 0);

  const budgetADate = computeBudgetADate(lot, variation);
  const valeurAcquise = computeValeurAcquise(budgetADate, avancementPhysique);
  const varianceCout = computeVarianceCout(depenses, valeurAcquise);
  const coutPrevisionnelTerminaison = computeCoutPrevisionnelTerminaison(depenses, resteAFaire);
  const ecartFinal = computeEcartFinal(budgetADate, coutPrevisionnelTerminaison);

  let ePrec = 0;
  if (previousLigne) {
    const prevBAD = computeBudgetADate(lot, Number(previousLigne.variation ?? 0));
    const prevCP = computeCoutPrevisionnelTerminaison(
      Number(previousLigne.depenses ?? 0),
      Number(previousLigne.resteAFaire ?? 0),
    );
    ePrec = computeEcartFinal(prevBAD, prevCP);
  }

  const e = ecartFinal;
  const eOverBad = budgetADate !== 0 ? e / budgetADate : 0;
  const d = e - ePrec;

  return {
    budgetInitial,
    variation,
    budgetADate,
    depenses,
    avancementPhysique,
    valeurAcquise,
    resteAFaire,
    coutPrevisionnelTerminaison,
    varianceCout,
    ecartFinal,
    e,
    eOverBad,
    ePrec,
    d,
  };
}

export const computeLigneDerives = computeLigneDerivesFGF;

export function getLotById(projet: Projet, lotId: string): LotTache | undefined {
  return (projet?.lots ?? []).find((lot) => lot.id === lotId);
}

export function isPTOLot(lot?: LotTache | null): boolean {
  const text = `${lot?.code ?? ""} ${lot?.libelle ?? ""}`.toLowerCase();
  return (
    text.includes("pto") ||
    text.includes("provision pour tâches oubliées") ||
    text.includes("provision pour taches oubliees")
  );
}

export function isBilanEmpty(bilan: BilanPilotage | null | undefined): boolean {
  if (!bilan?.lignes?.length) return true;

  return bilan.lignes.every((ligne) => {
    const commentaire = String(ligne.commentaire ?? "").trim();
    return (
      Number(ligne.variation ?? 0) === 0 &&
      Number(ligne.depenses ?? 0) === 0 &&
      Number(ligne.avancementPhysique ?? 0) === 0 &&
      Number(ligne.resteAFaire ?? 0) === 0 &&
      commentaire.length === 0
    );
  });
}

export function sortBilans(bilans: BilanPilotage[]): BilanPilotage[] {
  return [...(bilans ?? [])].sort((a, b) => {
    const byNumero = Number(a.numero ?? 0) - Number(b.numero ?? 0);
    if (byNumero !== 0) return byNumero;

    const byDate = String(a.triggerDate ?? a.date).localeCompare(String(b.triggerDate ?? b.date));
    if (byDate !== 0) return byDate;

    return getBilanSortRank(a) - getBilanSortRank(b);
  });
}

export function getLastBilan(projet: Projet): BilanPilotage | null {
  const bilans = sortBilans(projet?.bilans ?? []);
  return bilans.at(-1) ?? null;
}

export type AggregateResult = {
  totalBI: number;
  totalBudgetADate: number;
  totalDepenses: number;
  totalCPT: number;
  totalValeurAcquise: number;
  totalVarianceCout: number;
  totalEcartFinal: number;
  avancementPhysiqueProjet: number;
};

export function aggregateBilan(projet: Projet, bilan: BilanPilotage): AggregateResult {
  let totalBI = 0;
  let totalBudgetADate = 0;
  let totalDepenses = 0;
  let totalCPT = 0;
  let totalValeurAcquise = 0;
  let totalVarianceCout = 0;
  let totalEcartFinal = 0;
  let weightedAvancement = 0;

  for (const lot of projet.lots ?? []) {
    totalBI += Number(lot.budgetInitial ?? 0);

    const ligne = (bilan?.lignes ?? []).find((candidate) => candidate.lotId === lot.id);
    const derives = computeLigneDerivesFGF(lot, ligne);

    totalBudgetADate += derives.budgetADate;
    totalDepenses += derives.depenses;
    totalCPT += derives.coutPrevisionnelTerminaison;
    totalValeurAcquise += derives.valeurAcquise;
    totalVarianceCout += derives.varianceCout;
    totalEcartFinal += derives.ecartFinal;
    weightedAvancement += derives.budgetADate * Math.max(0, Math.min(100, derives.avancementPhysique));
  }

  return {
    totalBI,
    totalBudgetADate,
    totalDepenses,
    totalCPT,
    totalValeurAcquise,
    totalVarianceCout,
    totalEcartFinal,
    avancementPhysiqueProjet: totalBudgetADate > 0 ? weightedAvancement / totalBudgetADate / 100 : 0,
  };
}

export type BilanAlertFlag = {
  lotId: string;
  lotLibelle: string;
  kind: "cost" | "variation";
  message: string;
};

export function analyzeBilan(projet: Projet, bilan: BilanPilotage): BilanAlertFlag[] {
  const flags: BilanAlertFlag[] = [];

  const sorted = sortBilans(projet?.bilans ?? []);
  const index = sorted.findIndex((candidate) => candidate.id === bilan.id);
  const previous = index > 0 ? sorted[index - 1] : null;

  const previousByLot = new Map<string, LigneBilan>();
  for (const line of previous?.lignes ?? []) previousByLot.set(line.lotId, line);

  for (const lot of projet.lots ?? []) {
    const ligne = (bilan?.lignes ?? []).find((candidate) => candidate.lotId === lot.id);
    if (!ligne) continue;

    const derives = computeLigneDerivesFGF(lot, ligne, previousByLot.get(lot.id));
    const depenses = Number(ligne.depenses ?? 0);
    const avancement = Number(ligne.avancementPhysique ?? 0);
    const variation = Number(ligne.variation ?? 0);

    if (derives.valeurAcquise > 0 && depenses > derives.valeurAcquise * 1.1 && avancement < 95) {
      flags.push({
        lotId: lot.id,
        lotLibelle: lot.libelle,
        kind: "cost",
        message: `${lot.code ? `${lot.code} - ` : ""}${lot.libelle} : dépenses élevées vs valeur acquise.`,
      });
    }

    const bi = Number(lot.budgetInitial ?? 0);
    if (bi > 0 && Math.abs(variation) > bi * 0.1) {
      flags.push({
        lotId: lot.id,
        lotLibelle: lot.libelle,
        kind: "variation",
        message: `${lot.code ? `${lot.code} - ` : ""}${lot.libelle} : variation > 10 % du BI.`,
      });
    }
  }

  return flags;
}
