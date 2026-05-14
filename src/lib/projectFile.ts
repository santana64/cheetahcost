"use client";

import { appendAuditEvent, appendProjectVersion, createAuditEvent } from "@/lib/audit";
import { normalizeProjectData } from "@/lib/storage";
import type { Projet } from "@/types/projet";

export const PROJECT_FILE_SCHEMA_VERSION = "1.0.0";
export const PROJECT_FILE_EXTENSION = ".cheetahcost.json";

export type CheetahCostProjectFile = {
  app: "CheetahCost";
  schemaVersion: typeof PROJECT_FILE_SCHEMA_VERSION;
  exportedAt: string;
  project: Projet;
};

type FilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (contents: Blob | string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

function slug(value: string) {
  return String(value || "projet")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function downloadBlob(filename: string, text: string) {
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

export function buildProjectFile(project: Projet): CheetahCostProjectFile {
  const exported = appendProjectVersion(
    appendAuditEvent(project, createAuditEvent("export_created", "Fichier projet JSON sauvegardé")),
    "Sauvegarde JSON",
  );

  return {
    app: "CheetahCost",
    schemaVersion: PROJECT_FILE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: normalizeProjectData(exported),
  };
}

export function stringifyProjectFile(project: Projet): string {
  return `${JSON.stringify(buildProjectFile(project), null, 2)}\n`;
}

export function parseProjectFile(text: string): Projet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Fichier JSON illisible.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Fichier projet invalide.");
  const record = parsed as Record<string, unknown>;

  if (record.app === "CheetahCost" && record.project) {
    return normalizeProjectData(record.project);
  }

  if (record.id && record.nom && record.lots && record.bilans) {
    return normalizeProjectData(record);
  }

  throw new Error("Ce fichier n’est pas un projet CheetahCost.");
}

export async function readProjectFromFile(file: File): Promise<Projet> {
  return parseProjectFile(await file.text());
}

export async function saveProjectFile(project: Projet): Promise<Projet> {
  const payload = stringifyProjectFile(project);
  const exportedProject = parseProjectFile(payload);
  const filename = `${slug(project.nom)}${PROJECT_FILE_EXTENSION}`;
  const pickerWindow = window as FilePickerWindow;

  if (pickerWindow.showSaveFilePicker) {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: "Projet CheetahCost",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(payload);
    await writable.close();
  } else {
    downloadBlob(filename, payload);
  }

  return exportedProject;
}

export function downloadProjectFile(project: Projet): Projet {
  const payload = stringifyProjectFile(project);
  const exportedProject = parseProjectFile(payload);
  downloadBlob(`${slug(project.nom)}${PROJECT_FILE_EXTENSION}`, payload);
  return exportedProject;
}
