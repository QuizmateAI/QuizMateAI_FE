import React from "react";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import CreditIconImage from "@/components/ui/CreditIconImage";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import LogoLight from "@/assets/LightMode_Logo.webp";
import { cn } from "@/lib/utils";
import { getPlanLabel } from "./profileHelpers";

export default function ProfileTopbar({
  avatarLetter,
  currentPlanSummary,
  fontClass,
  isDarkMode,
  navigate,
  profile,
  settingsMenu,
}) {
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 w-full border-b backdrop-blur-md",
        isDarkMode ? "border-slate-800 bg-slate-950/85" : "border-slate-200 bg-white/85",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-6">
        <button
          type="button"
          className="flex w-[108px] items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:w-[132px] dark:focus-visible:ring-offset-slate-950"
          onClick={() => navigate("/home")}
          aria-label={t("common.goHome")}
        >
          <img
            src={isDarkMode ? LogoDark : LogoLight}
            alt={t("common.brandLogoAlt", { brandName: "QuizMate AI" })}
            className="h-auto w-full object-contain"
          />
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/plans", { state: { from: "/profiles" } })}
            className={cn(
              "h-9 rounded-full px-3",
              isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <CreditCard className="h-4 w-4" />
            <span className={cn("hidden max-w-[180px] truncate text-sm sm:inline", fontClass)}>
              {getPlanLabel(currentPlanSummary, t)}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/wallets", { state: { from: "/profiles" } })}
            className={cn(
              "h-9 rounded-full px-3",
              isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full ring-1 ring-inset",
                isDarkMode ? "bg-blue-500/10 ring-blue-400/25" : "bg-blue-600/10 ring-blue-600/20",
              )}
            >
              <CreditIconImage
                alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })}
                className="h-6 w-6 rounded-full"
              />
            </span>
            <span className="hidden text-sm sm:inline">{t("common.wallet")}</span>
          </Button>

          {settingsMenu}

          <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-blue-600 text-sm font-semibold text-white">
                {avatarLetter}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
