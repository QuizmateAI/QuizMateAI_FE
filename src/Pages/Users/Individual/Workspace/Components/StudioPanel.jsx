import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, BadgeCheck, CreditCard, ClipboardList, GraduationCap, ChevronRight, ChevronsRight, LayoutGrid, FileCheck, BookMarked, Map } from "lucide-react";

// Lấy icon và màu theo loại output đã tạo
function getOutputIcon(type) {
  if (type === "Quiz") return { icon: BadgeCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/40" };
  if (type === "Flashcard") return { icon: CreditCard, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950/40" };
  if (type === "Roadmap") return { icon: Map, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/40" };
  return { icon: FileCheck, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" };
}

// Danh sách hành động chính trong Studio
const STUDIO_ACTIONS = [
  { key: "createRoadmap", icon: GitBranch, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
  { key: "createQuiz", icon: BadgeCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/40" },
  { key: "createFlashcard", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950/40" },
  { key: "mockTest", icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/40" },
  { key: "prelearning", icon: GraduationCap, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-950/40" },
];

// Panel chứa các nút chức năng chính của workspace
function StudioPanel({ isDarkMode = false, onAction, outputs = [], isCollapsed = false, onToggleCollapse }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [canShowTooltip, setCanShowTooltip] = useState(false);

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
      x: rect.left - 10,
      y: rect.top + rect.height / 2,
    });
  };

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
            onMouseEnter={(event) => showTooltip(event, t("workspace.studio.title"))}
            onMouseLeave={() => setHoverTooltip(null)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto scrollbar-hide p-2 flex flex-col items-center gap-2">
          {STUDIO_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  setHoverTooltip(null);
                  onAction?.(action.key);
                }}
                onMouseEnter={(event) => showTooltip(event, t(`workspace.studio.actions.${action.key}`))}
                onMouseLeave={() => setHoverTooltip(null)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  isDarkMode
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${action.color}`} />
              </button>
            );
          })}

          {/* Hiển thị icon các output đã tạo khi thu gọn */}
          {outputs.length > 0 && (
            <>
              <div className={`w-8 border-t my-1 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`} />
              {outputs.map((output, i) => {
                const { icon: OutputIcon, color } = getOutputIcon(output.type);
                return (
                  <div
                    key={i}
                    onMouseEnter={(event) => showTooltip(event, output.name)}
                    onMouseLeave={() => setHoverTooltip(null)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isDarkMode ? "bg-slate-800" : "bg-gray-50"
                    }`}
                  >
                    <OutputIcon className={`w-4 h-4 ${color}`} />
                  </div>
                );
              })}
            </>
          )}
        </div>
        {hoverTooltip && (
          <div
            className="fixed z-[120] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-100 shadow-lg pointer-events-none transition-all duration-200 opacity-100 scale-100"
            style={{ left: hoverTooltip.x, top: hoverTooltip.y, transform: "translate(-100%, -50%)" }}
          >
            {hoverTooltip.text}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className={`px-4 h-12 border-b transition-colors duration-300 flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium text-left ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.studio.title")}</p>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
          title={t("workspace.studio.title")}
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
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
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 text-left ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
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
            {outputs.map((output, i) => {
              const { icon: OutputIcon, color, bg } = getOutputIcon(output.type);
              return (
                <div key={i} className={`rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm cursor-pointer transition-colors ${
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                    <OutputIcon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className={`font-medium truncate ${fontClass}`}>{output.name}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{output.type}</p>
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

export default StudioPanel;
