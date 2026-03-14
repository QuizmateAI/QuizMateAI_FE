import React, { useEffect, useState } from "react";
import { Search, Plus, FileText, Image, Film, Link2, Trash2, FolderOpen, CheckSquare, Square, ChevronsLeft, BookOpen, Loader2, AlertTriangle, Ban, MoreHorizontal, Download, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/Components/ui/dialog";
import { renameMaterial } from "@/api/MaterialAPI";
import { useToast } from "@/context/ToastContext";
import SourceDetailView from "./SourceDetailView";

// Format MIME type thành tên file type ngắn gọn
function formatFileType(type) {
  if (!type) return "FILE";
  const lower = type.toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("wordprocessingml") || lower.includes("msword")) return "DOCX";
  if (lower.includes("spreadsheetml") || lower.includes("excel")) return "XLSX";
  if (lower.includes("presentationml") || lower.includes("powerpoint")) return "PPTX";
  if (lower.includes("image")) return "IMAGE";
  if (lower.includes("video")) return "VIDEO";
  if (lower === "url") return "URL";
  return "FILE";
}

// Lấy icon theo loại tài liệu
function getSourceIcon(type) {
  if (type?.toLowerCase().includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (type?.toLowerCase().includes("doc")) return <FileText className="w-4 h-4 text-blue-600" />;
  if (type?.toLowerCase().includes("image")) return <Image className="w-4 h-4 text-green-500" />;
  if (type?.toLowerCase().includes("video")) return <Film className="w-4 h-4 text-purple-500" />;
  if (type?.toLowerCase() === "url") return <Link2 className="w-4 h-4 text-blue-500" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

function getSourceDisplayIcon(source) {
  const status = source?.status?.toUpperCase();
  if (status === "ERROR") return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === "WARN" || status === "WARNED") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (status === "REJECT" || status === "REJECTED") return <Ban className="w-4 h-4 text-red-600 shrink-0" />;
  if (status === "PROCESSING") return <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />;
  return getSourceIcon(source?.type);
}

function canOpenSourceDetail(source) {
  const status = source?.status?.toUpperCase();
  return !["PROCESSING", "UPLOADING", "PENDING", "QUEUED", "ERROR"].includes(status);
}

// Kiểm tra có thể tick chọn tài liệu không - REJECT, ERROR và đang loading thì không cho chọn
function canSelectSource(source) {
  const status = source?.status?.toUpperCase();
  return !["REJECT", "REJECTED", "ERROR", "PROCESSING", "UPLOADING", "PENDING", "QUEUED"].includes(status);
}

// Kiểm tra có thể xóa tài liệu không - đang loading thì không cho xóa
function canDeleteSource(source) {
  const status = source?.status?.toUpperCase();
  return !["PROCESSING", "UPLOADING", "PENDING", "QUEUED"].includes(status);
}

// Panel hiển thị danh sách tài liệu — hỗ trợ thu gọn/mở rộng và xem chi tiết
function SourcesPanel({ 
  isDarkMode = false, 
  sources = [], 
  onAddSource, 
  onRemoveSource, 
  onRemoveMultiple, 
  onSourceUpdated, 
  isCollapsed = false, 
  onToggleCollapse,
  selectedIds: propSelectedIds,
  onSelectionChange
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState("");
  const [internalSelectedIds, setInternalSelectedIds] = useState([]);
  const [viewingSource, setViewingSource] = useState(null);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [canShowTooltip, setCanShowTooltip] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renameDialog, setRenameDialog] = useState(null); // { id, name }
  const [renameInput, setRenameInput] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null); // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMultipleDialog, setDeleteMultipleDialog] = useState(false);
  const [deleteMultipleLoading, setDeleteMultipleLoading] = useState(false);

  // Use prop if provided, else use internal state
  const selectedIds = propSelectedIds !== undefined ? propSelectedIds : internalSelectedIds;

  const handleSelectionChange = (newIds) => {
    if (onSelectionChange) {
      onSelectionChange(newIds);
    } else {
      setInternalSelectedIds(newIds);
    }
  };

  const filtered = sources.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    const newIds = selectedIds.includes(id) 
      ? selectedIds.filter((x) => x !== id) 
      : [...selectedIds, id];
    handleSelectionChange(newIds);
  };

  const selectAll = () => {
    const newIds = filtered.filter(s => canSelectSource(s)).map((s) => s.id);
    handleSelectionChange(newIds);
  };

  const deselectAll = () => handleSelectionChange([]);

  const handleRemoveSelected = async () => {
    setDeleteMultipleDialog(true);
  };

  const handleRemoveSelectedConfirm = async () => {
    setDeleteMultipleLoading(true);
    try {
      if (onRemoveMultiple) {
        await onRemoveMultiple(selectedIds);
      } else {
        selectedIds.forEach((id) => onRemoveSource?.(id));
      }
      handleSelectionChange([]);
      setDeleteMultipleDialog(false);
    } finally {
      setDeleteMultipleLoading(false);
    }
  };

  const openRenameDialog = (source) => {
    setOpenMenuId(null);
    setRenameDialog({ id: source.id, name: source.name });
    setRenameInput(source.name);
  };

  const openDeleteDialog = (source) => {
    setOpenMenuId(null);
    setDeleteDialog({ id: source.id, name: source.name });
  };

  const handleDownloadSource = async (source) => {
    if (!source?.storageURL) {
      showError(t("workspace.sources.loadError"));
      return;
    }

    setOpenMenuId(null);

    try {
      const response = await fetch(source.storageURL);
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectURL;
      link.download = source.name || "material";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectURL);
    } catch {
      showError(t("workspace.sources.loadError"));
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog || !renameInput.trim()) return;
    setRenameLoading(true);
    try {
      const res = await renameMaterial(renameDialog.id, renameInput.trim());
      onSourceUpdated?.({ ...res.data, id: res.data.materialId ?? renameDialog.id, name: res.data.title ?? renameInput.trim() });
      showSuccess(t("workspace.sources.renameSuccess"));
      setRenameDialog(null);
    } catch {
      showError(t("workspace.sources.loadError"));
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await onRemoveSource?.(deleteDialog.id);
      setDeleteDialog(null);
    } finally {
      setDeleteLoading(false);
    }
    handleSelectionChange([]); // Clear selection after delete
  };

  useEffect(() => {
    if (!isCollapsed) {
      const resetTimer = setTimeout(() => {
        setHoverTooltip(null);
        setCanShowTooltip(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(() => setCanShowTooltip(true), 180);
    return () => clearTimeout(timer);
  }, [isCollapsed]);

  const showTooltip = (event, text) => {
    if (!canShowTooltip) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverTooltip({
      text,
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  // Thu gọn — hiển thị icon từng tài liệu riêng lẻ
  if (isCollapsed) {
    return (
      <aside className={`rounded-2xl border h-full flex flex-col items-center transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
        <div className={`w-full h-12 px-2 border-b flex items-center justify-center transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
          <button
            type="button"
            onClick={() => {
              setHoverTooltip(null);
              onToggleCollapse();
            }}
            onMouseEnter={(event) => showTooltip(event, t("workspace.sources.title"))}
            onMouseLeave={() => setHoverTooltip(null)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto scrollbar-hide p-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onAddSource}
            onMouseEnter={(event) => showTooltip(event, t("workspace.sources.addSource"))}
            onMouseLeave={() => setHoverTooltip(null)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              isDarkMode ? "bg-slate-800 text-blue-400 hover:bg-slate-700" : "bg-gray-50 text-blue-500 hover:bg-gray-100"
            }`}
          >
            <Plus className="w-4.5 h-4.5" />
          </button>

          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => {
                if (!canOpenSourceDetail(source)) return;
                setHoverTooltip(null);
                setViewingSource(source);
                onToggleCollapse();
              }}
              onMouseEnter={(event) => showTooltip(event, source.name)}
              onMouseLeave={() => setHoverTooltip(null)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                canOpenSourceDetail(source)
                  ? isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-50 hover:bg-gray-100"
                  : isDarkMode ? "bg-slate-800/70 text-slate-500 cursor-not-allowed" : "bg-gray-50 text-gray-400 cursor-not-allowed"
              }`}
              title={!canOpenSourceDetail(source) ? "Tài liệu đang được xử lý, vui lòng đợi." : undefined}
            >
              {getSourceDisplayIcon(source)}
            </button>
          ))}
        </div>
        {hoverTooltip && (
          <div
            className="fixed z-[120] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-100 shadow-lg pointer-events-none transition-all duration-200 opacity-100 scale-100"
            style={{ left: hoverTooltip.x, top: hoverTooltip.y, transform: "translateY(-50%)" }}
          >
            {hoverTooltip.text}
          </div>
        )}
      </aside>
    );
  }

  // Đang xem chi tiết tài liệu — hiển thị trong panel Tài liệu
  if (viewingSource) {
    return (
      <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
        <SourceDetailView
          isDarkMode={isDarkMode}
          source={viewingSource}
          onSourceUpdated={(updatedSource) => {
            setViewingSource(updatedSource);
            onSourceUpdated?.(updatedSource);
          }}
          onBack={() => setViewingSource(null)}
        />
      </aside>
    );
  }

  // Mở rộng — hiển thị đầy đủ danh sách tài liệu
  return (
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      {/* Header — h-12 nhất quán với các panel khác */}
      <div className={`px-4 h-12 border-b flex items-center justify-between transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.sources.title")}</p>
        <div className="flex items-center gap-1">
          {sources.length > 0 && (
            <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>{sources.length}</span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm + nút thêm */}
      <div className="px-4 pt-3 space-y-2">
        <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${
          isDarkMode ? "bg-slate-950 border-slate-700" : "bg-gray-50 border-gray-200"
        }`}>
          <Search className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
          <input
            className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}
            placeholder={t("workspace.sources.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddSource}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Plus className="w-3 h-3" />
            <span className={fontClass}>{t("workspace.sources.addSource")}</span>
          </button>

          {selectedIds.length > 0 && (
            <>
              <button onClick={deselectAll} className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} hover:underline`}>
                {t("workspace.sources.deselectAll")}
              </button>
              <button onClick={handleRemoveSelected} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                {t("workspace.sources.remove")}
              </button>
            </>
          )}
          {sources.length > 0 && selectedIds.length === 0 && (
            <button onClick={selectAll} className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} hover:underline`}>
              {t("workspace.sources.selectAll")}
            </button>
          )}
        </div>
      </div>

      {/* Danh sách tài liệu — tên canh lề trái, click để xem chi tiết */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-2">
            <FolderOpen className={`w-10 h-10 ${isDarkMode ? "text-slate-700" : "text-gray-300"}`} />
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {t("workspace.sources.emptyTitle")}
            </p>
            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
              {t("workspace.sources.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((source) => {
              const isSelected = selectedIds.includes(source.id);
              const isRejected = ["REJECT", "REJECTED"].includes(source.status?.toUpperCase());
              const isWarn = ["WARN", "WARNED"].includes(source.status?.toUpperCase());
              const isError = source.status?.toUpperCase() === "ERROR";
              const isActive = source.status?.toUpperCase() === "ACTIVE";
              const isMenuOpen = openMenuId === source.id;
              const showActions = hoveredId === source.id || isMenuOpen;
              return (
                <div
                  key={source.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? isDarkMode ? "bg-blue-950/40 border border-blue-800" : "bg-blue-50 border border-blue-200"
                      : isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                  } ${!isSelected ? "border border-transparent" : ""}`}
                  onMouseEnter={() => setHoveredId(source.id)}
                  onMouseLeave={() => { if (!isMenuOpen) setHoveredId(null); }}
                >
                  {/* Checkbox — click riêng để chọn/bỏ chọn */}
                  <div 
                    className={`shrink-0 ${canSelectSource(source) ? "cursor-pointer" : "cursor-not-allowed"}`}
                    onClick={() => canSelectSource(source) && toggleSelect(source.id)}
                    title={isRejected ? "Không thể chọn tài liệu này" : undefined}
                  >
                    {isRejected
                      ? <Square className={`w-4 h-4 ${isDarkMode ? "text-red-800" : "text-red-300"} opacity-50`} />
                      : isSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-500" />
                        : <Square className={`w-4 h-4 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
                    }
                  </div>

                  {/* Nội dung tài liệu — click để xem chi tiết */}
                  <div
                    className={`min-w-0 flex-1 flex items-center gap-2.5 ${canOpenSourceDetail(source) ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
                    onClick={() => {
                      if (!canOpenSourceDetail(source)) return;
                      setViewingSource(source);
                    }}
                    title={!canOpenSourceDetail(source) ? (source.status?.toUpperCase() === "REJECT" ? "Tài liệu không liên quan đến học tập" : "Tài liệu đang được xử lý, vui lòng đợi.") : undefined}
                  >
                    {/* Icon trạng thái: ERROR (chấm than), WARN (chấm than vàng), REJECT (ban), PROCESSING (spinner), hoặc icon file thông thường */}
                    {getSourceDisplayIcon(source)}
                    <div className="min-w-0 flex-1 text-left">
                      <p className={`text-sm font-medium truncate ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>{source.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{formatFileType(source.type)}</span>
                        {source.status?.toUpperCase() === "ERROR" && (
                          <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-red-950/60 text-red-400" : "bg-red-100 text-red-600"}`}>
                            Lỗi tải lên
                          </span>
                        )}
                        {(source.status?.toUpperCase() === "WARN" || source.status?.toUpperCase() === "WARNED") && (
                          <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-amber-950/60 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                            ⚠ Nội dung cảnh báo
                          </span>
                        )}
                        {(source.status?.toUpperCase() === "REJECT" || source.status?.toUpperCase() === "REJECTED") && (
                          <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-red-950/60 text-red-400" : "bg-red-100 text-red-700"}`}>
                            Không liên quan
                          </span>
                        )}
                        {source.status?.toUpperCase() === "PROCESSING" && (
                          <span className={`inline-flex items-center text-xs ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>
                            Đang tải lên...
                          </span>
                        )}
                        {!source.status || ["ACTIVE"].includes(source.status?.toUpperCase()) ? (
                          source.size && <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{source.size}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Hành động bên phải: REJECT/WARN → nút xóa trực tiếp; đang loading → không hiện gì; còn lại → nút 3 chấm khi hover */}
                  {(isRejected || isWarn || isError) ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(source); }}
                      className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                        isDarkMode ? "text-red-400 hover:bg-red-950/40" : "text-red-500 hover:bg-red-50"
                      }`}
                      title={t("workspace.sources.menuDelete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : canDeleteSource(source) ? (
                  /* Nút 3 chấm — hiện khi hover hoặc menu đang mở */
                  <div className={`relative shrink-0 transition-opacity duration-150 ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : source.id);
                      }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                        isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-slate-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      } ${isMenuOpen ? (isDarkMode ? "bg-slate-700 text-slate-200" : "bg-gray-100 text-gray-700") : ""}`}
                      aria-label="Tùy chọn"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[110]"
                          onClick={() => { setOpenMenuId(null); setHoveredId(null); }}
                        />
                        <div className={`absolute right-0 top-8 z-[120] w-36 rounded-lg shadow-lg border py-1 ${
                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
                        }`}>
                          {isActive && source.storageURL && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDownloadSource(source); }}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                isDarkMode ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50"
                              } ${fontClass}`}
                            >
                              <Download className="w-4 h-4" />
                              {t("workspace.sources.menuDownload")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openRenameDialog(source); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              isDarkMode ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50"
                            } ${fontClass}`}
                          >
                            <PenLine className="w-4 h-4" />
                            {t("workspace.sources.menuRename")}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(source); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors text-red-500 ${
                              isDarkMode ? "hover:bg-red-950/30" : "hover:bg-red-50"
                            } ${fontClass}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("workspace.sources.menuDelete")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog đổi tên tài liệu */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => { if (!open) setRenameDialog(null); }}>
        <DialogContent hideClose className={`max-w-sm p-6 rounded-2xl ${isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-900"}`}>
          <h2 className={`text-base font-semibold mb-4 ${fontClass}`}>
            {t("workspace.sources.renameDialogTitle", { name: renameDialog?.name ?? "" })}
          </h2>
          <div className="space-y-1 mb-6">
            <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
              {t("workspace.sources.renameLabel")}<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
                isDarkMode
                  ? "bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500"
                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
              } ${fontClass}`}
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameDialog(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"
              } ${fontClass}`}
            >
              {t("workspace.sources.cancelBtn")}
            </button>
            <button
              type="button"
              onClick={handleRenameSubmit}
              disabled={renameLoading || !renameInput.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${fontClass}`}
            >
              {t("workspace.sources.saveBtn")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa nhiều tài liệu */}
      <Dialog open={deleteMultipleDialog} onOpenChange={(open) => { if (!open) setDeleteMultipleDialog(false); }}>
        <DialogContent hideClose className={`max-w-sm p-6 rounded-2xl ${isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-900"}`}>
          <h2 className={`text-base font-semibold mb-3 ${fontClass}`}>
            {t("workspace.sources.deleteDialogTitle")}
          </h2>
          <p className={`text-sm mb-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {t("workspace.sources.deleteMultipleDesc", { count: selectedIds.length })}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteMultipleDialog(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"
              } ${fontClass}`}
            >
              {t("workspace.sources.cancelBtn")}
            </button>
            <button
              type="button"
              onClick={handleRemoveSelectedConfirm}
              disabled={deleteMultipleLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed ${fontClass}`}
            >
              {t("workspace.sources.deleteConfirmBtn")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa tài liệu */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent hideClose className={`max-w-sm p-6 rounded-2xl ${isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-900"}`}>
          <h2 className={`text-base font-semibold mb-3 ${fontClass}`}>
            {t("workspace.sources.deleteDialogTitle")}
          </h2>
          <p className={`text-sm mb-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {t("workspace.sources.deleteDialogDesc", { name: deleteDialog?.name ?? "" })}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteDialog(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"
              } ${fontClass}`}
            >
              {t("workspace.sources.cancelBtn")}
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed ${fontClass}`}
            >
              {t("workspace.sources.deleteConfirmBtn")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

export default SourcesPanel;
