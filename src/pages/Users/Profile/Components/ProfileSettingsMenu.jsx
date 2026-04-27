import React from "react";
import { Globe, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function ProfileSettingsMenu({
  currentLang,
  fontClass,
  isDarkMode,
  isOpen,
  onLogout,
  onThemeToggle,
  onToggle,
  onToggleLanguage,
  settingsRef,
}) {
  const { t } = useTranslation();

  return (
    <div ref={settingsRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center gap-2 rounded-full border text-sm transition-all active:scale-95 md:w-auto md:px-3",
          isDarkMode
            ? "border-slate-700 text-slate-200 hover:bg-slate-800"
            : "border-slate-200 text-slate-700 hover:bg-slate-50",
        )}
        aria-expanded={isOpen}
        aria-label={t("common.settings")}
      >
        <Settings className="h-4 w-4" />
        <span className={cn("hidden md:inline", fontClass)}>{t("common.settings")}</span>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 z-[60] mt-2 w-56 overflow-hidden rounded-xl border shadow-lg",
            isDarkMode
              ? "border-slate-700 bg-slate-900 text-slate-100"
              : "border-slate-200 bg-white text-slate-800",
          )}
        >
          <button
            type="button"
            onClick={onToggleLanguage}
            className={cn(
              "flex w-full items-center justify-between px-4 py-3 text-sm transition-colors",
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50",
            )}
          >
            <span className={cn("flex items-center gap-2", fontClass)}>
              <Globe className="h-4 w-4" />
              {t("common.language")}
            </span>
            <span className="text-xs font-semibold">{currentLang === "vi" ? "VI" : "EN"}</span>
          </button>

          <button
            type="button"
            onClick={onThemeToggle}
            className={cn(
              "flex w-full items-center justify-between px-4 py-3 text-sm transition-colors",
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50",
            )}
          >
            <span className={cn("flex items-center gap-2", fontClass)}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {t("common.theme")}
            </span>
            <span className="text-xs font-semibold">
              {isDarkMode ? t("common.dark") : t("common.light")}
            </span>
          </button>

          <div className={cn("h-px w-full", isDarkMode ? "bg-slate-700" : "bg-slate-100")} />

          <button
            type="button"
            onClick={onLogout}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 transition-colors",
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-red-50",
            )}
          >
            <LogOut className="h-4 w-4" />
            <span className={fontClass}>{t("profile.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
