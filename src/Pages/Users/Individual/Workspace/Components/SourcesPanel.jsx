import React from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

function SourcesPanel({ isDarkMode = false }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.sources.title")}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className={`flex items-center gap-2 border rounded-2xl px-3 py-2 ${
          isDarkMode ? "bg-slate-950 border-slate-700" : "bg-gray-50 border-gray-200"
        }`}>
          <Search className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
          <input
            className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}
            placeholder={t("workspace.sources.searchPlaceholder")}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className={`rounded-full border px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-colors duration-300 ${
            isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-gray-200 text-gray-700"
          }`}>
            <Plus className="w-3 h-3" />
            <span className={fontClass}>{t("workspace.sources.addSource")}</span>
          </button>
          <button className={`rounded-full border px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-colors duration-300 ${
            isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-gray-200 text-gray-700"
          }`}>
            <span className={fontClass}>{t("workspace.sources.quickResearch")}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="pt-12 text-center space-y-2">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
            {t("workspace.sources.emptyTitle")}
          </p>
          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.sources.emptyDesc")}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default SourcesPanel;
