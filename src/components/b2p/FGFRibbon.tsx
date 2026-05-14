"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaSave, FaFolderOpen, FaFileExport, FaFileImport } from "react-icons/fa";

type TabKey = "Fichier" | "Projet" | "LB" | "B2P" | "CenS" | "RiP" | "Aide";

type Props = {
  activeTab: TabKey;
  onTabChange: (t: TabKey) => void;

  // actions
  onSave: () => void;
  onSaveAs: () => void;
  onLoad: (file: File) => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;

  formulasEnabled: boolean;
  onToggleFormulas: () => void;

  fileName?: string;
  licenseLabel?: string;
};

export function FGFRibbon({
  activeTab,
  onTabChange,
  onSave,
  onSaveAs,
  onLoad,
  onExportJSON,
  onImportJSON,
  formulasEnabled,
  onToggleFormulas,
  fileName = "Nom du fichier",
  licenseLabel = "Titulaire licence",
}: Props) {
  const tabs: TabKey[] = ["Fichier", "Projet", "LB", "B2P", "CenS", "RiP", "Aide"];

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const loadInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // ferme le menu si clic hors menu
      if (!target.closest("[data-fgf-filemenu-root]")) setFileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const tabBtn = (t: TabKey) => {
    const isActive = activeTab === t;
    return (
      <button
        key={t}
        type="button"
        onClick={() => onTabChange(t)}
        className={[
          "relative px-3 py-2 text-[12px] font-semibold",
          "hover:bg-black/10",
          isActive ? "bg-black/10" : "",
        ].join(" ")}
      >
        {t}
      </button>
    );
  };

  const renderFileMenu = () => (
    <div
      data-fgf-filemenu-root
      className="relative"
    >
      <button
        type="button"
        onClick={() => setFileMenuOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-[12px] font-semibold hover:bg-black/10"
      >
        Fichier <FaChevronDown className="opacity-70" />
      </button>

      {fileMenuOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[280px] overflow-hidden rounded-md border border-black/30 bg-white shadow-lg">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-600">Fichier</div>

          <button
            type="button"
            onClick={() => {
              setFileMenuOpen(false);
              onSave();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-100"
          >
            <FaSave /> Enregistrer
            <span className="ml-auto text-[11px] text-slate-500">Ctrl+S</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFileMenuOpen(false);
              onSaveAs();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-100"
          >
            <FaSave /> Enregistrer sous…
          </button>

          <div className="my-1 h-px bg-slate-200" />

          <button
            type="button"
            onClick={() => loadInputRef.current?.click()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-100"
          >
            <FaFolderOpen /> Charger…
          </button>
          <input
            ref={loadInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setFileMenuOpen(false);
              onLoad(f);
            }}
          />

          <div className="my-1 h-px bg-slate-200" />

          <button
            type="button"
            onClick={() => {
              setFileMenuOpen(false);
              onExportJSON();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-100"
          >
            <FaFileExport /> Exporter (JSON)
          </button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-100"
          >
            <FaFileImport /> Importer (JSON)
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setFileMenuOpen(false);
              onImportJSON(f);
            }}
          />

          <div className="my-1 h-px bg-slate-200" />

          <button
            type="button"
            onClick={() => {
              setFileMenuOpen(false);
              onToggleFormulas();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-100"
          >
            <span
              className={[
                "inline-flex h-4 w-8 items-center rounded-full border border-slate-300 px-0.5",
                formulasEnabled ? "bg-emerald-500/30" : "bg-slate-200",
              ].join(" ")}
            >
              <span
                className={[
                  "h-3 w-3 rounded-full bg-white shadow-sm transition",
                  formulasEnabled ? "translate-x-4" : "translate-x-0",
                ].join(" ")}
              />
            </span>
            Activer les formules
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="select-none">
      {/* Bandeau vert (titre/infos) */}
      <div className="flex items-center justify-between gap-3 bg-[#00B050] px-3 py-2 text-black">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-sm bg-black/10 px-2 py-1 text-[12px] font-semibold hover:bg-black/15"
            title="Enregistrer"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onToggleFormulas}
            className="rounded-sm bg-black/10 px-2 py-1 text-[12px] font-semibold hover:bg-black/15"
          >
            {formulasEnabled ? "Désactiver les formules" : "Activer les formules"}
          </button>
        </div>

        <div className="text-[12px] font-semibold">{fileName}</div>

        <div className="text-[12px] font-semibold">{licenseLabel}</div>
      </div>

      {/* Bandeau orange (onglets) */}
      <div className="flex items-stretch bg-[#F4A321] text-black">
        {renderFileMenu()}

        {/* Autres onglets */}
        <div className="flex">
          {tabs
            .filter((t) => t !== "Fichier")
            .map(tabBtn)}
        </div>

        <div className="ml-auto flex items-center gap-2 px-3 text-[11px] font-semibold opacity-80">
          {activeTab}
        </div>
      </div>
    </div>
  );
}
