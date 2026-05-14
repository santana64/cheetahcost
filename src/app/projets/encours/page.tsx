"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiActivity, FiAlertTriangle, FiCalendar, FiChevronRight, FiPlus } from "react-icons/fi";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { formatDateFR } from "@/lib/dates";
import { getCostUnitLabel, isProjectInProgress } from "@/lib/projectLabels";
import { getProjectDecisionSummary } from "@/lib/projectHealth";
import { loadProjects } from "@/lib/storage";
import type { Projet } from "@/types/projet";

export default function ProjectsEnCoursPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Projet[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setProjects(loadProjects());
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const enCours = useMemo(
    () =>
      [...projects]
        .filter(isProjectInProgress)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects],
  );

  if (!ready) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--green)]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-5 py-5">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold text-[var(--text)]">Projets en cours</h1>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {enCours.length} projet{enCours.length !== 1 ? "s" : ""} actif{enCours.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button size="sm" iconLeft={<FiPlus size={12} />} onClick={() => router.push("/projets/nouveau")}>
            Nouveau projet
          </Button>
        </div>

        {enCours.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FiActivity size={20} className="text-slate-400" />
            </div>
            <p className="text-[13px] font-semibold text-slate-700">Aucun projet en cours</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">Créez votre premier projet pour commencer.</p>
            <div className="mt-4 flex justify-center">
              <Button size="sm" iconLeft={<FiPlus size={12} />} onClick={() => router.push("/projets/nouveau")}>
                Nouveau projet
              </Button>
            </div>
          </div>
        ) : (
          <div className="panel-solid overflow-hidden rounded-2xl">
            <div className="divide-y divide-slate-100">
              {enCours.map((project) => {
                const summary = getProjectDecisionSummary(project);
                const unit = getCostUnitLabel(project);
                const isCritical = summary.status === "critical";
                const isWatch = summary.status === "watch";

                return (
                  <div
                    key={project.id}
                    className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50"
                    onClick={() => router.push(`/projets/${project.id}`)}
                  >
                    {/* Status dot */}
                    <div
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        isCritical ? "bg-red-500" : isWatch ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-900">{project.nom}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${summary.statusClass}`}
                        >
                          {isCritical && <FiAlertTriangle size={9} />}
                          {summary.statusLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                        <span>{unit}</span>
                        <span className="opacity-40">·</span>
                        <FiCalendar size={9} className="inline" />
                        <span>
                          {formatDateFR(project.dateDebut)} → {formatDateFR(project.dateFin)}
                        </span>
                        <span className="opacity-40">·</span>
                        <span>{summary.createdBilans} B2P</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <FiChevronRight
                      size={14}
                      className="flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
                    />
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
