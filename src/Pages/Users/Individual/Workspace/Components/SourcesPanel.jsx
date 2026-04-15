import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent } from "@/Components/ui/dialog";
import HomeButton from "@/Components/ui/HomeButton";
import { Input } from "@/Components/ui/input";
import { renameMaterial } from "@/api/MaterialAPI";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import SourceDetailView from "./SourceDetailView";
import {
  Check,
  FileText,
  Image,
  Link2,
  PencilLine,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

function formatFileType(type) {
  if (!type) return "FILE";
  const lower = String(type).toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("doc")) return "DOCX";
  if (lower.includes("sheet") || lower.includes("excel")) return "XLSX";
  if (lower.includes("ppt")) return "PPTX";
  if (lower.includes("image")) return "IMAGE";
  if (lower === "url") return "URL";
  return "FILE";
}

function getSourceIcon(type) {
  const lower = String(type || "").toLowerCase();
  if (lower.includes("image")) return Image;
  if (lower === "url") return Link2;
  return FileText;
}

function canOpenSourceDetail(source) {
  const status = String(source?.status || "").toUpperCase();
  return !["PROCESSING", "UPLOADING", "PENDING", "QUEUED", "ERROR"].includes(
    status,
  );
}

function canSelectSource(source) {
  const status = String(source?.status || "").toUpperCase();
  return !["REJECT", "REJECTED", "WARN", "WARNED", "ERROR", "PROCESSING", "UPLOADING", "PENDING", "QUEUED"].includes(
    status,
  );
}

function canDeleteSource(source) {
  const status = String(source?.status || "").toUpperCase();
  return !["PROCESSING", "UPLOADING", "PENDING", "QUEUED"].includes(status);
}

function isWarnSource(source) {
  const status = String(source?.status || "").toUpperCase();
  return ["WARN", "WARNED"].includes(status);
}

function getSourceStatusTone(status, isDarkMode = false) {
  const normalizedStatus = String(status || "ACTIVE").toUpperCase();

  if (normalizedStatus === "ACTIVE") {
    return isDarkMode
      ? "border border-emerald-700/60 bg-emerald-950/35 text-emerald-200"
      : "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["PROCESSING", "UPLOADING", "PENDING", "QUEUED"].includes(normalizedStatus)) {
    return isDarkMode
      ? "border border-amber-700/60 bg-amber-950/35 text-amber-200"
      : "border border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["ERROR", "REJECT", "REJECTED", "WARN", "WARNED"].includes(normalizedStatus)) {
    return isDarkMode
      ? "border border-rose-700/60 bg-rose-950/35 text-rose-200"
      : "border border-rose-200 bg-rose-50 text-rose-700";
  }

  return isDarkMode
    ? "border border-slate-700 bg-slate-900 text-slate-300"
    : "border border-slate-200 bg-slate-100 text-slate-600";
}

function getSourceStatusLabel(status, t) {
  const normalizedStatus = String(status || "ACTIVE").toUpperCase();
  return t(`workspace.quiz.statusLabels.${normalizedStatus}`, normalizedStatus);
}

function splitNameExt(name) {
  if (!name) return ["", ""];
  const matched = String(name).match(/^(.*?)(\.[^.]+)$/);
  if (matched) return [matched[1], matched[2]];
  return [String(name), ""];
}

function SourcesPanel({
  isDarkMode = false,
  sources = [],
  onAddSource,
  onRemoveSource,
  onRemoveMultiple,
  onShareSource,
  onSourceUpdated,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  onDetailViewChange,
  forceCloseDetail = false,
}) {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [search, setSearch] = useState("");
  const [internalSelectedIds, setInternalSelectedIds] = useState([]);
  const [viewingSource, setViewingSource] = useState(null);
  const [renameDialog, setRenameDialog] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const selectedIds =
    controlledSelectedIds !== undefined
      ? controlledSelectedIds
      : internalSelectedIds;
  const toolbarButtonClass = cn(
    "h-11 rounded-full border px-4 transition-colors duration-200 ease-out",
    isDarkMode
      ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  );
  const actionButtonClass = cn(
    "h-10 rounded-full border px-4 transition-colors duration-200 ease-out",
    isDarkMode
      ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  );
  const iconButtonClass = cn(
    "h-10 w-10 rounded-full border transition-colors duration-200 ease-out",
    isDarkMode
      ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  );

  const filteredSources = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return sources;
    return sources.filter((source) =>
      String(source?.name || source?.title || "")
        .toLowerCase()
        .includes(query),
    );
  }, [deferredSearch, sources]);

  useEffect(() => {
    onDetailViewChange?.(Boolean(viewingSource));
    return () => onDetailViewChange?.(false);
  }, [onDetailViewChange, viewingSource]);

  useEffect(() => {
    if (forceCloseDetail) {
      setViewingSource(null);
    }
  }, [forceCloseDetail]);

  const setSelected = (nextValue) => {
    if (typeof onSelectionChange === "function") {
      onSelectionChange(nextValue);
      return;
    }
    setInternalSelectedIds(nextValue);
  };

  const toggleSelection = (sourceId) => {
    setSelected(
      selectedIds.includes(sourceId)
        ? selectedIds.filter((id) => id !== sourceId)
        : [...selectedIds, sourceId],
    );
  };

  const selectAll = () => {
    const nextIds = filteredSources
      .filter(canSelectSource)
      .map((source) => Number(source?.id ?? source?.materialId))
      .filter((id) => Number.isInteger(id) && id > 0);
    setSelected(nextIds);
  };

  const clearSelection = () => setSelected([]);

  const openRenameDialog = (source) => {
    const [baseName, ext] = splitNameExt(source?.name || source?.title || "");
    setRenameDialog({
      id: Number(source?.id ?? source?.materialId),
      extension: ext,
    });
    setRenameInput(baseName);
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog?.id || !renameInput.trim()) return;
    setRenameLoading(true);
    try {
      const finalName = `${renameInput.trim()}${renameDialog.extension || ""}`;
      const response = await renameMaterial(renameDialog.id, finalName);
      const payload = response?.data || response || {};
      onSourceUpdated?.({
        ...payload,
        id: payload?.materialId ?? renameDialog.id,
        name: payload?.title ?? finalName,
      });
      showSuccess(t("workspace.sources.renameSuccess"));
      setRenameDialog(null);
    } catch {
      showError(t("workspace.sources.loadError"));
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    await onRemoveSource?.(deleteDialog.id);
    setSelected(selectedIds.filter((id) => id !== deleteDialog.id));
    setDeleteDialog(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (onRemoveMultiple) {
      await onRemoveMultiple(selectedIds);
    } else {
      await Promise.all(selectedIds.map((id) => onRemoveSource?.(id)));
    }
    clearSelection();
  };

  return (
    <section
      className={cn(
        "h-full overflow-y-auto px-6 pb-8 pt-6 transition-colors duration-200",
        isDarkMode ? "text-slate-100" : "text-slate-900",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 border-b pb-5 transition-colors duration-200",
          isDarkMode ? "border-slate-700/80" : "border-slate-200",
        )}
      >
        <HomeButton
          size="sm"
          rounded
          className={cn(
            "h-11 px-4 transition-colors duration-200 ease-out",
            isDarkMode
              ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        />
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "truncate text-2xl font-semibold",
              isDarkMode ? "text-slate-100" : "text-slate-900",
              fontClass,
            )}
          >
            {t("workspace.shell.sourcesHeadline", "Source library for this workspace")}
          </h2>
          <p className={cn("mt-1 text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
            {t(
              "workspace.shell.sourcesHint",
              "Search, preview, select, and curate the exact materials that power roadmap, quiz, and flashcard generation.",
            )}
          </p>
        </div>

        <Button
          type="button"
          onClick={onAddSource}
          className={cn(
            "h-11 rounded-full px-5 transition-colors duration-200 ease-out",
            isDarkMode
              ? "bg-slate-100 text-slate-900 hover:bg-white"
              : "bg-slate-900 text-white hover:bg-slate-800",
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("workspace.shell.addSource", "Add source")}
        </Button>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-3 border-b py-4 transition-colors duration-200",
          isDarkMode ? "border-slate-700/80" : "border-slate-200",
        )}
      >
        <div
          className={cn(
            "flex min-w-[280px] flex-1 items-center gap-3 rounded-full border px-4 transition-colors duration-200",
            isDarkMode
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white",
          )}
        >
          <Search className={cn("h-4 w-4", isDarkMode ? "text-slate-500" : "text-slate-400")} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("workspace.sources.searchPlaceholder", "Search sources...")}
            className={cn(
              "border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
              isDarkMode
                ? "text-slate-100 placeholder:text-slate-500"
                : "text-slate-900 placeholder:text-slate-400",
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={toolbarButtonClass}
            onClick={selectAll}
          >
            {t("workspace.sources.selectAll")}
          </Button>

          {selectedIds.length > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                className={toolbarButtonClass}
                onClick={clearSelection}
              >
                <X className="mr-2 h-4 w-4" />
                {t("workspace.shell.clearSelection", "Clear")}
              </Button>

              <Button
                type="button"
                variant="outline"
                className={toolbarButtonClass}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("workspace.shell.deleteSelected", "Delete selected")}
              </Button>

              {typeof onShareSource === "function" ? (
                <Button
                  type="button"
                  variant="outline"
                  className={toolbarButtonClass}
                  onClick={() => onShareSource?.(selectedIds)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {t("workspace.shell.shareSelected", "Share selected")}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "py-3 text-xs font-semibold uppercase tracking-[0.18em]",
          isDarkMode ? "text-slate-500" : "text-slate-400",
        )}
      >
        {selectedIds.length > 0
          ? `${selectedIds.length} ${t("workspace.shell.selectedBadge", "Selected")}`
          : t("workspace.sources.title", "Sources")}
      </div>

      {filteredSources.length > 0 ? (
        <div className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-200")}>
          {filteredSources.map((source, index) => {
            const sourceId = Number(source?.id ?? source?.materialId);
            const isSelected =
              Number.isInteger(sourceId) && selectedIds.includes(sourceId);
            const isSelectable =
              Number.isInteger(sourceId) && canSelectSource(source);
            const Icon = getSourceIcon(source?.type ?? source?.materialType);

            return (
              <article
                key={source?.id ?? source?.materialId ?? `source:${index}`}
                className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => isSelectable && toggleSelection(sourceId)}
                    className={cn(
                      "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ease-out",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isDarkMode
                          ? "border-slate-700 bg-slate-900 text-slate-500"
                          : "border-slate-300 bg-white text-slate-400",
                    )}
                    aria-label={
                      isSelected
                        ? t("workspace.shell.unselectSource", "Unselect source")
                        : t("workspace.shell.selectSource", "Select source")
                    }
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>

                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-200",
                      isDarkMode
                        ? "border-slate-700 bg-slate-900 text-slate-300"
                        : "border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "truncate text-base font-semibold",
                          isDarkMode ? "text-slate-100" : "text-slate-900",
                          fontClass,
                        )}
                      >
                        {source?.name ||
                          source?.title ||
                          t("workspace.shell.untitledSource", "Untitled source")}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200",
                          isDarkMode
                            ? "border-slate-700 bg-slate-900 text-slate-300"
                            : "border-slate-200 bg-slate-100 text-slate-600",
                        )}
                      >
                        {formatFileType(source?.type ?? source?.materialType)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSourceStatusTone(source?.status, isDarkMode)}`}
                      >
                        {getSourceStatusLabel(source?.status, t)}
                      </span>
                    </div>
                    <p className={cn("mt-2 line-clamp-2 text-sm", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                      {source?.description ||
                        source?.summary ||
                        t(
                          "workspace.shell.sourceFallbackSummary",
                          "Use this source as context for roadmap, quiz, and flashcard generation.",
                        )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      actionButtonClass,
                      isWarnSource(source)
                        ? isDarkMode
                          ? "border-amber-600/70 bg-amber-950/40 text-amber-200 hover:bg-amber-900/40 hover:text-amber-100"
                          : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : null,
                    )}
                    onClick={() =>
                      canOpenSourceDetail(source) && setViewingSource(source)
                    }
                    disabled={!canOpenSourceDetail(source)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isWarnSource(source)
                      ? t("workspace.shell.warningSource", "Cảnh báo")
                      : t("workspace.shell.previewSource", "Preview")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={iconButtonClass}
                    onClick={() => openRenameDialog(source)}
                    aria-label={t("workspace.sources.menuRename")}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>

                  {typeof onShareSource === "function" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={iconButtonClass}
                      onClick={() => onShareSource?.(source)}
                      aria-label={t("workspace.shell.shareSource", "Share source")}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={iconButtonClass}
                    aria-label={t("workspace.shell.deleteSourceTitle", "Delete source")}
                    disabled={!canDeleteSource(source)}
                    onClick={() =>
                      setDeleteDialog({
                        id: sourceId,
                        name: source?.name || source?.title,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
          <FileText className={cn("mb-3 h-12 w-12", isDarkMode ? "text-slate-600" : "text-slate-300")} />
          <p className={cn("text-base font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900", fontClass)}>
            {t("workspace.shell.noSourcesFound", "No sources match this filter")}
          </p>
          <p className={cn("mt-2 text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
            {t(
              "workspace.shell.noSourcesFoundHint",
              "Try another keyword or upload a new document.",
            )}
          </p>
        </div>
      )}

      <Dialog
        open={Boolean(viewingSource)}
        onOpenChange={(open) => {
          if (!open) setViewingSource(null);
        }}
      >
        <DialogContent className="h-[88vh] max-w-5xl overflow-hidden p-0">
          {viewingSource ? (
            <SourceDetailView
              isDarkMode={isDarkMode}
              source={viewingSource}
              onBack={() => setViewingSource(null)}
              onSourceUpdated={onSourceUpdated}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renameDialog)}
        onOpenChange={(open) => {
          if (!open) setRenameDialog(null);
        }}
      >
        <DialogContent
          className={
            isDarkMode
              ? "border-white/10 bg-slate-950 text-slate-100"
              : "bg-white"
          }
        >
          <div className="space-y-4">
            <div>
              <p className={`text-lg font-semibold ${fontClass}`}>
                {t("workspace.sources.menuRename")}
              </p>
              <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {t("workspace.shell.renameHint", "Update the source name shown across the workspace.")}
              </p>
            </div>
            <Input
              value={renameInput}
              onChange={(event) => setRenameInput(event.target.value)}
              placeholder={t("workspace.shell.renamePlaceholder", "New source name")}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenameDialog(null)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleRenameSubmit}
                disabled={renameLoading || !renameInput.trim()}
              >
                {renameLoading
                  ? t("common.saving", "Saving...")
                  : t("workspace.sources.saveBtn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <DialogContent
          className={
            isDarkMode
              ? "border-white/10 bg-slate-950 text-slate-100"
              : "bg-white"
          }
        >
          <div className="space-y-4">
            <div>
              <p className={`text-lg font-semibold ${fontClass}`}>
                {t("workspace.shell.deleteSourceTitle", "Delete source")}
              </p>
              <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {deleteDialog?.name
                  ? t("workspace.shell.deleteSourceHint", "Remove {{name}} from this workspace.", {
                      name: deleteDialog.name,
                      defaultValue: `Remove ${deleteDialog.name} from this workspace.`,
                    })
                  : t("workspace.shell.deleteSourceHintFallback", "Remove this source from the workspace.")}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteDialog(null)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete}>
                {t("common.delete", "Delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default SourcesPanel;
