import type { BilanPilotage, LigneBilan, LotTache, Projet } from "@/types/projet";
import { compareISODate, formatDateFR, isValidISODate, parseISODateUTC, toISODateUTC } from "@/lib/dates";

export type B2PCadenceRule = {
  kind: "hour" | "day" | "week" | "month" | "year";
  step: number;
  label: string;
  explanation: string;
};

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultLineForLot(lotId: string): LigneBilan {
  return {
    lotId,
    variation: 0,
    depenses: 0,
    avancementPhysique: 0,
    resteAFaire: 0,
    commentaire: "",
  };
}

function addHoursUTC(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addWeeksUTC(date: Date, weeks: number): Date {
  return addDaysUTC(date, weeks * 7);
}

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 12, 0, 0, 0));
}

function addYearsUTC(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));
}

function nextMondayAfterUTC(date: Date): Date {
  const day = date.getUTCDay();
  let delta = (8 - day) % 7;
  if (delta === 0) delta = 7;
  return addDaysUTC(date, delta);
}

function firstDayOfNextMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 12, 0, 0, 0));
}

function firstDayOfNextYearUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1, 12, 0, 0, 0));
}

function diffDaysUTC(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
}

export function getB2PCadenceRule(dateDebut: string, dateFin: string): B2PCadenceRule | null {
  const start = parseISODateUTC(dateDebut);
  const end = parseISODateUTC(dateFin);
  if (!start || !end || end.getTime() < start.getTime()) return null;

  const days = diffDaysUTC(start, end);

  if (days < 1.5) return { kind: "hour", step: 1, label: "Toutes les 1 heure", explanation: "Projet < 1,5 jour." };
  if (days < 3) return { kind: "hour", step: 2, label: "Toutes les 2 heures", explanation: "Projet entre 1,5 et 3 jours." };
  if (days < 6) return { kind: "hour", step: 12, label: "Toutes les 1/2 journées", explanation: "Projet entre 3 et 6 jours." };
  if (days < 12) return { kind: "day", step: 1, label: "Tous les jours", explanation: "Projet entre 6 et 12 jours." };
  if (days < 21) return { kind: "day", step: 2, label: "Tous les 2 jours", explanation: "Projet entre 12 et 21 jours." };
  if (days < 42) return { kind: "day", step: 3, label: "Tous les 3 jours", explanation: "Projet entre 21 et 42 jours." };
  if (days < 92) return { kind: "week", step: 1, label: "Toutes les semaines", explanation: "Projet entre 42 jours et 3 mois." };
  if (days < 183) return { kind: "week", step: 2, label: "Toutes les 2 semaines", explanation: "Projet entre 3 et 6 mois." };
  if (days < 366) return { kind: "month", step: 1, label: "Tous les mois", explanation: "Projet entre 6 mois et 1 an." };
  if (days < 731) return { kind: "month", step: 2, label: "Tous les 2 mois", explanation: "Projet entre 1 et 2 ans." };
  if (days < 1096) return { kind: "month", step: 3, label: "Tous les 3 mois", explanation: "Projet entre 2 et 3 ans." };
  if (days < 1461) return { kind: "month", step: 4, label: "Tous les 4 mois", explanation: "Projet entre 3 et 4 ans." };
  if (days < 2192) return { kind: "month", step: 6, label: "Tous les 6 mois", explanation: "Projet entre 4 et 6 ans." };
  return { kind: "year", step: 1, label: "Tous les ans", explanation: "Projet entre 6 et 12 ans." };
}

function uniqueSortedDates(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(isValidISODate))).sort(compareISODate);
}

export function buildRecommendedB2PDates(project: Pick<Projet, "dateDebut" | "dateFin">): string[] {
  const start = parseISODateUTC(project.dateDebut);
  const end = parseISODateUTC(project.dateFin);
  const rule = getB2PCadenceRule(project.dateDebut, project.dateFin);
  if (!start || !end || !rule || end.getTime() < start.getTime()) return [];

  const dates: string[] = [toISODateUTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())];

  const pushIfInRange = (date: Date) => {
    if (date.getTime() <= start.getTime()) return;
    if (date.getTime() > end.getTime()) return;
    dates.push(toISODateUTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
  };

  if (rule.kind === "hour") {
    let cursor = addHoursUTC(start, rule.step);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 2000) {
      pushIfInRange(cursor);
      cursor = addHoursUTC(cursor, rule.step);
      guard += 1;
    }
  }

  if (rule.kind === "day") {
    let cursor = addDaysUTC(start, rule.step);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 2000) {
      pushIfInRange(cursor);
      cursor = addDaysUTC(cursor, rule.step);
      guard += 1;
    }
  }

  if (rule.kind === "week") {
    const base = addWeeksUTC(start, Math.max(0, rule.step - 1));
    let cursor = nextMondayAfterUTC(base);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 500) {
      pushIfInRange(cursor);
      cursor = addWeeksUTC(cursor, rule.step);
      guard += 1;
    }
  }

  if (rule.kind === "month") {
    const base = addMonthsUTC(start, Math.max(0, rule.step - 1));
    let cursor = firstDayOfNextMonthUTC(base);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 240) {
      pushIfInRange(cursor);
      cursor = addMonthsUTC(cursor, rule.step);
      guard += 1;
    }
  }

  if (rule.kind === "year") {
    const base = addYearsUTC(start, Math.max(0, rule.step - 1));
    let cursor = firstDayOfNextYearUTC(base);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 50) {
      pushIfInRange(cursor);
      cursor = addYearsUTC(cursor, rule.step);
      guard += 1;
    }
  }

  pushIfInRange(end);
  return uniqueSortedDates(dates);
}

export function getProjectPlannedB2PDates(project: Projet): string[] {
  const stored = Array.isArray(project.b2pDates) ? uniqueSortedDates(project.b2pDates) : [];
  return stored.length ? stored : buildRecommendedB2PDates(project);
}

export function getB2PPlanWarnings(project: Projet, plannedDates = getProjectPlannedB2PDates(project)): string[] {
  const recommended = buildRecommendedB2PDates(project);
  const warnings: string[] = [];

  if (!recommended.length) {
    warnings.push("Les dates du projet ne permettent pas de calculer la règle FGF.");
    return warnings;
  }

  if (plannedDates.length !== recommended.length) {
    warnings.push(`La règle FGF recommande ${Math.max(0, recommended.length - 1)} B2P + B2P0.`);
  }

  plannedDates.forEach((date, index) => {
    if (recommended[index] && date !== recommended[index]) {
      warnings.push(`B2P${index} : date saisie ${formatDateFR(date)}, recommandée ${formatDateFR(recommended[index])}.`);
    }
  });

  return warnings;
}

export function getBilanKind(bilan?: BilanPilotage | null): NonNullable<BilanPilotage["tableKind"]> {
  if (!bilan) return "i-1";
  if (bilan.tableKind) return bilan.tableKind;
  return Number(bilan.numero ?? 0) === 0 ? "b2p0" : "i-1";
}

export function getBilanLabel(bilan?: BilanPilotage | null): string {
  if (!bilan) return "B2P";
  const numero = Number(bilan.numero ?? 0);
  const kind = getBilanKind(bilan);

  if (kind === "b2p0" || numero === 0) return "B2P0";
  if (kind === "i-2") return `B2P n°${numero}-2`;
  if (kind === "i-2j") return `B2P n°${numero}-2${Number(bilan.scenarioIndex ?? 1)}`;
  return `B2P n°${numero}-1`;
}

export function getBilanSortRank(bilan: BilanPilotage): number {
  const kind = getBilanKind(bilan);
  if (kind === "b2p0") return 0;
  if (kind === "i-1") return 1;
  if (kind === "i-2j") return 2 + Number(bilan.scenarioIndex ?? 0) / 100;
  return 99;
}

export function copyLeftFiveColumns(source: BilanPilotage | null | undefined, lots: LotTache[]): LigneBilan[] {
  const sourceByLot = new Map<string, LigneBilan>();
  for (const line of source?.lignes ?? []) sourceByLot.set(line.lotId, line);

  return lots.map((lot) => {
    const prev = sourceByLot.get(lot.id);
    return {
      ...defaultLineForLot(lot.id),
      variation: Number(prev?.variation ?? 0),
    };
  });
}

export function copyLeftEightColumns(source: BilanPilotage | null | undefined, lots: LotTache[]): LigneBilan[] {
  const sourceByLot = new Map<string, LigneBilan>();
  for (const line of source?.lignes ?? []) sourceByLot.set(line.lotId, line);

  return lots.map((lot) => {
    const prev = sourceByLot.get(lot.id);
    return {
      ...defaultLineForLot(lot.id),
      variation: Number(prev?.variation ?? 0),
      depenses: Number(prev?.depenses ?? 0),
      avancementPhysique: Number(prev?.avancementPhysique ?? 0),
      // Also copy RàF and Obs. so the scenario starts with realistic values
      resteAFaire: Number(prev?.resteAFaire ?? 0),
      commentaire: prev?.commentaire ?? "",
    };
  });
}

export function buildInitialB2P0(project: Projet): BilanPilotage {
  const triggerDate = project.dateDebut;
  return {
    id: generateId(),
    numero: 0,
    tableKind: "b2p0",
    date: triggerDate,
    triggerDate,
    lignes: (project.lots ?? []).map((lot) => defaultLineForLot(lot.id)),
  };
}

export function findBaselineForNumero(project: Projet, numero: number): BilanPilotage | null {
  const bilans = project.bilans ?? [];
  return bilans.find((b) => Number(b.numero) === numero && getBilanKind(b) === "i-1") ?? null;
}

export function getNextI2JIndex(project: Projet, numero: number): number {
  const existing = (project.bilans ?? [])
    .filter((b) => Number(b.numero) === numero && getBilanKind(b) === "i-2j")
    .map((b) => Number(b.scenarioIndex ?? 0));

  return Math.max(0, ...existing) + 1;
}

export function buildNextI1Table(project: Projet): BilanPilotage {
  const lots = project.lots ?? [];
  const baselines = (project.bilans ?? []).filter((b) => getBilanKind(b) === "i-1");
  const maxNumero = Math.max(0, ...baselines.map((b) => Number(b.numero ?? 0)));
  const numero = maxNumero + 1;
  const previous =
    (maxNumero > 0
      ? baselines
          .filter((b) => Number(b.numero) === maxNumero)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
      : (project.bilans ?? []).find((b) => getBilanKind(b) === "b2p0")) ?? null;

  const plannedDates = getProjectPlannedB2PDates(project);
  const triggerDate = plannedDates[numero] ?? project.dateFin;

  return {
    id: generateId(),
    numero,
    tableKind: "i-1",
    date: triggerDate,
    triggerDate,
    lignes: copyLeftFiveColumns(previous, lots),
  };
}

export function buildI2JTable(project: Projet, numero: number): BilanPilotage | null {
  if (numero <= 0) return null;

  const baseline = findBaselineForNumero(project, numero);
  if (!baseline) return null;

  const scenarioIndex = getNextI2JIndex(project, numero);

  return {
    id: generateId(),
    numero,
    tableKind: "i-2j",
    scenarioIndex,
    date: baseline.date,
    triggerDate: baseline.triggerDate ?? baseline.date,
    lignes: copyLeftEightColumns(baseline, project.lots ?? []),
  };
}
