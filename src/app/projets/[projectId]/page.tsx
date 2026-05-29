"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiActivity, FiAlertTriangle, FiArrowLeft,
  FiCalendar, FiCheck, FiDownload, FiEdit2, FiFilePlus,
  FiFileText, FiInfo, FiList, FiRefreshCw, FiSave, FiX,
} from "react-icons/fi";

import { B2PTimeline } from "@/components/b2p/B2PTimeline";
import { AppLayout } from "@/components/layout/AppLayout";
import { DecisionSummary } from "@/components/projets/DecisionSummary";
import { LotsEditor } from "@/components/projets/LotsEditor";
import { Button } from "@/components/ui/Button";
import { FrenchDateInput } from "@/components/ui/FrenchDateInput";
import { useToast } from "@/components/ui/ToastProvider";
import { appendAuditEvent, appendProjectVersion, createAuditEvent } from "@/lib/audit";
import {
  buildInitialB2P0,
  buildNextI1Table,
  buildRecommendedB2PDates,
  getB2PCadenceRule,
  getB2PPlanWarnings,
  getBilanLabel,
  getProjectPlannedB2PDates,
} from "@/lib/b2p";
import { getLastBilan, isPTOLot, sortBilans } from "@/lib/fgf";
import { formatDateFR } from "@/lib/dates";
import { formatMoneyLike, getCostUnitLabel } from "@/lib/projectLabels";
import { getProjectDecisionSummary } from "@/lib/projectHealth";
import { downloadProjectExcel, downloadProjectPDF } from "@/lib/exports";
import { saveProjectFile } from "@/lib/projectFile";
import { getProjectById, upsertProject } from "@/lib/storage";
import type { BilanPilotage, LotTache, Projet } from "@/types/projet";

type TabId = "b2p" | "pilotage" | "planning" | "budget" | "historique";

function updateBilansForLots(bilans: BilanPilotage[], lots: LotTache[]): BilanPilotage[] {
  return bilans.map((bilan) => ({
    ...bilan,
    lignes: lots.map((lot) => {
      const existing = (bilan.lignes ?? []).find((l) => l.lotId === lot.id);
      return existing ?? { lotId: lot.id, variation: 0, depenses: 0, avancementPhysique: 0, resteAFaire: 0, commentaire: "" };
    }),
  }));
}

function FgfMetric({
  label,
  amount,
  unit,
  sub,
  valueClass,
  border,
}: {
  label: string;
  amount: number;
  unit: string;
  sub?: string;
  valueClass?: string;
  border?: boolean;
}) {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const num = safeAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  return (
    <div className={`flex-1 min-w-0 px-3.5 py-3 ${border ? "border-r border-slate-100" : ""}`}>
      <div className="text-[9px] font-bold uppercase tracking-[0.11em] text-slate-400">{label}</div>
      <div className={`mt-1.5 text-[17px] font-bold tabular-nums leading-none ${valueClass ?? "text-slate-800"}`}>
        {num}
      </div>
      <div className="mt-0.5 text-[9.5px] text-slate-400 truncate">{unit}</div>
      {sub && <div className="mt-0.5 text-[9px] text-slate-300">{sub}</div>}
    </div>
  );
}

function TabBtn({
  label,
  icon,
  count,
  active,
  alert,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 border-b-2 px-4 py-3 text-[12px] font-semibold transition-colors duration-100 whitespace-nowrap ${
        active
          ? "border-[var(--green)] text-[var(--green)]"
          : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800"
      }`}
    >
      <span className={active ? "opacity-90" : "opacity-45"}>{icon}</span>
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
      {alert && (
        <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
      )}
    </button>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const projectId = (params?.projectId as string) || "";

  const [project, setProject] = useState<Projet | null>(null);
  const [ready, setReady] = useState(false);
  const [lotsModalOpen, setLotsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("b2p");
  const [editingDates, setEditingDates] = useState(false);
  const [draftDateFin, setDraftDateFin] = useState("");

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setProject(getProjectById(projectId));
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  const plannedDates = useMemo(() => (project ? getProjectPlannedB2PDates(project) : []), [project]);
  const recommendedDates = useMemo(() => (project ? buildRecommendedB2PDates(project) : []), [project]);
  const planWarnings = useMemo(() => (project ? getB2PPlanWarnings(project, plannedDates) : []), [project, plannedDates]);
  const cadence = useMemo(() => (project ? getB2PCadenceRule(project.dateDebut, project.dateFin) : null), [project]);
  const bilansSorted = useMemo(() => (project ? sortBilans(project.bilans ?? []) : []), [project]);
  const lastBilan = useMemo(() => (project ? getLastBilan(project) : null), [project]);
  const unitLabel = useMemo(() => (project ? getCostUnitLabel(project) : "EUR"), [project]);
  const projectSummary = useMemo(() => (project ? getProjectDecisionSummary(project) : null), [project]);

  const persist = (
    next: Projet,
    message?: string,
    audit?: { action: Parameters<typeof createAuditEvent>[0]; label: string; details?: string; bilanId?: string },
  ) => {
    const withAudit = audit
      ? appendAuditEvent(next, createAuditEvent(audit.action, audit.label, { details: audit.details, bilanId: audit.bilanId }))
      : next;
    const updated = { ...withAudit, updatedAt: new Date().toISOString() };
    setProject(updated);
    upsertProject(updated);
    if (message) pushToast("success", message);
  };

  const handleLotsSave = (lots: LotTache[]) => {
    if (!project) return;
    persist(
      { ...project, lots, bilans: updateBilansForLots(project.bilans ?? [], lots) },
      "Lignes budgétaires mises à jour.",
      { action: "lots_updated", label: "Structure LB mise à jour", details: `${lots.length} ligne(s) budgétaire(s)` },
    );
    setLotsModalOpen(false);
  };

  const handlePlanDateChange = (index: number, date: string) => {
    if (!project) return;
    const nextDates = plannedDates.map((d, i) => (i === index ? date : d));
    // §4 (NT.26.008) — Si le projet prend du retard, le décalage d'une date B2P peut
    // dépasser la date de fin actuelle : on l'étend automatiquement plutôt que de
    // bloquer la saisie. La nouvelle date de fin = max(ancienne dateFin, nouvelle date).
    const newDateFin = date > project.dateFin ? date : project.dateFin;
    const projectUpdate = newDateFin !== project.dateFin ? { dateFin: newDateFin } : {};
    persist(
      { ...project, ...projectUpdate, b2pDates: nextDates, nbB2P: Math.max(0, nextDates.length - 1) },
      newDateFin !== project.dateFin ? `Projet étendu jusqu'au ${formatDateFR(newDateFin)}.` : undefined,
      { action: "plan_updated", label: "Date B2P modifiée", details: `Index ${index} : ${formatDateFR(date)}` },
    );
  };

  // §4 (NT.26.008) — Ajouter un B2P supplémentaire à la fin (retard projet).
  // Le nouveau B2P est placé entre la dernière date B2P et la date de fin du projet ;
  // si la dernière B2P = dateFin, on étend dateFin d'un pas équivalent au dernier écart.
  const addExtraB2P = () => {
    if (!project) return;
    const dates = [...plannedDates];
    const last = dates[dates.length - 1] ?? project.dateDebut;
    const previous = dates[dates.length - 2] ?? project.dateDebut;
    // Estime un pas raisonnable = écart entre les 2 derniers B2P (sinon 30 jours).
    const lastDate = new Date(last + "T12:00:00Z");
    const prevDate = new Date(previous + "T12:00:00Z");
    const stepMs = Math.max(7 * 24 * 60 * 60 * 1000, lastDate.getTime() - prevDate.getTime());
    const nextDate = new Date(lastDate.getTime() + stepMs);
    const nextISO = nextDate.toISOString().slice(0, 10);
    const updatedDates = [...dates, nextISO].sort();
    // Étend la date de fin si nécessaire.
    const newDateFin = nextISO > project.dateFin ? nextISO : project.dateFin;
    const projectUpdate = newDateFin !== project.dateFin ? { dateFin: newDateFin } : {};
    persist(
      { ...project, ...projectUpdate, b2pDates: updatedDates, nbB2P: Math.max(0, updatedDates.length - 1) },
      `B2P ajouté au ${formatDateFR(nextISO)}.`,
      { action: "plan_updated", label: `B2P ajouté (retard projet)`, details: formatDateFR(nextISO) },
    );
  };

  const resetPlan = () => {
    if (!project) return;
    persist(
      { ...project, b2pDates: recommendedDates, nbB2P: Math.max(0, recommendedDates.length - 1) },
      "Planning B2P recalé sur la règle FGF.",
      { action: "plan_updated", label: "Planning B2P recalé FGF" },
    );
  };

  const saveDateFin = () => {
    if (!project || !draftDateFin) return;
    if (draftDateFin <= project.dateDebut) {
      pushToast("error", "La date de fin doit être après la date de début.");
      return;
    }
    const updatedProject = { ...project, dateFin: draftDateFin };
    const newRecommended = buildRecommendedB2PDates(updatedProject);
    const existingDates = plannedDates;
    let newDates: string[];
    if (newRecommended.length > existingDates.length) {
      const extra = newRecommended.slice(existingDates.length);
      newDates = [...existingDates, ...extra].filter((d) => d <= draftDateFin);
    } else {
      newDates = existingDates.filter((d) => d <= draftDateFin);
    }
    if (newDates.length === 0 || newDates[newDates.length - 1] !== draftDateFin) {
      newDates.push(draftDateFin);
    }
    newDates.sort();
    persist(
      { ...updatedProject, b2pDates: newDates, nbB2P: Math.max(0, newDates.length - 1) },
      `Date de fin mise à jour : ${formatDateFR(draftDateFin)}.`,
      { action: "project_updated", label: `Date de fin → ${formatDateFR(draftDateFin)}` },
    );
    setEditingDates(false);
  };

  const ensureB2P0 = () => {
    if (!project) return;
    const hasB2P0 = (project.bilans ?? []).some((b) => Number(b.numero) === 0);
    if (hasB2P0) { pushToast("info", "B2P0 existe déjà."); return; }
    const b2p0 = buildInitialB2P0(project);
    const updated = { ...project, bilans: [b2p0, ...(project.bilans ?? [])] };
    persist(updated, "B2P0 démarré.", { action: "b2p_created", label: "B2P0 démarré", bilanId: b2p0.id });
    router.push(`/projets/${project.id}/b2p/${b2p0.id}`);
  };

  const createNextI1 = () => {
    if (!project) return;
    const next = buildNextI1Table(project);
    const updated = { ...project, bilans: [...(project.bilans ?? []), next] };
    persist(updated, `${getBilanLabel(next)} démarré.`, { action: "b2p_created", label: `${getBilanLabel(next)} démarré`, bilanId: next.id });
    router.push(`/projets/${project.id}/b2p/${next.id}`);
  };

  const openFirstB2P = () => {
    if (!project) return;
    const first = sortBilans(project.bilans ?? [])[0] ?? null;
    if (!first) { ensureB2P0(); return; }
    router.push(`/projets/${project.id}/b2p/${first.id}`);
  };

  const exportExcel = async () => {
    if (!project) return;
    await downloadProjectExcel(project);
    persist(appendProjectVersion(project, "Export Excel"), "Export Excel généré.", { action: "export_created", label: "Export Excel projet" });
  };

  const exportPDF = async () => {
    if (!project) return;
    await downloadProjectPDF(project);
    persist(appendProjectVersion(project, "Export PDF"), "Export PDF généré.", { action: "export_created", label: "Export PDF projet" });
  };

  const saveJson = async () => {
    if (!project) return;
    try {
      const savedProject = await saveProjectFile(project);
      setProject(savedProject);
      upsertProject(savedProject);
      pushToast("success", "Fichier projet JSON sauvegardé.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      pushToast("error", error instanceof Error ? error.message : "Sauvegarde JSON impossible.");
    }
  };

  if (!ready) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--green)]" />
            Chargement…
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <p className="text-[13px] text-slate-500">Projet introuvable.</p>
          <Button size="sm" onClick={() => router.push("/projets/liste")}>Tous les projets</Button>
        </div>
      </AppLayout>
    );
  }

  const bilanCount = project.bilans?.length ?? 0;
  const isCritical = projectSummary?.status === "critical";
  const isWatch = projectSummary?.status === "watch";
  const statusColor = isCritical ? "#ef4444" : isWatch ? "#f4a321" : "#56a45b";

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number; alert?: boolean }[] = [
    { id: "b2p", label: "Tableaux B2P", icon: <FiActivity size={12} />, count: bilanCount },
    { id: "pilotage", label: "Pilotage", icon: <FiInfo size={12} />, alert: isCritical || isWatch },
    { id: "planning", label: "Dates des B2P", icon: <FiCalendar size={12} />, count: Math.max(0, plannedDates.length - 1), alert: planWarnings.length > 0 },
    { id: "budget", label: "Structure", icon: <FiList size={12} />, count: project.lots.length },
    { id: "historique", label: "Historique", icon: <FiFileText size={12} /> },
  ];

  return (
    <AppLayout>

      {/* ═══════════════════════════════════════════════
          PROJECT HEADER — sticky, dense, data-forward
          ═══════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>

        {/* Status stripe */}
        <div className="h-[3px] w-full" style={{ background: statusColor }} />

        <div className="mx-auto max-w-6xl px-6">

          {/* Row 1: back + name + actions */}
          <div className="flex items-center gap-4 py-3">

            {/* Back */}
            <button
              onClick={() => router.push("/projets/liste")}
              className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700"
            >
              <FiArrowLeft size={12} />
              <span className="hidden sm:inline">Projets</span>
            </button>

            <div className="h-4 w-px bg-slate-200 flex-shrink-0" />

            {/* Name + badges */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
              <h1 className="truncate text-[17px] font-bold text-slate-900 tracking-tight">
                {project.nom}
              </h1>
              <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {project.status}
              </span>
              {projectSummary && (
                <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${projectSummary.statusClass}`}>
                  {projectSummary.statusLabel}
                </span>
              )}
              {editingDates ? (
                <span className="hidden items-center gap-1.5 sm:flex">
                  <span className="text-[11px] text-slate-400 flex-shrink-0">
                    <FiCalendar size={10} className="mr-1 inline" />
                    {formatDateFR(project.dateDebut)} →
                  </span>
                  <input
                    type="date"
                    value={draftDateFin}
                    min={project.dateDebut}
                    onChange={(e) => setDraftDateFin(e.target.value)}
                    className="h-6 w-32 rounded border border-slate-300 px-1.5 text-[11px] text-slate-800 outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/20"
                  />
                  <button onClick={saveDateFin} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50" title="Confirmer">
                    <FiCheck size={12} />
                  </button>
                  <button onClick={() => setEditingDates(false)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100" title="Annuler">
                    <FiX size={12} />
                  </button>
                </span>
              ) : (
                <span
                  className="hidden flex-shrink-0 cursor-pointer items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 sm:flex"
                  onClick={() => { setDraftDateFin(project.dateFin); setEditingDates(true); }}
                  title="Modifier la date de fin"
                >
                  <FiCalendar size={10} />
                  {formatDateFR(project.dateDebut)} → {formatDateFR(project.dateFin)}
                  <FiEdit2 size={9} className="text-slate-300 hover:text-slate-500" />
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <Button onClick={createNextI1} size="sm" iconLeft={<FiFilePlus size={12} />}>
                Nouveau B2P i-1
              </Button>
              <Button variant="secondary" size="sm" onClick={openFirstB2P} iconLeft={<FiFileText size={12} />}>
                Ouvrir
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setLotsModalOpen(true)} iconLeft={<FiEdit2 size={11} />}>
                LB
              </Button>
              <div className="ml-1 flex items-center gap-1">
                <button onClick={saveJson} className="toolbar-btn" title="Enregistrer JSON">
                  <FiSave size={10} /> JSON
                </button>
                <button onClick={exportPDF} className="toolbar-btn" title="Export PDF">
                  <FiDownload size={10} /> PDF
                </button>
                <button onClick={exportExcel} className="toolbar-btn" title="Export Excel">
                  <FiDownload size={10} /> XLS
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: FGF financial metrics bar */}
          <div className="mb-0 flex overflow-hidden rounded-t-xl border border-b-0 border-slate-100 bg-white">
            <FgfMetric label="BI" amount={projectSummary?.totalBI ?? 0} unit={unitLabel} sub="budget initial" border />
            <FgfMetric label="BàD" amount={projectSummary?.totalBudgetADate ?? 0} unit={unitLabel} sub="budget à date" border />
            <FgfMetric label="Dépenses" amount={projectSummary?.totalDepenses ?? 0} unit={unitLabel} sub={project.typeCout === "engagé" ? "engagées" : "encourues"} border />
            <FgfMetric label="CP" amount={projectSummary?.totalCPT ?? 0} unit={unitLabel} sub="coût prévisionnel" border />
            <FgfMetric
              label="Écart"
              amount={projectSummary?.totalEcart ?? 0}
              unit={unitLabel}
              sub={(projectSummary?.totalEcart ?? 0) > 0 ? "dépassement" : lastBilan ? "sous contrôle" : "—"}
              valueClass={
                (projectSummary?.totalEcart ?? 0) > 0 ? "text-red-700"
                  : lastBilan ? "text-emerald-700"
                  : "text-slate-400"
              }
              border
            />
            <FgfMetric
              label="Avancement"
              amount={Math.round((projectSummary?.avancement ?? 0) * 100)}
              unit="%"
              sub={lastBilan ? getBilanLabel(lastBilan) : "aucun tableau"}
            />
          </div>

          {/* Row 3: tabs */}
          <div className="flex items-center gap-0 overflow-x-auto">
            {tabs.map((tab) => (
              <TabBtn
                key={tab.id}
                label={tab.label}
                icon={tab.icon}
                count={tab.count}
                active={activeTab === tab.id}
                alert={tab.alert}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════
          TAB CONTENT
          ═══════════════════════════════ */}
      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* ── B2P Tab ── */}
        {activeTab === "b2p" && (
          <div className="space-y-3">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-semibold text-slate-800">
                  Tableaux B2P
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {bilanCount}
                </span>
                {bilanCount > 0 && lastBilan && (
                  <span className="text-[11px] text-slate-400">
                    · dernier : {formatDateFR(lastBilan.triggerDate ?? lastBilan.date)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={ensureB2P0}>
                  Démarrer B2P0
                </Button>
                <Button size="sm" iconLeft={<FiFilePlus size={12} />} onClick={createNextI1}>
                  Démarrer B2P suivant
                </Button>
              </div>
            </div>

            {/* Warnings banner */}
            {(isCritical || isWatch) && projectSummary && (
              <div
                className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[12px]"
                style={{
                  borderColor: isCritical ? "rgba(239,68,68,0.25)" : "rgba(244,163,33,0.3)",
                  background: isCritical ? "rgba(239,68,68,0.05)" : "rgba(244,163,33,0.06)",
                }}
              >
                <FiAlertTriangle
                  size={13}
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: isCritical ? "#dc2626" : "#d97706" }}
                />
                <div>
                  <span className="font-semibold" style={{ color: isCritical ? "#991b1b" : "#92400e" }}>
                    {projectSummary.headline}
                  </span>
                  {projectSummary.alerts.length > 0 && (
                    <span className="ml-2 text-slate-600">
                      — {projectSummary.alerts[0]}
                      {projectSummary.alerts.length > 1 && ` (+${projectSummary.alerts.length - 1})`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <B2PTimeline project={project} />
          </div>
        )}

        {/* ── Pilotage Tab ── */}
        {activeTab === "pilotage" && (
          <DecisionSummary project={project} />
        )}

        {/* ── Planning Tab ── */}
        {activeTab === "planning" && (
          <div className="space-y-4">
            <div className="panel-solid rounded-2xl p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-slate-800">Dates de déclenchement B2P</h2>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    Modifiez les dates ou recalez sur la règle FGF
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* §4 (NT.26.008) — Bouton pour ajouter un B2P lorsque le projet prend du retard. */}
                  <Button size="xs" iconLeft={<FiFilePlus size={10} />} onClick={addExtraB2P}>
                    Ajouter un B2P
                  </Button>
                  <Button size="xs" variant="secondary" iconLeft={<FiRefreshCw size={10} />} onClick={resetPlan}>
                    Réinitialiser FGF
                  </Button>
                </div>
              </div>

              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <FiInfo size={12} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                <span className="text-[11px] text-emerald-800">
                  <strong>{cadence?.label ?? "—"}</strong>
                  {cadence?.explanation ? ` · ${cadence.explanation}` : ""}
                  {" · "}
                  <strong>{Math.max(0, plannedDates.length - 1)} B2P</strong> + B2P0
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {plannedDates.map((date, i) => {
                  const created = bilansSorted.some((b) => Number(b.numero) === i);
                  return (
                    <div
                      key={`${i}-${date}`}
                      className={`rounded-xl border p-3.5 ${
                        created ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/80"
                      }`}
                    >
                      {/* §4 (NT.26.008) — Pas de borne max : un B2P peut être décalé
                          au-delà de la date de fin actuelle (retard projet ; la date de
                          fin est étendue automatiquement par handlePlanDateChange). */}
                      <FrenchDateInput
                        value={date}
                        min={project.dateDebut}
                        label={i === 0 ? "B2P0 — lancement" : `B2P${i} — déclenchement`}
                        onChange={(next) => handlePlanDateChange(i, next)}
                      />
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className={created ? "font-semibold text-emerald-700" : "text-slate-400"}>
                          {created ? "✓ Tableau démarré" : "À démarrer"}
                        </span>
                        <span className="text-slate-400">{formatDateFR(date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {planWarnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                    <FiAlertTriangle size={11} />
                    Écart à la règle FGF ({planWarnings.length})
                  </div>
                  {planWarnings.slice(0, 5).map((w) => (
                    <div key={w} className="pl-4 text-[11px] text-amber-800">{w}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Structure Tab ── */}
        {activeTab === "budget" && (
          <div className="panel-solid rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-800">Structure budgétaire</h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {project.lots.length} ligne{project.lots.length !== 1 ? "s" : ""} budgétaire{project.lots.length !== 1 ? "s" : ""} · {unitLabel}
                </p>
              </div>
              <Button size="sm" variant="secondary" iconLeft={<FiEdit2 size={12} />} onClick={() => setLotsModalOpen(true)}>
                Modifier les LB
              </Button>
            </div>

            {project.lots.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <p className="text-[12px] text-slate-500">Aucune ligne budgétaire.</p>
                <button
                  onClick={() => setLotsModalOpen(true)}
                  className="mt-2 text-[12px] font-semibold text-[var(--green)] hover:underline"
                >
                  Créer les lignes budgétaires
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[80px_1fr_150px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <div className="section-label">Code</div>
                  <div className="section-label">Libellé</div>
                  <div className="section-label text-right">Budget Initial</div>
                </div>
                <div className="divide-y divide-slate-50">
                  {/* §1 (NT.26.008) — La LB PTO doit toujours être affichée en dernier. */}
                  {project.lots
                    .slice()
                    .sort((a, b) => Number(isPTOLot(a)) - Number(isPTOLot(b)))
                    .map((lot) => (
                    <div
                      key={lot.id}
                      className="grid grid-cols-[80px_1fr_150px] gap-3 px-4 py-2.5 text-[12px] transition-colors hover:bg-slate-50/60"
                    >
                      <div className="font-mono text-[11px] font-semibold text-slate-500">
                        {lot.code || "—"}
                      </div>
                      <div className="truncate text-slate-700">{lot.libelle || "Sans libellé"}</div>
                      <div className="text-right font-semibold tabular-nums text-slate-900">
                        {formatMoneyLike(lot.budgetInitial, unitLabel)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[80px_1fr_150px] gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-2.5">
                  <div />
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total BI</div>
                  <div className="text-right text-[13px] font-bold tabular-nums text-slate-900">
                    {formatMoneyLike(
                      project.lots.reduce((s, l) => s + Number(l.budgetInitial ?? 0), 0),
                      unitLabel,
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Historique Tab ── */}
        {activeTab === "historique" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel-solid rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <FiFileText size={13} className="text-slate-400" />
                <h2 className="text-[13px] font-semibold">Journal d&apos;audit</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {(project.auditTrail ?? []).length}
                </span>
              </div>
              <div className="space-y-1.5">
                {(project.auditTrail ?? []).slice(0, 12).map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold text-slate-800">{event.label}</span>
                      <span className="flex-shrink-0 text-[10px] text-slate-400">
                        {new Date(event.at).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {event.details && (
                      <div className="mt-0.5 text-[11px] text-slate-500">{event.details}</div>
                    )}
                  </div>
                ))}
                {!(project.auditTrail ?? []).length && (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-[12px] text-slate-400">
                    Aucun événement enregistré.
                  </div>
                )}
              </div>
            </section>

            <section className="panel-solid rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <FiSave size={13} className="text-slate-400" />
                <h2 className="text-[13px] font-semibold">Versions locales</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {(project.versions ?? []).length}
                </span>
              </div>
              <div className="space-y-1.5">
                {(project.versions ?? []).slice(0, 12).map((version) => (
                  <div key={version.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold text-slate-800">{version.label}</span>
                      <span className="flex-shrink-0 text-[10px] text-slate-400">
                        {new Date(version.at).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {version.bilansCount} B2P · {version.lotsCount} LB ·{" "}
                      {formatMoneyLike(version.totalBudgetInitial, unitLabel)}
                    </div>
                  </div>
                ))}
                {!(project.versions ?? []).length && (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-[12px] text-slate-400">
                    Les versions sont créées à chaque export.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <LotsEditor
        open={lotsModalOpen}
        lots={project.lots}
        monnaie={unitLabel}
        onClose={() => setLotsModalOpen(false)}
        onUpdated={handleLotsSave}
      />
    </AppLayout>
  );
}
