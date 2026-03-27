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
  Youtube,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getSuggestedResources,
  suggestResourcesByWorkspace,
  importSuggestedResources,
  processYoutubeResource,
} from "@/api/AIAPI";
import { useToast } from "@/context/ToastContext";

const SUGGESTED_RESOURCES_LIMIT = 5;

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
  const [processingWebLink, setProcessingWebLink] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [showWebInput, setShowWebInput] = useState(false);
  const fileInputRef = useRef(null);

  const [showSuggestedPanel, setShowSuggestedPanel] = useState(false);
  const [suggestedResources, setSuggestedResources] = useState([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [importingSuggestions, setImportingSuggestions] = useState(false);
  const selectedSuggestionCount = selectedSuggestionIds.length;
  const hasUserSelectedFiles = selectedFiles.length > 0;
  const hasSelectedSuggestedResources = selectedSuggestionCount > 0;
  const canUploadAllSources = hasUserSelectedFiles && hasSelectedSuggestedResources;

  const visibleSuggestedResources = useMemo(
    () => suggestedResources.slice(0, SUGGESTED_RESOURCES_LIMIT),
    [suggestedResources],
  );

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

  const handleAddWebUrl = async () => {
    const urls = String(webUrl || "")
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      showError(t("workspace.upload.urlRequired", "Vui lòng nhập đường dẫn trang YouTube."));
      return;
    }
    if (!normalizedWorkspaceId) {
      showError(t("workspace.upload.suggestMissingWorkspace"));
      return;
    }

    setProcessingWebLink(true);
    try {
      await Promise.all(
        urls.map((url) => processYoutubeResource({
          url,
          workspaceId: normalizedWorkspaceId,
        })),
      );
      setWebUrl("");
      setShowWebInput(false);
      await onSuggestedImported?.();
      showSuccess(t("workspace.upload.webYoutubeSuccess", "Đã gửi link để hệ thống xử lý."));
      onOpenChange(false);
    } catch (error) {
      showError(error?.message || t("workspace.upload.webYoutubeError", "Không thể xử lý link trang YouTube."));
    } finally {
      setProcessingWebLink(false);
    }
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
      const response = await getSuggestedResources(normalizedWorkspaceId, 0, SUGGESTED_RESOURCES_LIMIT);
      const list = extractSuggestedList(response).slice(0, SUGGESTED_RESOURCES_LIMIT);
      setSuggestedResources(list);
      setSelectedSuggestionIds((prev) => prev.filter((id) => list.some((item) => Number(item?.suggestionId) === Number(id))));
      return list;
    } catch (error) {
      showError(error?.message || t("workspace.upload.suggestLoadError"));
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleImportSuggestions = async ({ closeAfterImport = true } = {}) => {
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
      if (closeAfterImport) {
        onOpenChange(false);
      }
    } catch (error) {
      showError(error?.message || t("workspace.upload.suggestImportError"));
      throw error;
    } finally {
      setImportingSuggestions(false);
    }
  };

  const handleUploadUserFiles = async () => {
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

  const handleUploadAllSources = async () => {
    if (!canUploadAllSources || uploading || importingSuggestions) return;

    setUploading(true);
    try {
      await onUploadFiles?.(selectedFiles);
      setSelectedFiles([]);
      await handleImportSuggestions({ closeAfterImport: false });
      showSuccess(t("workspace.upload.uploadAllSuccess"));
      onOpenChange(false);
    } catch {
      // Lỗi đã được hiển thị tại nguồn gọi API
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (val) => {
    if (!val) {
      setSelectedFiles([]);
      setShowSuggestedPanel(false);
      setShowWebInput(false);
      setWebUrl("");
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

    let isMounted = true;
    const bootstrapSuggestions = async () => {
      const list = await loadSuggestedResources();
      if (!isMounted || list.length > 0) return;

      setGeneratingSuggestions(true);
      try {
        await suggestResourcesByWorkspace({
          workspaceId: normalizedWorkspaceId,
          limit: SUGGESTED_RESOURCES_LIMIT,
        });
        if (!isMounted) return;
        await loadSuggestedResources();
      } catch (error) {
        if (!isMounted) return;
        showError(error?.message || t("workspace.upload.suggestGenerateError"));
      } finally {
        if (isMounted) {
          setGeneratingSuggestions(false);
        }
      }
    };

    bootstrapSuggestions();

    return () => {
      isMounted = false;
    };
  }, [open, showSuggestedPanel, normalizedWorkspaceId]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-[760px] max-h-screen overflow-y-auto overflow-x-hidden ${fontClass} ${
        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <DialogHeader>
          <DialogTitle className={fontClass}>
            {showWebInput
              ? t("workspace.upload.webYoutubeTitle", "URL trang YouTube")
              : t("workspace.upload.title")}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? "text-slate-400" : "text-gray-500"}>
            {showWebInput
              ? t("workspace.upload.webYoutubeDescription", "Dán URL trang YouTube vào bên dưới để tải lên dưới dạng một nguồn trong Workspace.")
              : `${t("workspace.upload.dragDrop")} / ${t("workspace.upload.orBrowse")}`}
          </DialogDescription>
        </DialogHeader>

        {showWebInput ? (
          <div className="space-y-3">
            {/* <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowWebInput(false)}
                className={`inline-flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-base font-semibold leading-none">{t("workspace.upload.webYoutubeTitle", "URL trang YouTube")}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWebInput(false)}
                className={`p-1 rounded-md transition-all ${isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div> */}

            <textarea
              value={webUrl}
              onChange={(event) => setWebUrl(event.target.value)}
              placeholder={t("workspace.upload.urlPlaceholderLong", "Dán liên kết bất kỳ")}
              className={`w-full min-h-[180px] rounded-xl border px-3 py-2.5 text-sm resize-y outline-none transition-all ${
                isDarkMode
                  ? "border-blue-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                  : "border-blue-500 bg-white text-slate-900 placeholder:text-slate-500 focus:border-blue-600"
              }`}
            />

            <ul className={`list-disc pl-5 space-y-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              <li>{t("workspace.upload.webYoutubeNote1", "Để thêm nhiều URL, hãy phân tách bằng dấu cách hoặc dòng mới.")}</li>
              <li>{t("workspace.upload.webYoutubeNote2", "Hiện chỉ nhập được văn bản hiển thị trên trang YouTube.")}</li>
              <li>{t("workspace.upload.webYoutubeNote3", "Không hỗ trợ bài viết có tính phí.")}</li>
              <li>{t("workspace.upload.webYoutubeNote4", "Hiện chỉ nhập được bản chép lời của video trên YouTube.")}</li>
              <li>{t("workspace.upload.webYoutubeNote5", "Chỉ hỗ trợ video công khai trên YouTube.")}</li>
            </ul>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWebInput(false)}
                className={isDarkMode ? "border-slate-700 text-slate-300" : ""}
              >
                {t("workspace.upload.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleAddWebUrl}
                disabled={processingWebLink || String(webUrl || "").trim().length === 0}
                className="min-w-[120px] h-10 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-600"
              >
                {processingWebLink ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("workspace.upload.insertUrl", "Chèn")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl px-6 py-8 text-center transition-all ${
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
              >
                <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-500"}`}>
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className={`text-base font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{t("workspace.upload.dragDrop")}</p>
                <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("workspace.upload.dragOnlyHint", "Chỉ kéo và thả tệp vào khung này")}
                </p>
                <p className={`text-xs mt-3 leading-5 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>{t("workspace.upload.supportedFormats")}</p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[420px] mx-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || importingSuggestions || processingWebLink}
                    className={`h-12 rounded-full transition-all active:scale-95 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-slate-300 text-slate-800 hover:bg-slate-50"}`}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    {t("workspace.upload.uploadFileButton", "Tải tệp lên")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWebInput(true)}
                    disabled={uploading || importingSuggestions || processingWebLink}
                    className={`h-12 rounded-full transition-all active:scale-95 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-slate-300 text-slate-800 hover:bg-slate-50"}`}
                  >
                    <span className="inline-flex items-center mr-2">
                      <Link2 className="w-4 h-4" />
                      <Youtube className="w-4 h-4 -ml-1 text-red-500" />
                    </span>
                    {t("workspace.upload.webYoutubeButton", "Liên kết YouTube")}
                  </Button>
                </div>
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

              {hasUserSelectedFiles && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleUploadUserFiles}
                    disabled={uploading || importingSuggestions || !hasUserSelectedFiles}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                    {t("workspace.upload.uploadUserFiles")}
                  </Button>
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
                    {selectedSuggestionCount}/{visibleSuggestedResources.length}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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

              {loadingSuggestions || generatingSuggestions ? (
                <div className="h-28 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : visibleSuggestedResources.length === 0 ? (
                <div className={`h-32 rounded-xl border flex items-center justify-center text-sm ${isDarkMode ? "border-slate-800 bg-slate-950/50 text-slate-400" : "border-slate-200 bg-white text-slate-500"}`}>
                  {t("workspace.upload.noData")}
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-2 space-y-2">
                  {visibleSuggestedResources.map((item, index) => {
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

                </div>
              )}

              {showSuggestedPanel && selectedSuggestionCount > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleImportSuggestions()}
                    disabled={importingSuggestions || uploading}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white"
                  >
                    {importingSuggestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                    {t("workspace.upload.importSuggested")}
                  </Button>
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
                  onClick={handleUploadAllSources}
                  disabled={uploading || importingSuggestions || !canUploadAllSources}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                  {uploading ? t("workspace.upload.uploading") : t("workspace.upload.uploadAllSources")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>

    </Dialog>
  );
}

export default UploadSourceDialogBase;
