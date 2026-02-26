import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, ClipboardList, FolderOpen, Clock } from "lucide-react";

// Mock data — sẽ thay bằng API sau
const MOCK_MOCKTESTS = [
  { id: "mt1", name: "React Final Assessment", belongToName: "React Advanced Patterns", questionsCount: 60, duration: "90 min", status: "ACTIVE" },
  { id: "mt2", name: "DS&A Comprehensive Test", belongToName: "Data Structures", questionsCount: 40, duration: "60 min", status: "PENDING" },
];

const BELONG_STYLE = { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" };

function MockTestListView({ isDarkMode }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_MOCKTESTS;
    return MOCK_MOCKTESTS.filter(mt =>
      mt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mt.belongToName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <ClipboardList className="w-5 h-5 text-purple-500" />
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Mock Test</p>
      </div>

      {/* Tìm kiếm */}
      <div className="px-4 py-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{searchQuery ? t("workspace.listView.noResults") : t("workspace.listView.noItems")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(mt => (
              <div key={mt.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-purple-950/40" : "bg-purple-100"}`}>
                  <ClipboardList className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{mt.name}</p>
                  <p className={`text-xs mt-0.5 flex items-center gap-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    <span>{mt.questionsCount} {t("workspace.quiz.questions")}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mt.duration}</span>
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${isDarkMode ? BELONG_STYLE.dark : BELONG_STYLE.light}`}>{mt.belongToName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MockTestListView;
