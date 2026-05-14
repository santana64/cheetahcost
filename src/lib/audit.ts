import { getBilanLabel } from "@/lib/b2p";
import type { AuditAction, AuditEvent, ProjectVersion, Projet } from "@/types/projet";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `audit_${Math.random().toString(36).slice(2, 10)}`;
}

export function createAuditEvent(action: AuditAction, label: string, options?: Partial<AuditEvent>): AuditEvent {
  return {
    id: generateId(),
    at: new Date().toISOString(),
    actor: options?.actor || "Utilisateur local",
    action,
    label,
    details: options?.details,
    bilanId: options?.bilanId,
    lotId: options?.lotId,
  };
}

export function appendAuditEvent(project: Projet, event: AuditEvent): Projet {
  const auditTrail = [event, ...(project.auditTrail ?? [])].slice(0, 500);
  return { ...project, auditTrail };
}

export function createProjectVersion(project: Projet, label: string): ProjectVersion {
  return {
    id: generateId(),
    at: new Date().toISOString(),
    label,
    bilansCount: project.bilans?.length ?? 0,
    lotsCount: project.lots?.length ?? 0,
    totalBudgetInitial: (project.lots ?? []).reduce((sum, lot) => sum + Number(lot.budgetInitial ?? 0), 0),
  };
}

export function appendProjectVersion(project: Projet, label: string): Projet {
  const versions = [createProjectVersion(project, label), ...(project.versions ?? [])].slice(0, 50);
  return { ...project, versions };
}

export function lockBilan(project: Projet, bilanId: string): Projet {
  const locked = new Set(project.lockedBilanIds ?? []);
  locked.add(bilanId);
  const bilan = (project.bilans ?? []).find((candidate) => candidate.id === bilanId);
  return appendAuditEvent(
    { ...project, lockedBilanIds: Array.from(locked) },
    createAuditEvent("b2p_locked", `${bilan ? getBilanLabel(bilan) : "B2P"} verrouillé`, { bilanId }),
  );
}

export function unlockBilan(project: Projet, bilanId: string): Projet {
  const lockedBilanIds = (project.lockedBilanIds ?? []).filter((id) => id !== bilanId);
  const bilan = (project.bilans ?? []).find((candidate) => candidate.id === bilanId);
  return appendAuditEvent(
    { ...project, lockedBilanIds },
    createAuditEvent("b2p_unlocked", `${bilan ? getBilanLabel(bilan) : "B2P"} déverrouillé`, { bilanId }),
  );
}

export function isBilanLocked(project: Projet, bilanId: string): boolean {
  return (project.lockedBilanIds ?? []).includes(bilanId);
}
