import React from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, BadgeCheck, CreditCard, ClipboardList, GraduationCap, ChevronRight } from "lucide-react";

// Danh sách hành động chính trong Studio
const STUDIO_ACTIONS = [
  { key: "createRoadmap", icon: GitBranch, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
  { key: "createQuiz", icon: BadgeCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/40" },
  { key: "createFlashcard", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950/40" },
  { key: "mockTest", icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/40" },
  { key: "prelearning", icon: GraduationCap, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-950/40" },
];

// Panel chứa các nút chức năng chính của workspace
function StudioPanel({ isDarkMode = false, onAction, outputs = [] }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.studio.title")}</p>
      </div>

      {/* Các nút hành động */}
      <div className="p-3 space-y-2">
        {STUDIO_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => onAction?.(action.key)}
              className={`w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-all group ${
                isDarkMode
                  ? "bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700"
                  : "bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${action.bg}`}>
                <Icon className={`w-4.5 h-4.5 ${action.color}`} />
              </div>
              <span className={`text-sm font-medium flex-1 ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
                {t(`workspace.studio.actions.${action.key}`)}
              </span>
              <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            </button>
          );
        })}
      </div>

      {/* Khu vực hiển thị kết quả đã tạo */}
      <div className={`flex-1 px-4 pb-4 overflow-y-auto border-t mt-1 pt-3 ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
          {t("workspace.studio.outputs")}
        </p>
        {outputs.length === 0 ? (
          <div className="text-center py-6">
            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
              {t("workspace.studio.noOutputs")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {outputs.map((output, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-50 hover:bg-gray-100 text-gray-700"
              }`}>
                <p className={`font-medium truncate ${fontClass}`}>{output.name}</p>
                <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{output.type}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default StudioPanel;
