"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

import { B2PTable } from "@/components/b2p/B2PTable";
import { useAutoScale } from "@/hooks/useAutoScale";
import { appendAuditEvent, appendProjectVersion, createAuditEvent, isBilanLocked, lockBilan, unlockBilan } from "@/lib/audit";
import {
  buildI2JTable,
  buildNextI1Table,
  getBilanKind,
  getBilanLabel,
  getNextI2JIndex,
} from "@/lib/b2p";
import { aggregateBilan, isPTOLot, sortBilans } from "@/lib/fgf";
import { formatDateFR } from "@/lib/dates";
import { downloadBilanExcel, downloadProjectPDF } from "@/lib/exports";
import { formatMoneyLike, getPanelUnitLabel } from "@/lib/projectLabels";
import { saveProjectFile } from "@/lib/projectFile";
import { getProjectById, upsertProject } from "@/lib/storage";
import type { BilanPilotage, LigneBilan, Projet } from "@/types/projet";

type SavingState = "idle" | "saving" | "saved";
type UndoState<T> = {
  past: T[];
  present: T;
  future: T[];
};

const ProjectEcartChart = dynamic(
  () => import("@/components/charts/ProjectEcartChart").then((module) => module.ProjectEcartChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Chargement du graphique...
      </div>
    ),
  },
);

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function lsGetBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "1";
}

function lsSetBool(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

function lsGetNum(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function lsSetNum(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

function sanitizePatchForContext(project: Projet, bilan: BilanPilotage, lotId: string, patch: Partial<LigneBilan>) {
  const next: Partial<LigneBilan> = { ...patch };
  const lot = (project.lots ?? []).find((candidate) => candidate.id === lotId);

  if (getBilanKind(bilan) === "b2p0") {
    delete next.depenses;
    delete next.avancementPhysique;
    delete next.resteAFaire;
  }

  if (isPTOLot(lot)) {
    delete next.depenses;
    delete next.avancementPhysique;
  }

  return next;
}

export default function B2PPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params?.projectId as string;
  const b2pId = params?.b2pId as string;

  const [project, setProject] = useState<Projet | null>(null);
  const [undo, setUndo] = useState<UndoState<BilanPilotage> | null>(null);
  const [savingState, setSavingState] = useState<SavingState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);
  const [lineQuery, setLineQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "changed" | "risks" | "pto">("all");
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [panelW, setPanelW] = useState(520);
  const resizingRef = useRef(false);

  const sheetViewportRef = useRef<HTMLDivElement | null>(null);
  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const scale = useAutoScale(sheetViewportRef, sheetContentRef, { minScale: 0.35, maxScale: 1, padding: 18 });

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartX, setChartX] = useState(80);
  const [chartY, setChartY] = useState(90);
  const [chartW, setChartW] = useState(980);
  const [chartH, setChartH] = useState(560);
  const chartDragRef = useRef(false);
  const chartResizeRef = useRef(false);
  const dragStartRef = useRef<{ mx: number; my: number; x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRightPanelOpen(lsGetBool("fgf_b2p_rightPanelOpen", false));
      setPanelW(lsGetNum("fgf_b2p_rightPanelWidth", 520));
      setChartOpen(lsGetBool("fgf_b2p_chartOpen", false));
      setChartX(lsGetNum("fgf_b2p_chartX", 80));
      setChartY(lsGetNum("fgf_b2p_chartY", 90));
      setChartW(lsGetNum("fgf_b2p_chartW", 980));
      setChartH(lsGetNum("fgf_b2p_chartH", 560));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => lsSetBool("fgf_b2p_rightPanelOpen", rightPanelOpen), [rightPanelOpen]);
  useEffect(() => lsSetNum("fgf_b2p_rightPanelWidth", panelW), [panelW]);
  useEffect(() => lsSetBool("fgf_b2p_chartOpen", chartOpen), [chartOpen]);
  useEffect(() => lsSetNum("fgf_b2p_chartX", chartX), [chartX]);
  useEffect(() => lsSetNum("fgf_b2p_chartY", chartY), [chartY]);
  useEffect(() => lsSetNum("fgf_b2p_chartW", chartW), [chartW]);
  useEffect(() => lsSetNum("fgf_b2p_chartH", chartH), [chartH]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      setPanelW(Math.max(360, Math.min(760, window.innerWidth - event.clientX)));
    };
    const onUp = () => {
      resizingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const onMove = (event: MouseEvent) => {
      if (chartDragRef.current && dragStartRef.current) {
        setChartX(clamp(dragStartRef.current.x + event.clientX - dragStartRef.current.mx, 8, Math.max(8, window.innerWidth - 260)));
        setChartY(clamp(dragStartRef.current.y + event.clientY - dragStartRef.current.my, 8, Math.max(8, window.innerHeight - 120)));
      }

      if (chartResizeRef.current && resizeStartRef.current) {
        setChartW(clamp(resizeStartRef.current.w + event.clientX - resizeStartRef.current.mx, 520, 1600));
        setChartH(clamp(resizeStartRef.current.h + event.clientY - resizeStartRef.current.my, 360, 1000));
      }
    };
    const onUp = () => {
      chartDragRef.current = false;
      chartResizeRef.current = false;
      dragStartRef.current = null;
      resizeStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const loaded = getProjectById(projectId);
      if (!loaded) return;
      const current = loaded.bilans.find((candidate) => candidate.id === b2pId) ?? null;
      if (!current) return;
      setProject(loaded);
      setUndo({ past: [], present: current, future: [] });
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, b2pId]);

  const bilan = undo?.present ?? null;
  const bilansSorted = useMemo(() => (project ? sortBilans(project.bilans ?? []) : []), [project]);
  const currentIndex = useMemo(() => (bilan ? bilansSorted.findIndex((candidate) => candidate.id === bilan.id) : -1), [bilan, bilansSorted]);
  const previousBilan = currentIndex > 0 ? bilansSorted[currentIndex - 1] : null;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < bilansSorted.length - 1;
  const summary = useMemo(() => (project && bilan ? aggregateBilan(project, bilan) : null), [project, bilan]);
  const unitLabel = project ? getPanelUnitLabel(project) : "EUR";
  // i-2 bilans are NOT automatically locked — user must explicitly lock them
  const currentBilanLocked = !!project && !!bilan && isBilanLocked(project, bilan.id);

  const persistedSignature = useMemo(() => {
    if (!project || !bilan) return "";
    const persisted = project.bilans.find((candidate) => candidate.id === bilan.id);
    return persisted ? JSON.stringify(persisted) : "";
  }, [project, bilan]);

  const currentSignature = useMemo(() => (bilan ? JSON.stringify(bilan) : ""), [bilan]);
  const isDirty = !!bilan && persistedSignature !== currentSignature;

  const saveProjectWithBilans = useCallback((bilans: BilanPilotage[], sourceProject = project) => {
    if (!sourceProject) return null;
    const updated: Projet = { ...sourceProject, bilans, updatedAt: new Date().toISOString() };
    upsertProject(updated);
    const normalized = getProjectById(updated.id) ?? updated;
    setProject(normalized);
    return normalized;
  }, [project]);

  const projectWithCurrentBilan = (): Projet | null => {
    if (!project) return null;
    if (!bilan) return project;
    return {
      ...project,
      bilans: (project.bilans ?? []).map((candidate) => (candidate.id === bilan.id ? bilan : candidate)),
    };
  };

  useEffect(() => {
    if (!project || !bilan || !isDirty) return;
    let cancelled = false;
    const savingTimer = window.setTimeout(() => {
      if (!cancelled) setSavingState("saving");
    }, 0);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      saveProjectWithBilans(project.bilans.map((candidate) => (candidate.id === bilan.id ? bilan : candidate)));
      setSavingState("saved");
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(savingTimer);
      window.clearTimeout(timer);
    };
  }, [project, bilan, isDirty, saveProjectWithBilans]);

  const gotoB2P = useCallback((targetId: string) => router.push(`/projets/${projectId}/b2p/${targetId}`), [projectId, router]);
  const gotoPrev = useCallback(() => {
    if (canPrev) gotoB2P(bilansSorted[currentIndex - 1].id);
  }, [bilansSorted, canPrev, currentIndex, gotoB2P]);
  const gotoNext = useCallback(() => {
    if (canNext) gotoB2P(bilansSorted[currentIndex + 1].id);
  }, [bilansSorted, canNext, currentIndex, gotoB2P]);

  const forceSave = useCallback(() => {
    if (!project || !bilan) return;
    const withAudit = appendAuditEvent(project, createAuditEvent("b2p_saved", `${getBilanLabel(bilan)} enregistré`, { bilanId: bilan.id }));
    const updated = { ...withAudit, bilans: withAudit.bilans.map((candidate) => (candidate.id === bilan.id ? bilan : candidate)) };
    upsertProject(updated);
    const normalized = getProjectById(updated.id) ?? updated;
    setProject(normalized);
    setSavingState("saved");
    setSavedAt(new Date().toLocaleTimeString("fr-FR"));
  }, [bilan, project]);

  const onChangeLigne = (lotId: string, patch: Partial<LigneBilan>) => {
    if (!project || !bilan) return;
    if (currentBilanLocked) return;
    const safePatch = sanitizePatchForContext(project, bilan, lotId, patch);
    if (!Object.keys(safePatch).length) return;

    const next: BilanPilotage = {
      ...bilan,
      lignes: bilan.lignes.map((line) => (line.lotId === lotId ? { ...line, ...safePatch } : line)),
    };

    setUndo((state) => (state ? { past: [...state.past, state.present], present: next, future: [] } : state));

    // §3.2 (Nota 2) — Si on modifie une valeur du tableau B2Pi-1 (variation, dépenses,
    // avancement physique), la correction doit se répercuter sur les tableaux B2Pi-2j
    // associés (même numéro de B2P). Le RàF et le commentaire de chaque scénario sont
    // conservés indépendamment.
    const currentKind = getBilanKind(bilan);
    if (currentKind === "i-1") {
      const propagated: Partial<LigneBilan> = {};
      if ("variation" in safePatch)          propagated.variation = safePatch.variation;
      if ("depenses" in safePatch)           propagated.depenses = safePatch.depenses;
      if ("avancementPhysique" in safePatch) propagated.avancementPhysique = safePatch.avancementPhysique;

      if (Object.keys(propagated).length > 0) {
        const numero = Number(bilan.numero);
        const updatedBilans = project.bilans.map((candidate) => {
          if (candidate.id === bilan.id) return candidate;
          const candidateKind = getBilanKind(candidate);
          if (Number(candidate.numero) !== numero) return candidate;
          if (candidateKind !== "i-2j" && candidateKind !== "i-2") return candidate;
          return {
            ...candidate,
            lignes: candidate.lignes.map((line) =>
              line.lotId === lotId ? { ...line, ...propagated } : line,
            ),
          };
        });
        saveProjectWithBilans(updatedBilans);
      }
    }
  };

  const createNextI1 = () => {
    const baseProject = projectWithCurrentBilan();
    if (!baseProject) return;
    const next = buildNextI1Table(baseProject);
    const audited = appendAuditEvent(baseProject, createAuditEvent("b2p_created", `${getBilanLabel(next)} créé`, { bilanId: next.id }));
    saveProjectWithBilans([...(audited.bilans ?? []), next], audited);
    router.push(`/projets/${baseProject.id}/b2p/${next.id}`);
  };

  const createI2J = () => {
    const baseProject = projectWithCurrentBilan();
    if (!baseProject || !bilan) return;
    const next = buildI2JTable(baseProject, Number(bilan.numero));
    if (!next) return;
    const audited = appendAuditEvent(baseProject, createAuditEvent("b2p_created", `${getBilanLabel(next)} créé`, { bilanId: next.id }));
    saveProjectWithBilans([...(audited.bilans ?? []), next], audited);
    router.push(`/projets/${baseProject.id}/b2p/${next.id}`);
  };

  const promoteToI2 = () => {
    if (!project || !bilan) return;
    const numero = Number(bilan.numero);
    let nextScenario = getNextI2JIndex(project, numero);

    const updated = project.bilans.map((candidate) => {
      if (candidate.id === bilan.id) {
        return { ...bilan, tableKind: "i-2" as const, scenarioIndex: undefined };
      }
      if (Number(candidate.numero) === numero && getBilanKind(candidate) === "i-2") {
        const demoted = { ...candidate, tableKind: "i-2j" as const, scenarioIndex: nextScenario };
        nextScenario += 1;
        return demoted;
      }
      return candidate;
    });

    // §3.2 — Le B2Pi-2 retenu reste éditable sur la colonne RàF (conformément
    // à la spec : « conserver les valeurs du B2Pi-2j choisi, avec possibilité de
    // modifier les valeurs de la colonne RàF »). On NE verrouille pas le bilan
    // à la promotion ; l'utilisateur peut le verrouiller manuellement plus tard.
    const promoted = appendAuditEvent(
      { ...project, bilans: updated },
      createAuditEvent("b2p_promoted", `${getBilanLabel({ ...bilan, tableKind: "i-2" })} retenu`, { bilanId: bilan.id }),
    );
    upsertProject(promoted);
    const normalized = getProjectById(promoted.id) ?? promoted;
    setProject(normalized);
    const retained = normalized?.bilans.find((candidate) => candidate.id === bilan.id);
    if (retained) setUndo({ past: [], present: retained, future: [] });
  };

  const toggleCurrentLock = () => {
    if (!project || !bilan) return;
    const next = currentBilanLocked ? unlockBilan(project, bilan.id) : lockBilan(project, bilan.id);
    upsertProject(next);
    const normalized = getProjectById(next.id) ?? next;
    setProject(normalized);
  };

  const exportCurrentExcel = async () => {
    if (!project || !bilan) return;
    await downloadBilanExcel(project, bilan);
    const next = appendAuditEvent(appendProjectVersion(project, `Export ${getBilanLabel(bilan)}`), createAuditEvent("export_created", `Export Excel ${getBilanLabel(bilan)}`, { bilanId: bilan.id }));
    upsertProject(next);
    setProject(getProjectById(next.id) ?? next);
  };

  const exportProjectPDF = async () => {
    if (!project) return;
    await downloadProjectPDF(project);
    const next = appendAuditEvent(appendProjectVersion(project, "Export PDF projet"), createAuditEvent("export_created", "Export PDF projet"));
    upsertProject(next);
    setProject(getProjectById(next.id) ?? next);
  };

  const saveProjectJson = async () => {
    const baseProject = projectWithCurrentBilan();
    if (!baseProject) return;
    try {
      const savedProject = await saveProjectFile(baseProject);
      upsertProject(savedProject);
      setProject(getProjectById(savedProject.id) ?? savedProject);
      const retained = savedProject.bilans.find((candidate) => candidate.id === b2pId);
      if (retained) setUndo({ past: [], present: retained, future: [] });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
    }
  };

  const importClipboard = async () => {
    if (!project || !bilan || currentBilanLocked) return;
    const text = await navigator.clipboard.readText();
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.split("\t").map((cell) => cell.trim()))
      .filter((row) => row.some(Boolean));

    const parseNumber = (value: string) => {
      const number = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(number) ? number : 0;
    };

    const byCode = new Map((project.lots ?? []).map((lot) => [String(lot.code ?? "").trim().toLowerCase(), lot.id]));
    let updatedCount = 0;
    const nextLines = bilan.lignes.map((line) => ({ ...line }));

    rows.forEach((row) => {
      const lotId = byCode.get(String(row[0] ?? "").toLowerCase());
      if (!lotId) return;
      const index = nextLines.findIndex((line) => line.lotId === lotId);
      if (index < 0) return;
      nextLines[index] = {
        ...nextLines[index],
        variation: row[2] === undefined ? nextLines[index].variation : parseNumber(row[2]),
        depenses: row[3] === undefined ? nextLines[index].depenses : parseNumber(row[3]),
        avancementPhysique: row[4] === undefined ? nextLines[index].avancementPhysique : Math.max(0, Math.min(100, Math.round(parseNumber(row[4])))),
        resteAFaire: row[5] === undefined ? nextLines[index].resteAFaire : parseNumber(row[5]),
        commentaire: row[6] ?? nextLines[index].commentaire,
      };
      updatedCount += 1;
    });

    if (!updatedCount) return;
    const nextBilan = { ...bilan, lignes: nextLines };
    setUndo((state) => (state ? { past: [...state.past, state.present], present: nextBilan, future: [] } : state));
    const nextProject = appendAuditEvent(project, createAuditEvent("excel_clipboard_import", "Collage Excel importé", { details: `${updatedCount} ligne(s)`, bilanId: bilan.id }));
    setProject(nextProject);
  };

  const undoOnce = () => {
    setUndo((state) => {
      if (!state || !state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    });
  };

  const redoOnce = () => {
    setUndo((state) => {
      if (!state || !state.future.length) return state;
      const next = state.future[0];
      return { past: [...state.past, state.present], present: next, future: state.future.slice(1) };
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = navigator.platform.toLowerCase().includes("mac") ? event.metaKey : event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        forceSave();
      }
      if (key === "g") {
        event.preventDefault();
        setChartOpen((value) => !value);
      }
      if (key === "b") {
        event.preventDefault();
        setRightPanelOpen((value) => !value);
      }
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoOnce();
        else undoOnce();
      }
      if (key === "y") {
        event.preventDefault();
        redoOnce();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        gotoPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        gotoNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, bilan, currentIndex, bilansSorted, undo, forceSave, gotoNext, gotoPrev]);

  if (!project || !undo || !bilan) {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--bg)] text-[color:var(--text)]">
        <div className="text-sm">
          B2P introuvable.
          <div className="mt-3">
            <button className="rounded-md border border-black/15 bg-white/70 px-3 py-2 text-[12px]" onClick={() => router.push(`/projets/${projectId}`)}>
              Retour projet
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canUndo = undo.past.length > 0;
  const canRedo = undo.future.length > 0;
  const currentKind = getBilanKind(bilan);
  const canCreateScenario = currentKind !== "b2p0" && !!project.bilans.find((candidate) => Number(candidate.numero) === Number(bilan.numero) && getBilanKind(candidate) === "i-1");

  const ecartValue = summary ? summary.totalEcartFinal : null;
  const ecartPositive = typeof ecartValue === "number" && ecartValue > 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[color:var(--bg)] text-[color:var(--text)]">

      {/* ══ TOOLBAR ══ */}
      <div
        style={{
          background: "rgba(255,255,255,0.97)",
          borderBottom: "1px solid rgba(0,0,0,0.09)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* ── Row 1: Command bar (single scrollable line) ── */}
        <div
          className="flex items-center overflow-x-auto px-2"
          style={{ height: 44, gap: 0 }}
        >
          {/* Zone A: Back + Project context */}
          <div className="flex flex-shrink-0 items-center gap-1.5 pr-1">
            <button
              className="toolbar-btn"
              onClick={() => router.push(`/projets/${project.id}`)}
              title="Retour fiche projet"
            >
              ← Projet
            </button>
            <div
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1"
              style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-black tracking-wide"
                style={{ background: "#1F4E79", color: "#fff" }}
              >
                FGF
              </span>
              <span className="max-w-[150px] truncate text-[11px] font-semibold text-slate-700">
                {project.nom}
              </span>
            </div>
          </div>

          <span className="divider-y mx-2 flex-shrink-0" />

          {/* Zone B: B2P Navigator — highlighted */}
          <div
            className="flex flex-shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-1"
            style={{ background: "rgba(86,164,91,0.06)", border: "1px solid rgba(86,164,91,0.18)" }}
          >
            <button
              onClick={gotoPrev}
              disabled={!canPrev}
              title="B2P précédent (Ctrl+←)"
              className="toolbar-btn"
              style={{ height: 26, width: 26, padding: 0, justifyContent: "center", border: "none", background: "transparent", boxShadow: "none" }}
            >
              ‹
            </button>
            <select
              className="h-[26px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-800 outline-none focus:border-[var(--green)]"
              value={bilan.id}
              onChange={(e) => gotoB2P(e.target.value)}
              title="Naviguer vers un B2P"
              style={{ minWidth: 170 }}
            >
              {bilansSorted.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {formatDateFR(candidate.triggerDate ?? candidate.date)} — {getBilanLabel(candidate)}
                </option>
              ))}
            </select>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
              style={{ background: "rgba(86,164,91,0.15)", color: "#3f8f48" }}
            >
              {currentIndex >= 0 ? `${currentIndex + 1}/${bilansSorted.length}` : `—/${bilansSorted.length}`}
            </span>
            <button
              onClick={gotoNext}
              disabled={!canNext}
              title="B2P suivant (Ctrl+→)"
              className="toolbar-btn"
              style={{ height: 26, width: 26, padding: 0, justifyContent: "center", border: "none", background: "transparent", boxShadow: "none" }}
            >
              ›
            </button>
          </div>

          <span className="divider-y mx-2 flex-shrink-0" />

          {/* Zone C: B2P Workflow actions */}
          <div className="flex flex-shrink-0 items-center gap-1">
            <button className="toolbar-btn toolbar-btn-primary" onClick={createNextI1} title="Crée le B2P i-1 suivant">
              + Nouveau i-1
            </button>
            <button
              className="toolbar-btn toolbar-btn-warning"
              onClick={createI2J}
              disabled={!canCreateScenario}
              title="Crée un scénario B2P i-2j"
            >
              + Nouveau i-2j
            </button>
            <button
              className="toolbar-btn"
              onClick={promoteToI2}
              disabled={currentKind !== "i-2j"}
              title="Retenir ce scénario comme B2P i-2"
            >
              Retenir i-2
            </button>
            <button
              className="toolbar-btn"
              onClick={toggleCurrentLock}
              title={currentBilanLocked ? "Déverrouiller la saisie" : "Verrouiller en lecture seule"}
              style={currentBilanLocked ? { color: "#dc2626", borderColor: "rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)" } : {}}
            >
              {currentBilanLocked ? "🔒 Déverrouiller" : "🔓 Verrouiller"}
            </button>
          </div>

          <span className="divider-y mx-2 flex-shrink-0" />

          {/* Zone D: Edit tools */}
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              className="toolbar-btn"
              onClick={forceSave}
              title="Enregistrer (Ctrl+S)"
              style={isDirty ? { borderColor: "#56a45b", background: "rgba(86,164,91,0.08)", color: "#3f8f48" } : {}}
            >
              {savingState === "saving" ? "⏳ Sauvegarde…" : isDirty ? "● Enregistrer" : "✓ Enregistré"}
            </button>
            <button
              className="toolbar-btn"
              onClick={undoOnce}
              disabled={!canUndo}
              title="Annuler (Ctrl+Z)"
              style={{ paddingLeft: 9, paddingRight: 9 }}
            >
              ↩
            </button>
            <button
              className="toolbar-btn"
              onClick={redoOnce}
              disabled={!canRedo}
              title="Rétablir (Ctrl+Y)"
              style={{ paddingLeft: 9, paddingRight: 9 }}
            >
              ↪
            </button>
          </div>

          <span className="divider-y mx-2 flex-shrink-0" />

          {/* Zone E: View toggles + formulas */}
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              className="toolbar-btn"
              onClick={() => setChartOpen((v) => !v)}
              title="Graphique FGF (Ctrl+G)"
              style={chartOpen ? { background: "rgba(244,163,33,0.12)", borderColor: "rgba(244,163,33,0.4)", color: "#92400e" } : {}}
            >
              📈 Graphique
            </button>
            <button
              className="toolbar-btn"
              onClick={() => setRightPanelOpen((v) => !v)}
              title="Panneau contextuel (Ctrl+B)"
              style={rightPanelOpen ? { background: "rgba(86,164,91,0.08)", borderColor: "rgba(86,164,91,0.3)", color: "#3f8f48" } : {}}
            >
              {rightPanelOpen ? "◧ Masquer" : "◨ Panneau"}
            </button>
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-[11px] text-slate-500 transition hover:border-slate-200 hover:bg-slate-50"
              style={{ height: 30 }}
            >
              <input
                type="checkbox"
                checked={showFormulas}
                onChange={(e) => setShowFormulas(e.target.checked)}
                className="h-3 w-3 accent-[var(--green)]"
              />
              Formules
            </label>
          </div>

          {/* Zone F: right-aligned — save timestamp + exports dropdown */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-2 pl-2">
            {savedAt && savingState !== "saving" && (
              <span className="text-[10px] text-slate-400">
                {savedAt}
              </span>
            )}

            <div className="relative" ref={exportRef}>
              <button
                className="toolbar-btn"
                onClick={() => setExportOpen((v) => !v)}
                title="Exports et navigation"
                style={exportOpen ? { borderColor: "rgba(0,0,0,0.2)", background: "rgba(0,0,0,0.04)" } : {}}
              >
                Exporter
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ marginLeft: 2 }}>
                  <path d="M1.5 3.5L4.5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1.5 min-w-[190px] overflow-hidden rounded-xl bg-white"
                  style={{ border: "1px solid rgba(0,0,0,0.10)", boxShadow: "0 8px 28px rgba(0,0,0,0.13)" }}
                >
                  {[
                    { label: "Export JSON (B2P)", action: () => downloadText(`FGF_${project.nom}_${getBilanLabel(bilan)}.json`, JSON.stringify(bilan, null, 2)) },
                    { label: "Excel B2P", action: exportCurrentExcel },
                    { label: "PDF projet", action: exportProjectPDF },
                    { label: "Projet JSON", action: saveProjectJson },
                    { label: "Imprimer", action: () => window.print() },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      onClick={() => { setExportOpen(false); void action(); }}
                      className="flex w-full items-center px-4 py-2.5 text-left text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {label}
                    </button>
                  ))}
                  <div className="mx-3 my-1" style={{ height: 1, background: "rgba(0,0,0,0.07)" }} />
                  <Link
                    href="/projets/liste"
                    onClick={() => setExportOpen(false)}
                    className="flex w-full items-center px-4 py-2.5 text-left text-[12px] font-medium text-slate-500 transition hover:bg-slate-50"
                  >
                    Tous les projets
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Info + filter bar (merged) ── */}
        <div
          className="flex items-center overflow-x-auto border-t px-3 py-1.5"
          style={{ background: "rgba(0,0,0,0.02)", borderColor: "rgba(0,0,0,0.07)", gap: 0 }}
        >
          {/* Status badge */}
          <span
            className="flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
            style={
              currentBilanLocked
                ? { borderColor: "rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.08)", color: "#991b1b" }
                : { borderColor: "rgba(5,150,105,0.3)", background: "rgba(5,150,105,0.08)", color: "#065f46" }
            }
          >
            {currentBilanLocked ? "🔒 Lecture seule" : "✏️ Saisie active"}
          </span>

          <span className="divider-y mx-3 flex-shrink-0" />

          {/* FGF metrics */}
          <div className="flex flex-shrink-0 items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Tableau</span>
              <span className="text-[12px] font-bold text-slate-800">{getBilanLabel(bilan)}</span>
            </div>
            {/* §3.1 — Remplacer « Décl » par « B2P du » dans le haut du tableau. */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">B2P du</span>
              <span className="text-[12px] font-semibold text-slate-700">{formatDateFR(bilan.triggerDate ?? bilan.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">BàD</span>
              <span className="text-[12px] font-semibold tabular-nums text-slate-700">
                {summary ? formatMoneyLike(summary.totalBudgetADate, unitLabel) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">CP</span>
              <span className="text-[12px] font-semibold tabular-nums text-slate-700">
                {summary ? formatMoneyLike(summary.totalCPT, unitLabel) : "—"}
              </span>
            </div>
            {ecartValue !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Écart</span>
                <span className={`text-[12px] font-bold tabular-nums ${ecartPositive ? "text-red-600" : "text-emerald-700"}`}>
                  {formatMoneyLike(ecartValue, unitLabel)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Unité</span>
              <span className="text-[11px] font-semibold text-slate-600">{unitLabel}</span>
            </div>
          </div>

          {/* Right: filter tools */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
            <span className="divider-y mr-2 flex-shrink-0" />
            <input
              value={lineQuery}
              onChange={(e) => setLineQuery(e.target.value)}
              placeholder="Rechercher une LB…"
              className="h-[26px] w-40 rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/20"
            />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
              className="h-[26px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-[var(--green)]"
            >
              <option value="all">Toutes les lignes</option>
              <option value="changed">Lignes saisies</option>
              <option value="risks">Lignes en écart</option>
              <option value="pto">PTO</option>
            </select>
            <button
              className="toolbar-btn"
              onClick={importClipboard}
              disabled={currentBilanLocked}
              title="Coller depuis Excel (Code, Libellé, Variation, Dépenses, Avancement, RàF, Obs.)"
            >
              ⎘ Coller Excel
            </button>
          </div>
        </div>
      </div>

      {/* ══ CONTENT AREA ══ */}
      <div className="flex" style={{ height: "calc(100vh - var(--toolbar-height, 132px))" }}>
        <div
          ref={sheetViewportRef}
          className="relative flex-1 overflow-auto"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#F5F1E8",
          }}
        >
          <div
            ref={sheetContentRef}
            data-fit-width="1330"
            style={{ zoom: scale, padding: 18, width: "fit-content" } as CSSProperties}
          >
            <B2PTable
              projet={project}
              bilan={bilan}
              previousBilan={previousBilan}
              onChangeLigne={onChangeLigne}
              showFormulas={showFormulas}
              readOnly={currentBilanLocked}
              filterMode={filterMode}
              query={lineQuery}
            />
            {/* §2.1 (NT.26.007) — Bas du tableau : logo FGF officiel (bleu, texte blanc). */}
            <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-black tracking-wide"
                  style={{ background: "#1F4E79", color: "#FFFFFF" }}
                  title="Méthode FGF de Coûtenance"
                >
                  FGF
                </span>
                <span>Méthode FGF de Coûtenance — CheetahCost</span>
              </span>
              <span className="flex items-center gap-2">
                <span>Recherche · Conseil · Formation en Management de Projet</span>
                <span
                  className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-black tracking-wide"
                  style={{ background: "#1F4E79", color: "#FFFFFF" }}
                  title="Méthode FGF de Coûtenance"
                >
                  FGF
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ─ Right Panel ─ */}
        {rightPanelOpen ? (
          // §2.3 (NT.26.007) — Le panneau doit pouvoir se scroller en entier.
          // On force height: 100% sur le wrapper ET sur le conteneur scrollable
          // pour que `overflow-y-auto` se déclenche au lieu de couper le bas.
          <div className="relative hidden lg:block" style={{ height: "100%" }}>
            {/* Resize handle */}
            <div
              onMouseDown={() => { resizingRef.current = true; }}
              title="Glisser pour redimensionner"
              className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize bg-slate-200/60 hover:bg-[var(--green)]/30 transition-colors"
            />
            <div
              className="overflow-y-auto border-l border-slate-200 bg-white/95 px-4 py-4"
              style={{ width: panelW, height: "100%" }}
            >
              {/* §2.4 — Bouton Fermer en haut du panneau (au lieu du masquer/montrer implicite). */}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[12px] font-bold text-slate-800">Panneau {getBilanLabel(bilan)}</div>
                <button
                  className="toolbar-btn"
                  onClick={() => setRightPanelOpen(false)}
                  title="Fermer le panneau"
                  style={{ height: 26, paddingLeft: 10, paddingRight: 10 }}
                >
                  Fermer ×
                </button>
              </div>

              {/* FGF guide — §3.2 : panneau B2Pi-2j affiche « Avancement physique » et place Vc à gauche de E.
                  §2.4 : ajout de la définition de D = Dérive E − Eprécédent. */}
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-bold text-slate-700">Saisie FGF</div>
                <ul className="space-y-1.5 text-[11px] text-slate-600">
                  {[
                    ["Variation", "Avenants / ajustements cumulés"],
                    ["Dépenses", "Réalisé cumulé à date"],
                    ["Avancement physique", "% entier (0–100)"],
                    ["RàF", "Coût des travaux Restant à Faire"],
                    ["CP", currentKind === "b2p0" ? "= BàD au B2P0 (référence initiale)" : "Dépenses + RàF (calculé)"],
                    ["Vc", "Variance coût = Dépenses − Valeur Acquise"],
                    ["E", currentKind === "b2p0" ? "= 0 au B2P0 (CP = BàD)" : "Écart final = CP − BàD"],
                    ["D", "Dérive = E − Eprécédent"],
                  ].map(([k, v]) => (
                    <li key={k} className="flex gap-1.5">
                      <span className="w-28 flex-shrink-0 font-semibold text-slate-700">{k}</span>
                      <span className="text-slate-500">{v}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px]">
                  Unité : <span className="font-bold text-slate-800">{unitLabel}</span>
                </div>
                {currentKind === "b2p0" ? (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] text-blue-800">
                    B2P0 — référence initiale : CP = BàD et E = 0 par définition.
                  </div>
                ) : currentKind === "i-2j" || currentKind === "i-2" ? (
                  <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-800">
                    Scénario B2Pi-2 : seul RàF est modifiable (Dépenses et Avancement physique restent ceux du B2Pi-1).
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-600">
                    PTO — Ni dépenses, ni avancement physique
                  </div>
                )}
              </div>

              {/* B2P actions in panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-[11px] font-bold text-slate-700">Actions B2P</div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="toolbar-btn toolbar-btn-primary" onClick={createNextI1}>
                    + Nouveau i-1
                  </button>
                  <button className="toolbar-btn toolbar-btn-warning" onClick={createI2J} disabled={!canCreateScenario}>
                    + Nouveau i-2j
                  </button>
                  <button className="toolbar-btn" onClick={promoteToI2} disabled={currentKind !== "i-2j"}>
                    Retenir i-2
                  </button>
                </div>
              </div>

              {/* Summary metrics in panel
                 §2.1/§2.4 : Au B2P0, CP = BàD et E = 0.
                 §3.2 : Panneau B2Pi-2 : afficher « Avancement physique » au lieu de « VA »,
                        placer Vc à GAUCHE et E à DROITE. */}
              {summary && (() => {
                const isBaseline = currentKind === "b2p0";
                const showAdvancement = currentKind === "i-2" || currentKind === "i-2j";
                const displayCPT = isBaseline ? summary.totalBudgetADate : summary.totalCPT;
                const displayE  = isBaseline ? 0 : summary.totalEcartFinal;
                const displayVc = isBaseline ? 0 : summary.totalVarianceCout;
                return (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-[11px] font-bold text-slate-700">Métriques</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "BàD", value: summary.totalBudgetADate },
                        { label: "Dépenses", value: isBaseline ? 0 : summary.totalDepenses },
                        showAdvancement
                          ? { label: "Avancement physique", value: Math.round((summary.avancementPhysiqueProjet ?? 0) * 100), suffix: " %", isPct: true }
                          : { label: "VA", value: isBaseline ? 0 : summary.totalValeurAcquise },
                        { label: "CP", value: displayCPT },
                      ].map(({ label, value, suffix, isPct }) => (
                        <div key={label} className="rounded-lg bg-slate-50 px-2 py-1.5">
                          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
                          <div className="mt-0.5 text-[11px] font-bold tabular-nums text-slate-800">
                            {isPct ? `${value}${suffix ?? ""}` : formatMoneyLike(value, unitLabel)}
                          </div>
                        </div>
                      ))}
                      {/* Vc à gauche, E à droite (§3.2) */}
                      <div className={`rounded-lg px-2 py-1.5 ${displayVc > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Vc</div>
                        <div className={`mt-0.5 text-[12px] font-black tabular-nums ${displayVc > 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {formatMoneyLike(displayVc, unitLabel)}
                        </div>
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${displayE > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">E (Écart)</div>
                        <div className={`mt-0.5 text-[12px] font-black tabular-nums ${displayE > 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {formatMoneyLike(displayE, unitLabel)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}
      </div>

      {/* ══ CHART PANEL (floating) ══ */}
      {chartOpen ? (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/25" onMouseDown={() => setChartOpen(false)} />
          <div
            className="absolute overflow-hidden rounded-2xl border border-black/12 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.30)]"
            style={{ left: chartX, top: chartY, width: chartW, height: chartH }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Chart header */}
            <div
              className="flex cursor-move items-center justify-between border-b border-slate-100 px-4 py-2.5"
              style={{ background: "linear-gradient(135deg, #F5F1E8 0%, #faf8f4 100%)" }}
              onMouseDown={(e) => {
                chartDragRef.current = true;
                dragStartRef.current = { mx: e.clientX, my: e.clientY, x: chartX, y: chartY };
              }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-black" style={{ background: "#56a45b", color: "#fff" }}>
                  FGF
                </span>
                <span className="text-[12px] font-semibold text-slate-700">Courbes en S — {getBilanLabel(bilan)}</span>
              </div>
              <button
                className="toolbar-btn"
                onClick={() => setChartOpen(false)}
              >
                Fermer ×
              </button>
            </div>
            <div className="h-[calc(100%-44px)] w-full p-3">
              <ProjectEcartChart projet={project} activeBilanId={bilan.id} />
            </div>
            {/* Resize handle */}
            <div
              className="absolute bottom-1.5 right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border border-slate-200 bg-white/80 transition hover:bg-slate-100"
              title="Redimensionner"
              onMouseDown={(e) => {
                e.stopPropagation();
                chartResizeRef.current = true;
                resizeStartRef.current = { mx: e.clientX, my: e.clientY, w: chartW, h: chartH };
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
