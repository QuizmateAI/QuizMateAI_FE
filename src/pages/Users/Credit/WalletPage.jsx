import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/components/ui/button";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserProfilePopover from "@/components/features/users/UserProfilePopover";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useCurrentSubscription } from "@/hooks/useCurrentSubscription";
import { useWallet } from "@/hooks/useWallet";
import PlanManagementOverview from "./components/PlanManagementOverview";

const EMPTY_WALLET_SUMMARY = {
  balance: 0,
  totalAvailableCredits: 0,
  regularCreditBalance: 0,
  planCreditBalance: 0,
  hasActivePlan: false,
  planCreditExpiresAt: null,
};

function normalizeWalletSummary(walletData) {
  return {
    ...EMPTY_WALLET_SUMMARY,
    ...walletData,
    totalAvailableCredits: walletData?.totalAvailableCredits ?? walletData?.balance ?? 0,
    regularCreditBalance: walletData?.regularCreditBalance ?? 0,
    planCreditBalance: walletData?.planCreditBalance ?? 0,
    hasActivePlan: Boolean(walletData?.hasActivePlan),
    planCreditExpiresAt: walletData?.planCreditExpiresAt ?? null,
  };
}

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError } = useToast();
  const resolvedLanguage = String(i18n.resolvedLanguage || i18n.language || "vi").toLowerCase();
  const isVietnamese = resolvedLanguage.startsWith("vi");
  const currentLang = isVietnamese ? "vi" : "en";
  const numberLocale = isVietnamese ? "vi-VN" : "en-US";
  const fontClass = isVietnamese ? "font-sans" : "font-poppins";

  const [walletSummaryOverride, setWalletSummaryOverride] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isMountedRef = useRef(true);
  const settingsRef = useRef(null);
  const walletRefreshTimerRef = useRef(null);
  const walletSummaryRef = useRef(EMPTY_WALLET_SUMMARY);

  const { subscription, summary: currentPlanSummary } = useCurrentSubscription();
  const canBuyCredit = (subscription?.plan?.entitlement || subscription?.entitlement)?.canBuyCredit === true;
  const {
    wallet: walletQuerySummary,
    isLoading: isWalletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useWallet();
  const walletSummary = walletSummaryOverride ?? walletQuerySummary;

  const getFriendlyError = useCallback((err) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== "error.unknown" ? mapped : t("error.unknown");
  }, [t]);

  const toggleLanguage = () => {
    const newLang = isVietnamese ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    if (!isSettingsOpen) return undefined;
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (walletRefreshTimerRef.current) {
        globalThis.clearTimeout(walletRefreshTimerRef.current);
        walletRefreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    walletSummaryRef.current = walletSummary;
  }, [walletSummary]);

  useEffect(() => {
    if (walletError) {
      showError(getFriendlyError(walletError));
    }
  }, [getFriendlyError, showError, walletError]);

  const handleWalletRealtime = useCallback((payload = {}) => {
    if (!isMountedRef.current) return;

    const hasWalletSnapshot = [
      payload?.totalAvailableCredits,
      payload?.balance,
      payload?.regularCreditBalance,
      payload?.planCreditBalance,
    ].some((value) => value != null);

    if (hasWalletSnapshot) {
      setWalletSummaryOverride((current) => normalizeWalletSummary({
        ...walletSummaryRef.current,
        ...current,
        ...payload,
      }));
    }

    if (walletRefreshTimerRef.current) {
      globalThis.clearTimeout(walletRefreshTimerRef.current);
    }
    walletRefreshTimerRef.current = globalThis.setTimeout(() => {
      walletRefreshTimerRef.current = null;
      void Promise.resolve(refetchWallet()).finally(() => {
        if (isMountedRef.current) {
          setWalletSummaryOverride(null);
        }
      });
    }, 120);
  }, [refetchWallet]);

  useWebSocket({
    enabled: true,
    onWalletUpdate: handleWalletRealtime,
  });

  const backTo = location.state?.from || "/plans";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
        : "bg-white text-slate-900"
    }`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
        isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white/80"
      }`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex w-[110px] cursor-pointer items-center md:w-[130px]"
              aria-label={t("walletPage.goHome", "Go to Home")}
            >
              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt={t("walletPage.logoAlt", "QuizMate AI Logo")}
                className="h-auto w-full object-contain"
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div ref={settingsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full ${isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
                aria-expanded={isSettingsOpen}
                aria-haspopup="menu"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden text-sm sm:inline">{t("common.settings")}</span>
              </Button>

              {isSettingsOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border shadow-lg transition-colors duration-300 ${
                    isDarkMode ? "border-slate-800 bg-slate-950 text-slate-100" : "border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      toggleLanguage();
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition-colors ${
                      isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      <Globe className="h-4 w-4" />
                      {t("common.language")}
                    </span>
                    <span className={`text-xs font-semibold ${fontClass}`}>{currentLang === "vi" ? "VI" : "EN"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      toggleDarkMode();
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition-colors ${
                      isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {t("common.theme")}
                    </span>
                    <span className={`text-xs font-semibold ${fontClass}`}>{isDarkMode ? t("common.dark") : t("common.light")}</span>
                  </button>
                </div>
              )}
            </div>
            <UserProfilePopover isDarkMode={isDarkMode} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(backTo, { replace: true })}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isDarkMode
                ? "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("walletPage.back", "Back")}
          </button>
        </div>

        <PlanManagementOverview
          currentPlanSummary={currentPlanSummary}
          isDarkMode={isDarkMode}
          locale={numberLocale}
          loadingWallet={isWalletLoading}
          walletSummary={walletSummary}
          canBuyCredit={canBuyCredit}
          onBrowsePlans={() => navigate("/plans", { state: { from: "/wallets" } })}
        />
      </main>
    </div>
  );
}
