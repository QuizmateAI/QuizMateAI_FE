import React from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

function SourcesPanel() {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  return (
    <aside className="bg-white rounded-2xl border border-gray-200 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className={`text-base text-gray-800 ${fontClass}`}>{t("workspace.sources.title")}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            className={`bg-transparent outline-none text-sm text-gray-700 w-full ${fontClass}`}
            placeholder={t("workspace.sources.searchPlaceholder")}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium flex items-center gap-2 text-gray-700">
            <Plus className="w-3 h-3" />
            <span className={fontClass}>{t("workspace.sources.addSource")}</span>
          </button>
          <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium flex items-center gap-2 text-gray-700">
            <span className={fontClass}>{t("workspace.sources.quickResearch")}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="pt-12 text-center space-y-2">
          <p className={`text-sm text-gray-700 font-medium ${fontClass}`}>
            {t("workspace.sources.emptyTitle")}
          </p>
          <p className={`text-xs text-gray-500 ${fontClass}`}>
            {t("workspace.sources.emptyDesc")}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default SourcesPanel;
