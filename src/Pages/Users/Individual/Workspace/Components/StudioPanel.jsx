import React from "react";
import { useTranslation } from "react-i18next";
import { Mic2, Film, GitBranch, FileText, CreditCard, BadgeCheck } from "lucide-react";

function StudioPanel() {
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
    <aside className="bg-white rounded-2xl border border-gray-200 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className={`text-base text-gray-800 ${fontClass}`}>{t("workspace.studio.title")}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                className="rounded-xl bg-gray-100 px-3 py-3 text-left flex items-start gap-2"
              >
                <Icon className="w-4 h-4 text-gray-500 mt-0.5" />
                <span className={`text-xs text-gray-600 ${fontClass}`}>
                  {t(`workspace.studio.actions.${action.key}`)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-6 text-center space-y-2">
          <p className={`text-sm text-gray-700 font-medium ${fontClass}`}>
            {t("workspace.studio.emptyTitle")}
          </p>
          <p className={`text-xs text-gray-500 ${fontClass}`}>
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
