import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Plus, CreditCard, FolderOpen, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hàm format ngày giờ ngắn gọn
function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

// Cấu hình màu badge belong-to
const BELONG_STYLES = {
  knowledge: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  workspace: { light: "bg-slate-100 text-slate-700", dark: "bg-slate-800 text-slate-300" },
  group: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-950/50 text-purple-400" },
};

// Mock data — sẽ thay bằng API sau
const MOCK_FLASHCARDS = [
  { id: "f1", name: "React Hooks Cards", belongTo: "knowledge", belongToName: "Custom Hooks", cardsCount: 30, createdAt: "2026-02-19T08:00:00", updatedAt: "2026-02-25T10:30:00" },
  { id: "f2", name: "JavaScript Terms", belongTo: "workspace", belongToName: "React Workspace", cardsCount: 50, createdAt: "2026-02-18T14:00:00", updatedAt: "2026-02-24T16:45:00" },
  { id: "f3", name: "Team Flashcards", belongTo: "group", belongToName: "Study Group A", cardsCount: 40, createdAt: "2026-02-21T09:30:00", updatedAt: "2026-02-26T08:15:00" },
  { id: "f4", name: "JSX Syntax Cards", belongTo: "knowledge", belongToName: "JSX & Components", cardsCount: 20, createdAt: "2026-02-20T11:00:00", updatedAt: "2026-02-23T13:20:00" },
];

const FILTER_OPTIONS = ["all", "knowledge", "workspace", "group"];

function FlashcardListView({ isDarkMode, onCreateFlashcard, createdItems = [] }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Gộp mock data với các item đã tạo từ form
  const allFlashcards = useMemo(() => [...MOCK_FLASHCARDS, ...createdItems], [createdItems]);

  const filtered = useMemo(() => {
    let items = allFlashcards;
    if (filterType !== "all") items = items.filter(f => f.belongTo === filterType);
    if (searchQuery.trim()) items = items.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.belongToName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return items;
  }, [allFlashcards, searchQuery, filterType]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Flashcard</p>
        </div>
        <Button onClick={onCreateFlashcard} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.listView.create")}</span>
        </Button>
      </div>

      {/* Tìm kiếm + Lọc */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setFilterType(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterType === opt
                ? isDarkMode ? "bg-amber-950/50 text-amber-400" : "bg-amber-100 text-amber-700"
                : isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t(`workspace.listView.filter.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(fc => {
              const bs = BELONG_STYLES[fc.belongTo] || BELONG_STYLES.workspace;
              return (
                <div key={fc.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-amber-950/40" : "bg-amber-100"}`}>
                    <CreditCard className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{fc.name}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{fc.cardsCount} {t("workspace.flashcard.cards")}</p>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(fc.createdAt)}</span>
                      {fc.updatedAt && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{t("workspace.listView.updatedAt")}: {formatShortDate(fc.updatedAt)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${isDarkMode ? bs.dark : bs.light}`}>{fc.belongToName}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardListView;
