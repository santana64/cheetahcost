"use client";

import type { AuditAction, BilanPilotage, BilanTableKind, LigneBilan, LotTache, Projet, ProjetStatus } from "@/types/projet";
import { buildRecommendedB2PDates, defaultLineForLot } from "@/lib/b2p";
import { clampEndDate, isValidISODate, todayISO } from "@/lib/dates";

const STORAGE_KEY = "cheetahcost_projects";

const DEFAULT_LOT: LotTache = {
  id: "LOT_AUCUN",
  code: "AUCUN",
  libelle: "Aucun",
  budgetInitial: 0,
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : {};
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function asNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeStatus(value: unknown): ProjetStatus {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("termin")) return "Terminé";
  if (raw.includes("attente")) return "En attente";
  return "En cours";
}

function normalizeKind(value: unknown, numero: number): BilanTableKind {
  if (value === "b2p0" || value === "i-1" || value === "i-2j" || value === "i-2") return value;
  return numero === 0 ? "b2p0" : "i-1";
}

function normalizeLots(raw: unknown): LotTache[] {
  const source = Array.isArray(raw) ? raw : [];
  const lots = source.map((item, index) => {
    const lot = asRecord(item);
    return {
      id: String(lot.id || `LOT_${index + 1}`),
      code: String(lot.code ?? `LB${String(index + 1).padStart(2, "0")}`).trim(),
      libelle: String(lot.libelle ?? `Ligne budgétaire ${index + 1}`).trim(),
      budgetInitial: asNumber(lot.budgetInitial),
    };
  });

  return lots.length ? lots : [DEFAULT_LOT];
}

function normalizeLines(raw: unknown, lots: LotTache[]): LigneBilan[] {
  const source = Array.isArray(raw) ? raw : [];
  const byLot = new Map<string, UnknownRecord>();

  for (const item of source) {
    const line = asRecord(item);
    if (line.lotId) byLot.set(String(line.lotId), line);
  }

  return lots.map((lot) => {
    const line = byLot.get(lot.id);
    if (!line) return defaultLineForLot(lot.id);

    return {
      lotId: lot.id,
      variation: asNumber(line.variation),
      depenses: asNumber(line.depenses),
      avancementPhysique: asNumber(line.avancementPhysique),
      resteAFaire: asNumber(line.resteAFaire),
      commentaire: String(line.commentaire ?? ""),
    };
  });
}

function normalizeBilans(raw: unknown, lots: LotTache[], projectStart: string): BilanPilotage[] {
  const source = Array.isArray(raw) ? raw : [];

  return source.map((item, index) => {
    const bilan = asRecord(item);
    const numero = Number.isFinite(Number(bilan.numero)) ? Number(bilan.numero) : index;
    const kind = normalizeKind(bilan.tableKind, numero);
    const date = isValidISODate(String(bilan.date)) ? String(bilan.date) : projectStart;
    const triggerDate = isValidISODate(String(bilan.triggerDate)) ? String(bilan.triggerDate) : date;

    return {
      id: String(bilan.id || `B2P_${index + 1}`),
      numero,
      date,
      triggerDate,
      tableKind: kind,
      scenarioIndex: kind === "i-2j" ? Math.max(1, asNumber(bilan.scenarioIndex) || 1) : undefined,
      label: typeof bilan.label === "string" ? bilan.label : undefined,
      lignes: normalizeLines(bilan.lignes, lots),
    };
  });
}

function normalizeAuditAction(value: unknown): AuditAction {
  const actions: AuditAction[] = [
    "project_created",
    "project_updated",
    "lots_updated",
    "plan_updated",
    "b2p_created",
    "b2p_saved",
    "b2p_promoted",
    "b2p_locked",
    "b2p_unlocked",
    "excel_clipboard_import",
    "export_created",
  ];
  return actions.includes(value as AuditAction) ? (value as AuditAction) : "project_updated";
}

function normalizeStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

function normalizeProject(raw: unknown): Projet {
  const source = asRecord(raw);
  const now = new Date().toISOString();
  const dateDebut = isValidISODate(String(source.dateDebut)) ? String(source.dateDebut) : todayISO();
  const dateFin = clampEndDate(dateDebut, isValidISODate(String(source.dateFin)) ? String(source.dateFin) : dateDebut);
  const lots = normalizeLots(source.lots);

  const uniteCoutType = source.uniteCoutType === "charge" ? "charge" : "monetaire";
  const monnaie = String(source.monnaie ?? "EUR").trim() || "EUR";
  const uniteCoutLibelle =
    uniteCoutType === "charge"
      ? String(source.uniteCoutLibelle ?? "jour/personne").trim() || "jour/personne"
      : monnaie;

  const draft: Projet = {
    id: String(source.id || `project_${Date.now()}`),
    nom: String(source.nom ?? "Projet sans nom").trim() || "Projet sans nom",
    phase: "Réalisation",
    dateDebut,
    dateFin,
    monnaie,
    typeCout: source.typeCout === "engagé" ? "engagé" : "encouru",
    status: normalizeStatus(source.status),

    uniteCoutType,
    uniteCoutLibelle,
    tvaMode: source.tvaMode === "TTC" ? "TTC" : "HT",
    valeurMode: source.valeurMode === "constante" ? "constante" : "courante",
    valeurReference: typeof source.valeurReference === "string" ? source.valeurReference : "",

    lots,
    bilans: normalizeBilans(source.bilans, lots, dateDebut),
    createdAt: String(source.createdAt ?? now),
    updatedAt: String(source.updatedAt ?? now),
  };

  const planned = Array.isArray(source.b2pDates)
    ? source.b2pDates.filter((date: unknown) => isValidISODate(String(date))).map(String)
    : buildRecommendedB2PDates(draft);

  return {
    ...draft,
    b2pDates: planned,
    nbB2P: Math.max(0, planned.length - 1),
    lockedBilanIds: normalizeStringArray(source.lockedBilanIds),
    auditTrail: Array.isArray(source.auditTrail)
      ? source.auditTrail
          .map((item) => {
            const event = asRecord(item);
            return {
              id: String(event.id || `audit_${Date.now()}`),
              at: String(event.at || now),
              actor: String(event.actor || "Utilisateur local"),
              action: normalizeAuditAction(event.action),
              label: String(event.label || "Modification"),
              details: typeof event.details === "string" ? event.details : undefined,
              bilanId: typeof event.bilanId === "string" ? event.bilanId : undefined,
              lotId: typeof event.lotId === "string" ? event.lotId : undefined,
            };
          })
          .slice(0, 500)
      : [],
    versions: Array.isArray(source.versions)
      ? source.versions
          .map((item) => {
            const version = asRecord(item);
            return {
              id: String(version.id || `version_${Date.now()}`),
              at: String(version.at || now),
              label: String(version.label || "Version"),
              bilansCount: asNumber(version.bilansCount),
              lotsCount: asNumber(version.lotsCount),
              totalBudgetInitial: asNumber(version.totalBudgetInitial),
            };
          })
          .slice(0, 50)
      : [],
  };
}

export function normalizeProjectData(raw: unknown): Projet {
  return normalizeProject(raw);
}

export function loadProjects(): Projet[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProject);
  } catch {
    console.warn("[storage] Impossible de parser les projets du localStorage");
    return [];
  }
}

export function saveProjects(projects: Projet[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.map(normalizeProject)));
  } catch (error) {
    console.error("[storage] Erreur lors de la sauvegarde des projets", error);
  }
}

export function getProjectById(id: string): Projet | null {
  const project = loadProjects().find((candidate) => candidate.id === id);
  return project ? normalizeProject(project) : null;
}

export function upsertProject(project: Projet): void {
  const projects = loadProjects();
  const index = projects.findIndex((candidate) => candidate.id === project.id);
  const normalized = normalizeProject({ ...project, updatedAt: new Date().toISOString() });

  if (index >= 0) projects[index] = normalized;
  else projects.push(normalized);

  saveProjects(projects);
}

export function deleteProject(id: string): void {
  saveProjects(loadProjects().filter((project) => project.id !== id));
}

export function exportProjectToJson(project: Projet): string {
  return JSON.stringify(normalizeProject(project), null, 2);
}

export const exportProjectJSON = exportProjectToJson;

export function importProjectFromJson(json: string): Projet {
  return normalizeProject(JSON.parse(json));
}

export const importProjectJSON = importProjectFromJson;

export function replaceAllProjects(projects: Projet[]): void {
  saveProjects(projects);
}

export function clearAllProjects(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
