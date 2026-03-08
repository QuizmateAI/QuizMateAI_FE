import React, { useEffect, useState } from "react";
import { Search, Plus, FileText, Image, Film, Link2, Trash2, FolderOpen, CheckSquare, Square, ChevronsLeft, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  if (status === "PROCESSING") return <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />;
  return getSourceIcon(source?.type);
}

// Panel hiển thị danh sách tài liệu — hỗ trợ thu gọn/mở rộng và xem chi tiết
function SourcesPanel({ isDarkMode = false, sources = [], onAddSource, onRemoveSource, onRemoveMultiple, isCollapsed = false, onToggleCollapse }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewingSource, setViewingSource] = useState(null);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [canShowTooltip, setCanShowTooltip] = useState(false);

  const filtered = sources.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(filtered.map((s) => s.id));
  const deselectAll = () => setSelectedIds([]);

  const handleRemoveSelected = async () => {
    // Ưu tiên dùng onRemoveMultiple để xóa song song (nhanh hơn)
    if (onRemoveMultiple) {
      await onRemoveMultiple(selectedIds);
    } else {
      // Fallback: gọi onRemoveSource từng cái (tuần tự)
      selectedIds.forEach((id) => onRemoveSource?.(id));
    }
    setSelectedIds([]);
  };

  useEffect(() => {
    if (!isCollapsed) {
      setHoverTooltip(null);
      setCanShowTooltip(false);
      return;
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
                setHoverTooltip(null);
                setViewingSource(source);
                onToggleCollapse();
              }}
              onMouseEnter={(event) => showTooltip(event, source.name)}
              onMouseLeave={() => setHoverTooltip(null)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-50 hover:bg-gray-100"
              }`}
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
              return (
                <div
                  key={source.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? isDarkMode ? "bg-blue-950/40 border border-blue-800" : "bg-blue-50 border border-blue-200"
                      : isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                  } ${!isSelected ? "border border-transparent" : ""}`}
                >
                  {/* Checkbox — click riêng để chọn/bỏ chọn */}
                  <div className="shrink-0 cursor-pointer" onClick={() => toggleSelect(source.id)}>
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-500" />
                      : <Square className={`w-4 h-4 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
                    }
                  </div>

                  {/* Nội dung tài liệu — click để xem chi tiết */}
                  <div className="min-w-0 flex-1 flex items-center gap-2.5 cursor-pointer" onClick={() => setViewingSource(source)}>
                    {/* Icon trạng thái: ERROR (chấm than), PROCESSING (spinner), hoặc icon file thông thường */}
                    {getSourceDisplayIcon(source)}
                    <div className="min-w-0 flex-1 text-left">
                      <p className={`text-sm font-medium truncate ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>{source.name}</p>
                      <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        {formatFileType(source.type)} 
                        {source.status?.toUpperCase() === "ERROR" ? (
                          <span className="text-red-500 ml-1">• Lỗi tải lên</span>
                        ) : source.status?.toUpperCase() === "PROCESSING" ? (
                          <span className="text-blue-500 ml-1">• Đang tải lên...</span>
                        ) : (
                          source.size && <span>• {source.size}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

export default SourcesPanel;
