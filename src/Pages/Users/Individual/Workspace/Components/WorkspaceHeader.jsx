import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import LogoLight from "@/assets/LightMode_Logo.png";
import LogoDark from "@/assets/DarkMode_Logo.png";
import { useNavigate } from "react-router-dom";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";

function WorkspaceHeader({
  settingsMenu = null,
  isDarkMode = false,
  workspaceTitle = "",
  workspaceSubtitle = "",
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const navigate = useNavigate();

  return (
    <header className={`w-full h-16 border-b transition-colors duration-300 ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"}`}>
      <div className="max-w-[1740px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-[130px] flex items-center justify-center cursor-pointer"
            onClick={() => navigate("/home")}
          >
            <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {workspaceTitle || t("workspace.header.title")}
            </p>
            {workspaceSubtitle ? (
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                {workspaceSubtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className={`rounded-full text-white h-9 px-4 flex items-center gap-2 ${
            isDarkMode ? "bg-blue-600 hover:bg-blue-500" : "bg-[#2563EB] hover:bg-gray-800"
          }`}>
            <Plus className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.header.create")}</span>
          </Button>
          <Button
            variant="outline"
            className={`rounded-full h-9 px-4 flex items-center gap-2 ${
              isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-gray-200"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.header.share")}</span>
          </Button>
          {settingsMenu ? (
            settingsMenu
          ) : (
            <Button
              variant="outline"
              className={`rounded-full h-9 px-4 flex items-center gap-2 ${
                isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-gray-200"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className={fontClass}>{t("workspace.header.settings")}</span>
            </Button>
          )}
          <UserProfilePopover isDarkMode={isDarkMode} />
        </div>
      </div>
    </header>
  );
}

export default WorkspaceHeader;
