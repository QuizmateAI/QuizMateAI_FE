import React from "react";
import { useTranslation } from "react-i18next";
import { Mic2, Film, GitBranch, FileText, CreditCard, BadgeCheck } from "lucide-react";

function StudioPanel({ isDarkMode = false }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const actions = [
    { icon: Mic2, key: "audioOverview" },
    { icon: Film, key: "videoOverview" },
    { icon: GitBranch, key: "mindMap" },
    { icon: FileText, key: "report" },
    { icon: CreditCard, key: "flashcards" },
    { icon: BadgeCheck, key: "quiz" },
  ];

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.studio.title")}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                className={`rounded-xl px-3 py-3 text-left flex items-start gap-2 transition-colors duration-300 ${
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100"
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
                <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                  {t(`workspace.studio.actions.${action.key}`)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-6 text-center space-y-2">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
            {t("workspace.studio.emptyTitle")}
          </p>
          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.studio.emptyDesc")}
          </p>
        </div>

        <button className="w-full rounded-full bg-[#2563EB] text-white text-sm font-medium py-2 flex items-center justify-center gap-2">
          <span className={fontClass}>{t("workspace.studio.addNote")}</span>
        </button>
      </div>
    </aside>
  );
}

export default StudioPanel;
