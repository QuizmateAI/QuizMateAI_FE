import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Plus, CreditCard, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { getFlashcardsByUser } from "@/api/FlashcardAPI";

// Cấu hình màu badge trạng thái
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
};

const FILTER_OPTIONS = ["all", "ACTIVE", "DRAFT"];

// Danh sách flashcard sets — lấy từ API theo contextType/contextId
function FlashcardListView({ isDarkMode, onCreateFlashcard, onViewFlashcard, onDeleteFlashcard, contextType = "WORKSPACE", contextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lấy danh sách flashcard từ API (theo user hiện tại)
  const fetchFlashcards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFlashcardsByUser();
      setFlashcards(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách flashcard:", err);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  // Lọc và tìm kiếm
  const filtered = React.useMemo(() => {
    let items = flashcards;
    if (filterType !== "all") items = items.filter(f => f.status === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(f => f.flashcardSetName?.toLowerCase().includes(q));
    }
    return items;
  }, [flashcards, searchQuery, filterType]);

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
              {opt === "all" ? t("workspace.listView.filter.all") : t(`workspace.flashcard.status${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
          </div>
        ) : flashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CreditCard className={`w-12 h-12 mb-3 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm mb-3 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.flashcard.noFlashcards")}</p>
            <Button onClick={onCreateFlashcard} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.flashcard.createFirstFlashcard")}</span>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(fc => {
              const ss = STATUS_STYLES[fc.status] || STATUS_STYLES.DRAFT;
              return (
                <div key={fc.flashcardSetId}
                  onClick={() => onViewFlashcard?.(fc)}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all group ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-amber-950/40" : "bg-amber-100"}`}>
                    <CreditCard className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{fc.flashcardSetName}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {fc.items?.length || 0} {t("workspace.flashcard.cards")}
                    </p>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1">{t("workspace.flashcard.createVia")}: {fc.createVia}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? ss.dark : ss.light}`}>
                      {t(`workspace.flashcard.status${fc.status}`)}
                    </span>
                    {onDeleteFlashcard && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteFlashcard(fc); }}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-red-950/30 text-red-400" : "hover:bg-red-100 text-red-500"}`}
                        title={t("workspace.flashcard.deleteSet")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
