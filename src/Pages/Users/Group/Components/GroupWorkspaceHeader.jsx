import React from "react";
import { useTranslation } from "react-i18next";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { useNavigate } from "react-router-dom";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import WebSocketStatus from "@/Components/features/WebSocketStatus";

function GroupWorkspaceHeader({
  groupName = "",
  settingsMenu = null,
  isDarkMode = false,
  wsConnected = false,
  subtitle = "",
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const navigate = useNavigate();
  const resolvedTitle = groupName || t("groupManage.title");
  const resolvedSubtitle = String(subtitle || "").trim();

  return (
    <header className={`relative z-[110] w-full h-16 border-b transition-colors duration-300 ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"}`}>
      <div className="mx-auto flex h-16 max-w-[1740px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            className="flex w-[130px] items-center justify-center"
            onClick={() => navigate("/home")}
            aria-label={t("common.goHome")}
          >
            <img src={isDarkMode ? LogoDark : LogoLight} alt={t("common.brandLogoAlt", { brandName: "QuizMate AI" })} className="h-full w-full object-contain" />
          </button>

          <div className="min-w-0">
            <p className={`truncate text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {resolvedTitle}
            </p>
            {resolvedSubtitle ? (
              <p className={`truncate text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                {resolvedSubtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WebSocketStatus isConnected={wsConnected} isDarkMode={isDarkMode} compact />
          {settingsMenu}
          <UserProfilePopover isDarkMode={isDarkMode} />
        </div>
      </div>
    </header>
  );
}

export default GroupWorkspaceHeader;
