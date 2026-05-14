"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiChevronRight, FiFolder, FiSearch, FiUpload, FiPlus, FiAlertTriangle, FiPackage } from "react-icons/fi";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDateFR } from "@/lib/dates";
import { createDemoProject } from "@/lib/demo";
import { formatMoneyLike, getCostUnitLabel } from "@/lib/projectLabels";
import { readProjectFromFile } from "@/lib/projectFile";
import { getProjectDecisionSummary } from "@/lib/projectHealth";
import { loadProjects, upsertProject } from "@/lib/storage";
import type { Projet } from "@/types/projet";

function safeLower(value: string) {
  return (value ?? "").toLowerCase();
}

export default function ProjectsListPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<Projet[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setProjects(loadProjects());
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = safeLower(query.trim());
    const sorted = [...projects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (!q) return sorted;
    return sorted.filter((p) =>
      safeLower(
        [p.nom, p.status, p.monnaie, p.dateDebut, p.dateFin, p.typeCout,
         getCostUnitLabel(p), formatDateFR(p.dateDebut), formatDateFR(p.dateFin)].join(" "),
      ).includes(q),
    );
  }, [projects, query]);

  const loadDemo = () => {
    const demo = createDemoProject();
    upsertProject(demo);
    setProjects(loadProjects());
    pushToast("success", "Projet de démo chargé.");
    router.push(`/projets/${demo.id}`);
  };

  const openJsonFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const project = await readProjectFromFile(file);
      upsertProject(project);
      setProjects(loadProjects());
      pushToast("success", "Projet JSON ouvert.");
      router.push(`/projets/${project.id}`);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Fichier projet invalide.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-5 py-5">

        {/* ── Header ── */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold text-[var(--text)]">Tous les projets</h1>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {projects.length} projet{projects.length !== 1 ? "s" : ""} enregistré{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>
              Tableau de bord
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<FiUpload size={12} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Ouvrir JSON
            </Button>
            <Button
              size="sm"
              iconLeft={<FiPlus size={12} />}
              onClick={() => router.push("/projets/nouveau")}
            >
              Nouveau projet
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".cheetahcost.json,.json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void openJsonFile(file);
              }}
            />
          </div>
        </div>

        {/* ── Search ── */}
        <div className="mb-4 panel flex items-center gap-2.5 rounded-xl px-3 py-2">
          <FiSearch size={13} className="flex-shrink-0 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, statut, monnaie, dates…"
            className="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
            >
              ×
            </button>
          )}
          <span className="flex-shrink-0 text-[11px] text-[var(--muted)]">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FiFolder size={20} className="text-slate-400" />
            </div>
            <p className="text-[13px] font-semibold text-slate-700">
              {query ? "Aucun projet trouvé" : "Aucun projet enregistré"}
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              {query
                ? "Modifie ta recherche ou efface le filtre."
                : "Crée ton premier projet ou ouvre un fichier JSON."}
            </p>
            {!query && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<FiPackage size={12} />}
                  onClick={loadDemo}
                >
                  Charger projet de démo
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<FiUpload size={12} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Ouvrir JSON
                </Button>
                <Button
                  size="sm"
                  iconLeft={<FiPlus size={12} />}
                  onClick={() => router.push("/projets/nouveau")}
                >
                  Nouveau projet
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="panel-solid overflow-hidden rounded-2xl">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_170px_130px_44px] items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
              <div className="section-label">Projet</div>
              <div className="section-label">Statut décisionnel</div>
              <div className="section-label">Dates</div>
              <div className="section-label text-right">Écart</div>
              <div />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {filtered.map((project) => {
                const summary = getProjectDecisionSummary(project);
                const unit = getCostUnitLabel(project);
                const isCritical = summary.status === "critical";
                const isWatch = summary.status === "watch";
                const ecartPositive = summary.totalEcart > 0;

                return (
                  <div
                    key={project.id}
                    className="group grid grid-cols-[1fr_140px_170px_130px_44px] cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80"
                    onClick={() => router.push(`/projets/${project.id}`)}
                  >
                    {/* Project name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            isCritical ? "bg-red-500" : isWatch ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                        <span className="truncate text-[13px] font-semibold text-slate-900">
                          {project.nom}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 pl-3.5 text-[11px] text-[var(--muted)]">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">
                          {project.status}
                        </span>
                        <span>·</span>
                        <span>{unit}</span>
                      </div>
                    </div>

                    {/* Decision status */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${summary.statusClass}`}
                      >
                        {isCritical && <FiAlertTriangle size={9} />}
                        {summary.statusLabel}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="text-[12px] text-slate-600">
                      {formatDateFR(project.dateDebut)}
                      <span className="mx-1 text-slate-300">→</span>
                      {formatDateFR(project.dateFin)}
                    </div>

                    {/* Ecart */}
                    <div
                      className={`text-right text-[12px] font-bold tabular-nums ${
                        ecartPositive ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {formatMoneyLike(summary.totalEcart, unit)}
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <FiChevronRight
                        size={14}
                        className="text-slate-300 transition-colors group-hover:text-slate-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
