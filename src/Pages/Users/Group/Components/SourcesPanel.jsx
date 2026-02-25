import React, { useState } from "react";
import { Search, Plus, FileText, Image, Film, Link2, Trash2, FolderOpen, CheckSquare, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

// Lấy icon theo loại tài liệu
function getSourceIcon(type) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "image") return <Image className="w-4 h-4 text-green-500" />;
  if (type === "video") return <Film className="w-4 h-4 text-purple-500" />;
  if (type === "url") return <Link2 className="w-4 h-4 text-blue-500" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

// Panel hiển thị danh sách tài liệu đã upload trong workspace
function SourcesPanel({ isDarkMode = false, sources = [], onAddSource, onRemoveSource }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Lọc theo từ khóa tìm kiếm
  const filtered = sources.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Chọn / bỏ chọn tài liệu
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(filtered.map((s) => s.id));
  const deselectAll = () => setSelectedIds([]);

  // Xóa các tài liệu đã chọn
  const handleRemoveSelected = () => {
    selectedIds.forEach((id) => onRemoveSource?.(id));
    setSelectedIds([]);
  };

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.sources.title")}</p>
        <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
          {sources.length > 0 ? t("workspace.sources.totalDocs", { count: sources.length }) : ""}
        </span>
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

      {/* Danh sách tài liệu */}
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
                  onClick={() => toggleSelect(source.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? isDarkMode ? "bg-blue-950/40 border border-blue-800" : "bg-blue-50 border border-blue-200"
                      : isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                  } ${!isSelected ? "border border-transparent" : ""}`}
                >
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                    : <Square className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
                  }
                  {getSourceIcon(source.type)}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>{source.name}</p>
                    <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      {source.type?.toUpperCase()} {source.size ? `• ${source.size}` : ""}
                    </p>
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
