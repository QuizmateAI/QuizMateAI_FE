import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import {
  UploadCloud,
  FileText,
  Image,
  Film,
  X,
  Loader2,
  Sparkles,
  Link2,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getSuggestedResources,
  suggestResourcesByWorkspace,
  importSuggestedResources,
} from "@/api/AIAPI";
import { useToast } from "@/context/ToastContext";

function normalizeWorkspaceId(workspaceId) {
  const id = Number(workspaceId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function extractSuggestedList(response) {
  const payload = response?.data || response || {};
  return Array.isArray(payload?.content) ? payload.content : [];
}

function getSuggestedItemIcon(item) {
  const rawText = `${item?.title || ""} ${item?.link || ""}`.toLowerCase();
  if (rawText.includes(".pdf")) return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
  if (rawText.includes(".doc") || rawText.includes(".docx")) return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
  if (rawText.includes(".png") || rawText.includes(".jpg") || rawText.includes(".jpeg")) return <Image className="w-4 h-4 text-green-500 shrink-0" />;
  if (rawText.includes(".mp4") || rawText.includes(".mov")) return <Film className="w-4 h-4 text-purple-500 shrink-0" />;
  return <Link2 className="w-4 h-4 text-blue-500 shrink-0" />;
}

function getSuggestedTypeLabel(item) {
  const rawText = `${item?.title || ""} ${item?.link || ""}`.toLowerCase();
  if (rawText.includes(".pdf")) return "PDF";
  if (rawText.includes(".doc") || rawText.includes(".docx")) return "DOCX";
  if (rawText.includes(".png") || rawText.includes(".jpg") || rawText.includes(".jpeg")) return "IMAGE";
  if (rawText.includes(".mp4") || rawText.includes(".mov")) return "VIDEO";
  return "URL";
}

function UploadSourceDialogBase({
  open,
  onOpenChange,
  isDarkMode,
  onUploadFiles,
  workspaceId,
  onSuggestedImported,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess, showInfo } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const normalizedWorkspaceId = useMemo(() => normalizeWorkspaceId(workspaceId), [workspaceId]);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [showSuggestedPanel, setShowSuggestedPanel] = useState(false);
  const [suggestedResources, setSuggestedResources] = useState([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [importingSuggestions, setImportingSuggestions] = useState(false);
  const selectedSuggestionCount = selectedSuggestionIds.length;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type?.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (file.type?.includes("image")) return <Image className="w-4 h-4 text-green-500" />;
    if (file.type?.includes("video")) return <Film className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  const loadSuggestedResources = async () => {
    if (!normalizedWorkspaceId) {
      showError(t("workspace.upload.suggestMissingWorkspace"));
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await getSuggestedResources(normalizedWorkspaceId);
      const list = extractSuggestedList(response);
      setSuggestedResources(list);
      setSelectedSuggestionIds((prev) => prev.filter((id) => list.some((item) => Number(item?.suggestionId) === Number(id))));
    } catch (error) {
      showError(error?.message || t("workspace.upload.suggestLoadError"));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!normalizedWorkspaceId) {
      showError(t("workspace.upload.suggestMissingWorkspace"));
      return;
    }

    if (suggestedResources.length >= 15) {
      return;
    }

    setGeneratingSuggestions(true);
    try {
      await suggestResourcesByWorkspace({ workspaceId: normalizedWorkspaceId });
      await loadSuggestedResources();
      showSuccess(t("workspace.upload.suggestGenerateSuccess"));
    } catch (error) {
      showError(error?.message || t("workspace.upload.suggestGenerateError"));
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleImportSuggestions = async () => {
    if (!normalizedWorkspaceId || selectedSuggestionIds.length === 0) return;

    setImportingSuggestions(true);
    try {
      await importSuggestedResources({
        workspaceId: normalizedWorkspaceId,
        suggestionIds: selectedSuggestionIds,
      });
      setSelectedSuggestionIds([]);
      await onSuggestedImported?.();
      showInfo(t("workspace.upload.suggestImportSuccess"));
      onOpenChange(false);
    } catch (error) {
      showError(error?.message || t("workspace.upload.suggestImportError"));
    } finally {
      setImportingSuggestions(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      if (selectedFiles.length > 0) {
        await onUploadFiles?.(selectedFiles);
        setSelectedFiles([]);
      }
      onOpenChange(false);
    } catch {
      // Lỗi xử lý ở component cha
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (val) => {
    if (!val) {
      setSelectedFiles([]);
      setShowSuggestedPanel(false);
      setSelectedSuggestionIds([]);
      setSuggestedResources([]);
    }
    onOpenChange(val);
  };

  const toggleSuggestion = (suggestionId) => {
    if (!Number.isInteger(suggestionId) || suggestionId <= 0) return;
    setSelectedSuggestionIds((prev) => {
      if (prev.includes(suggestionId)) {
        return prev.filter((id) => id !== suggestionId);
      }
      return [...prev, suggestionId];
    });
  };

  useEffect(() => {
    if (!open || !showSuggestedPanel) return;
    loadSuggestedResources();
  }, [open, showSuggestedPanel]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-[760px] max-h-screen overflow-y-auto overflow-x-hidden ${fontClass} ${
        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <DialogHeader>
          <DialogTitle className={fontClass}>{t("workspace.upload.title")}</DialogTitle>
          <DialogDescription className={isDarkMode ? "text-slate-400" : "text-gray-500"}>
            {t("workspace.upload.dragDrop")} / {t("workspace.upload.orBrowse")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl px-6 py-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : isDarkMode ? "border-slate-700 bg-slate-900/60 hover:border-slate-600" : "border-gray-300 bg-slate-50 hover:border-gray-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-500"}`}>
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className={`text-base font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{t("workspace.upload.dragDrop")}</p>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("workspace.upload.orBrowse")}</p>
            <p className={`text-xs mt-3 leading-5 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>{t("workspace.upload.supportedFormats")}</p>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.png,.mp3,.mp4" className="hidden" onChange={handleFileSelect} />
          </div>

          {selectedFiles.length > 0 && (
            <div className={`rounded-xl border ${isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <div className={`px-3 py-2 border-b text-xs font-medium ${isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                {selectedFiles.length} {t("workspace.sources.title", "Tài liệu")}
              </div>
              <div className="max-h-40 overflow-y-auto">
              {selectedFiles.map((file, i) => (
                <div key={`${file.name}_${i}`} className={`flex items-center justify-between px-3 py-2 text-sm ${isDarkMode ? "hover:bg-slate-900" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(file)}
                    <span className={`truncate ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{file.name}</span>
                    <span className={`text-xs shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded">
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}

          {showSuggestedPanel && (
            <div className={`rounded-2xl border p-3 ${isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h4 className={`text-sm font-semibold truncate ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    {t("workspace.upload.suggestedResourcesTitle")}
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {selectedSuggestionCount}/{suggestedResources.length}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {suggestedResources.length > 0 && suggestedResources.length < 15 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateSuggestions}
                      disabled={loadingSuggestions || generatingSuggestions || importingSuggestions}
                      className={`transition-all active:scale-95 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}
                    >
                      {generatingSuggestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      {t("workspace.upload.suggestMore")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadSuggestedResources}
                    disabled={loadingSuggestions || generatingSuggestions || importingSuggestions}
                    className={`transition-all active:scale-95 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}
                  >
                    {loadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t("workspace.upload.refreshSuggested")}
                  </Button>
                </div>
              </div>

              {loadingSuggestions ? (
                <div className="h-28 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : suggestedResources.length === 0 ? (
                <div className={`h-32 rounded-xl border flex items-center justify-center ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
                  <Button
                    type="button"
                    onClick={handleGenerateSuggestions}
                    disabled={generatingSuggestions || importingSuggestions}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white"
                  >
                    {generatingSuggestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {t("workspace.upload.getSuggestedResources")}
                  </Button>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-2 space-y-2">
                  {suggestedResources.map((item, index) => {
                    const suggestionId = Number(item?.suggestionId ?? item?.suggestId);
                    const isChecked = selectedSuggestionIds.includes(suggestionId);
                    const typeLabel = getSuggestedTypeLabel(item);
                    return (
                      <div
                        key={Number.isInteger(suggestionId) && suggestionId > 0 ? suggestionId : `${item?.link || "item"}_${index}`}
                        role="button"
                        tabIndex={0}
                        type="button"
                        onClick={() => {
                          toggleSuggestion(suggestionId);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleSuggestion(suggestionId);
                          }
                        }}
                        className={`w-full text-left rounded-xl border px-3 py-3 transition-all cursor-pointer ${
                          isDarkMode
                            ? "border-slate-800 bg-slate-950/40 hover:bg-slate-900"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="pt-0.5">{isChecked ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className={`w-4 h-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />}</div>
                          {getSuggestedItemIcon(item)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold leading-5 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                {item?.title || "Untitled"}
                              </p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}>
                                {typeLabel}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 line-clamp-2 leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                              {item?.snippet || item?.link}
                            </p>
                            <a
                              href={item?.link || "#"}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className={`mt-1.5 flex items-start gap-1 min-w-0 text-xs ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="break-all leading-4 underline-offset-2 hover:underline">{item?.link}</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedSuggestionCount > 0 && (
                <div className="pt-3">
                  <Button
                    type="button"
                    onClick={handleImportSuggestions}
                    disabled={importingSuggestions || uploading}
                    className="w-full bg-[#2563EB] hover:bg-blue-700 text-white"
                  >
                    {importingSuggestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                    {t("workspace.upload.importSuggested")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSuggestedPanel((prev) => !prev)}
            className={isDarkMode ? "border-slate-700 text-slate-300" : ""}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t("workspace.upload.suggestMore")}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
              {t("workspace.upload.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="bg-[#2563EB] hover:bg-blue-700 text-white"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {uploading ? t("workspace.upload.uploading") : t("workspace.upload.tabFile")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UploadSourceDialogBase;
