import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Moon,
  Settings,
  Sun,
  Sparkles,
  Plus,
  Receipt,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserProfilePopover from "@/components/features/users/UserProfilePopover";
import CreditIconImage from "@/components/ui/CreditIconImage";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  getMyWallet,
  getPurchaseableCreditPackages,
  getMyWalletTransactions,
} from "@/api/ManagementSystemAPI";
import { getCachedSubscription } from "@/utils/userCache";

function formatNumber(n, locale) {
  return new Intl.NumberFormat(locale).format(n);
}

function formatVnd(amount, locale) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} VND`;
}

function formatTime(iso, locale = "vi") {
  try {
    return new Date(iso).toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
  } catch {
    return iso;
  }
}

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

function normalizeTransactions(page) {
  const content = page?.content ?? (Array.isArray(page) ? page : []);
  return content.map((tx) => ({
    id: tx.creditTransactionId,
    time: tx.createdAt,
    amount: tx.creditChange ?? 0,
    type: tx.transactionType ?? "UNKNOWN",
    source: tx.sourceType ?? "",
    note: tx.note ?? "",
    balanceAfter: tx.balanceAfter ?? null,
  }));
}

function formatFallbackLabel(value, t) {
  if (!value) return t("walletPage.fallback.other", "Other");

  return String(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const TRANSACTION_TYPE_FALLBACKS = {
  WELCOME: "Welcome credits",
  TOPUP: "Credit top-up",
  CONSUME: "AI credit usage",
  RESERVE: "Credit reserved",
  RESERVE_CANCELLED: "Reserve released",
  REFUND: "Credit refund",
  ADJUST: "Credit adjustment",
  PLAN_BONUS: "Plan credits",
  PLAN_EXPIRE_RESET: "Plan reset",
};

function getTransactionTypeLabel(type, t) {
  const normalized = String(type || "").toUpperCase();
  if (TRANSACTION_TYPE_FALLBACKS[normalized]) {
    return t(`walletPage.transactionType.${normalized}`, TRANSACTION_TYPE_FALLBACKS[normalized]);
  }
  return formatFallbackLabel(type, t);
}

const TRANSACTION_SOURCE_FALLBACKS = {
  SYSTEM: "System",
  PAYMENT: "Payment",
  AI_USAGE: "AI usage",
  USER_PLAN: "Your plan",
  WORKSPACE_PLAN: "Group plan",
  ADMIN: "Admin",
};

function getTransactionSourceLabel(source, t) {
  const normalized = String(source || "").toUpperCase();
  if (TRANSACTION_SOURCE_FALLBACKS[normalized]) {
    return t(`walletPage.transactionSource.${normalized}`, TRANSACTION_SOURCE_FALLBACKS[normalized]);
  }
  return source ? formatFallbackLabel(source, t) : t("walletPage.fallback.emDash", "—");
}

function getTransactionSourceBadgeClass(source, isDarkMode) {
  const normalized = String(source || "").toUpperCase();

  if (normalized === "AI_USAGE") {
    return isDarkMode
      ? "bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/20"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  if (normalized === "USER_PLAN" || normalized === "WORKSPACE_PLAN") {
    return isDarkMode
      ? "bg-blue-400/10 text-blue-200 ring-1 ring-blue-400/20"
      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }

  if (normalized === "PAYMENT") {
    return isDarkMode
      ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/20"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  return isDarkMode
    ? "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/50"
    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function parseAiUsageNote(note) {
  const normalizedNote = String(note || "").trim();
  if (!normalizedNote) return null;

  const match = normalizedNote.match(/AI\s+[A-Z_]+:\s*([A-Z_]+)(?:\s+x(\d+))?/i);
  if (!match) return null;

  return {
    actionKey: String(match[1] || "").toUpperCase(),
  };
}

function sanitizeActivityNote(note) {
  return String(note || "")
    .replace(/\s+\[(?:PARTIAL_REFUND|RELEASED|PLAN_CREDIT_FORFEITED)[^\]]*\]/gi, "")
    .trim();
}

function decodeUiActivityValue(value) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";

  try {
    return decodeURIComponent(normalizedValue.replace(/\+/g, "%20"));
  } catch {
    return normalizedValue;
  }
}

function parseUiActivityNote(note) {
  const normalizedNote = sanitizeActivityNote(note);
  if (normalizedNote.startsWith("UI_ACTIVITY_V2|")) {
    const [, actionKey, encodedTarget = "", encodedWorkspace = ""] = normalizedNote.split("|");
    return {
      actionKey: String(actionKey || "").toUpperCase(),
      target: decodeUiActivityValue(encodedTarget),
      workspaceName: decodeUiActivityValue(encodedWorkspace),
    };
  }

  if (!normalizedNote.startsWith("UI_ACTIVITY|")) return null;

  const [, actionKey, ...targetParts] = normalizedNote.split("|");
  return {
    actionKey: String(actionKey || "").toUpperCase(),
    target: targetParts.join("|").trim(),
    workspaceName: "",
  };
}

const AI_ACTION_TITLE_FALLBACKS = {
  PROCESS_PDF: "You uploaded a PDF",
  PROCESS_IMAGE: "You uploaded an image",
  PROCESS_TEXT: "You sent text for AI processing",
  PROCESS_DOCX: "You uploaded a Word document",
  PROCESS_XLSX: "You uploaded an Excel file",
  PROCESS_PPTX: "You uploaded a PowerPoint deck",
  PROCESS_AUDIO: "You uploaded an audio file",
  PROCESS_VIDEO: "You uploaded a video",
  GENERATE_QUIZ: "You generated a quiz",
  PREVIEW_QUIZ_STRUCTURE: "You previewed a quiz structure",
  GENERATE_FLASHCARDS: "You generated flashcards",
  GENERATE_MOCK_TEST: "You generated a mock test",
  GENERATE_ROADMAP: "You generated a study roadmap",
  GENERATE_ROADMAP_PHASES: "You generated roadmap phases",
  GENERATE_ROADMAP_PHASE_CONTENT: "You generated study content",
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: "You generated a knowledge quiz",
  SUGGEST_LEARNING_RESOURCES: "You requested learning resources",
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: "You analyzed a study profile",
  SUGGEST_STUDY_PROFILE_FIELDS: "You requested study profile suggestions",
  SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: "You requested exam template suggestions",
  VALIDATE_STUDY_PROFILE_CONSISTENCY: "You validated a study profile",
};

function getAiActionActivity(actionKey, t) {
  if (AI_ACTION_TITLE_FALLBACKS[actionKey]) {
    return {
      title: t(`walletPage.aiActivity.${actionKey}`, AI_ACTION_TITLE_FALLBACKS[actionKey]),
    };
  }

  return {
    title: t("walletPage.aiActivity.default", "You used an AI feature"),
  };
}

const UI_ACTIVITY_TITLE_FALLBACKS = {
  PROCESS_PDF: "Uploaded PDF: {{target}}",
  PROCESS_DOCX: "Uploaded Word file: {{target}}",
  PROCESS_PPTX: "Uploaded slides: {{target}}",
  PROCESS_XLSX: "Uploaded Excel file: {{target}}",
  PROCESS_IMAGE: "Uploaded image: {{target}}",
  PROCESS_AUDIO: "Uploaded audio: {{target}}",
  PROCESS_VIDEO: "Uploaded video: {{target}}",
  PROCESS_TEXT: "Processed text: {{target}}",
  GENERATE_QUIZ: "Generated quiz: {{target}}",
  GENERATE_FLASHCARDS: "Generated flashcards from: {{target}}",
  GENERATE_MOCK_TEST: "Generated mock test: {{target}}",
  GENERATE_ROADMAP: "Generated roadmap: {{target}}",
  GENERATE_ROADMAP_PHASES: "Generated phases for: {{target}}",
  GENERATE_ROADMAP_PHASE_CONTENT: "Generated content for: {{target}}",
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: "Generated knowledge quiz: {{target}}",
};

function formatUiActivityTitle(actionKey, target, t) {
  const safeTarget = String(target || "").trim();
  if (!safeTarget) {
    return getAiActionActivity(actionKey, t).title;
  }

  if (UI_ACTIVITY_TITLE_FALLBACKS[actionKey]) {
    return t(`walletPage.uiActivity.${actionKey}`, UI_ACTIVITY_TITLE_FALLBACKS[actionKey], { target: safeTarget });
  }

  return t("walletPage.uiActivity.default", "Used AI for: {{target}}", { target: safeTarget });
}

function getReadableNote(note) {
  const normalizedNote = sanitizeActivityNote(note);
  if (!normalizedNote) return "";
  if (normalizedNote.startsWith("UI_ACTIVITY|") || normalizedNote.startsWith("UI_ACTIVITY_V2|")) return "";
  if (/^AI\s+[A-Z_]+:/i.test(normalizedNote)) return "";
  return normalizedNote;
}

function getAiUsageActivity(tx, t) {
  const uiActivity = parseUiActivityNote(tx?.note);
  if (uiActivity) {
    return {
      title: formatUiActivityTitle(uiActivity.actionKey, uiActivity.target, t),
      subtitle: "",
      workspaceName: String(uiActivity.workspaceName || "").trim(),
    };
  }

  const readableNote = getReadableNote(tx?.note);
  if (readableNote) {
    return {
      title: readableNote,
      subtitle: "",
      workspaceName: "",
    };
  }

  const aiUsageMeta = parseAiUsageNote(tx?.note);
  if (aiUsageMeta) {
    return {
      title: getAiActionActivity(aiUsageMeta.actionKey, t).title,
      subtitle: "",
      workspaceName: "",
    };
  }

  return {
    title: t("walletPage.aiActivity.default", "You used an AI feature"),
    subtitle: "",
    workspaceName: "",
  };
}

function getTransactionActivity(tx, t) {
  const normalizedType = String(tx?.type || "").toUpperCase();
  const normalizedSource = String(tx?.source || "").toUpperCase();
  if (normalizedSource === "AI_USAGE") {
    return getAiUsageActivity(tx, t);
  }

  if (normalizedType === "WELCOME") {
    return {
      title: t("walletPage.txActivity.welcomeTitle", "You received welcome credits"),
      subtitle: t("walletPage.txActivity.welcomeSubtitle", "A welcome bonus for your new account"),
      workspaceName: "",
    };
  }

  if (normalizedType === "PLAN_BONUS") {
    return {
      title: t("walletPage.txActivity.planBonusTitle", "You received plan credits"),
      subtitle: t("walletPage.txActivity.planBonusSubtitle", "Included plan credits were added to your wallet"),
      workspaceName: "",
    };
  }

  if (normalizedType === "TOPUP") {
    return {
      title: t("walletPage.txActivity.topupTitle", "You topped up credits"),
      subtitle: t("walletPage.txActivity.topupSubtitle", "Credits were added to your wallet"),
      workspaceName: "",
    };
  }

  if (normalizedType === "REFUND") {
    return {
      title: t("walletPage.txActivity.refundTitle", "You received a credit refund"),
      subtitle: t("walletPage.txActivity.refundSubtitle", "Unused credits were returned to your wallet"),
      workspaceName: "",
    };
  }

  if (normalizedType === "RESERVE_CANCELLED") {
    return {
      title: t("walletPage.txActivity.reserveCancelledTitle", "A reserved amount was released"),
      subtitle: t("walletPage.txActivity.reserveCancelledSubtitle", "Reserved credits were returned to your wallet"),
      workspaceName: "",
    };
  }

  if (normalizedType === "PLAN_EXPIRE_RESET") {
    return {
      title: t("walletPage.txActivity.planExpireResetTitle", "Plan credits were reset"),
      subtitle: t("walletPage.txActivity.planExpireResetSubtitle", "The system reset your plan credits for the next cycle"),
      workspaceName: "",
    };
  }

  return {
    title: getTransactionTypeLabel(tx?.type, t),
    subtitle: tx?.note && !/task:|order\s+/i.test(String(tx.note))
      ? String(tx.note)
      : "",
    workspaceName: "",
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

  const toggleLanguage = () => {
    const newLang = isVietnamese ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const isMountedRef = useRef(true);
  const walletRefreshTimerRef = useRef(null);

  const subscription = getCachedSubscription();
  const canBuyCredit = subscription?.entitlement?.canBuyCredit === true;

  const getFriendlyError = (err) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== "error.unknown" ? mapped : t("error.unknown");
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setIsSettingsOpen(false);
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

  const fetchPackages = useCallback(async () => {
    setIsLoadingPackages(true);
    try {
      const packagesRes = await getPurchaseableCreditPackages();
      if (!isMountedRef.current) return;
      const pkgData = packagesRes?.data ?? packagesRes;
      setPackages(Array.isArray(pkgData) ? pkgData : []);
    } catch (err) {
      if (isMountedRef.current) {
        showError(getFriendlyError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingPackages(false);
      }
    }
  }, [showError, t]);

  const fetchWalletData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoadingWallet(true);
      setIsLoadingTransactions(true);
    }

    try {
      const [walletRes, txRes] = await Promise.all([
        getMyWallet(),
        getMyWalletTransactions(0, 20),
      ]);

      if (!isMountedRef.current) return;

      const walletData = walletRes?.data ?? walletRes;
      const normalizedWallet = normalizeWalletSummary(walletData);

      const page = txRes?.data ?? txRes;
      let mappedTx = normalizeTransactions(page);
      let finalWallet = normalizedWallet;

      const latestTxBalance = mappedTx[0]?.balanceAfter;
      const walletBalance = normalizedWallet.totalAvailableCredits ?? 0;

      if (latestTxBalance != null && latestTxBalance !== walletBalance) {
        const [walletRetryRes, txRetryRes] = await Promise.all([
          getMyWallet(),
          getMyWalletTransactions(0, 20),
        ]);
        if (!isMountedRef.current) return;

        finalWallet = normalizeWalletSummary(walletRetryRes?.data ?? walletRetryRes);
        mappedTx = normalizeTransactions(txRetryRes?.data ?? txRetryRes);
      }

      setWalletSummary(finalWallet);
      setTransactions(mappedTx);
    } catch (err) {
      if (isMountedRef.current) {
        showError(getFriendlyError(err));
      }
    } finally {
      if (isMountedRef.current && !silent) {
        setIsLoadingWallet(false);
        setIsLoadingTransactions(false);
      }
    }
  }, [showError, t]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  const handleWalletRealtime = useCallback((payload = {}) => {
    if (!isMountedRef.current) return;

    const hasWalletSnapshot = [
      payload?.totalAvailableCredits,
      payload?.balance,
      payload?.regularCreditBalance,
      payload?.planCreditBalance,
    ].some((value) => value != null);

    if (hasWalletSnapshot) {
      setWalletSummary((current) => normalizeWalletSummary({
        ...current,
        ...payload,
      }));
    }

    if (walletRefreshTimerRef.current) {
      globalThis.clearTimeout(walletRefreshTimerRef.current);
    }
    walletRefreshTimerRef.current = globalThis.setTimeout(() => {
      walletRefreshTimerRef.current = null;
      void fetchWalletData({ silent: true });
    }, 120);
  }, [fetchWalletData]);

  useWebSocket({
    enabled: true,
    onWalletUpdate: handleWalletRealtime,
  });

  const buyCredits = (pkg) => {
    if (!pkg?.creditPackageId) return;
    navigate(`/payments/credits?creditPackageId=${pkg.creditPackageId}`, {
      state: { from: "/wallets" },
    });
  };

  const backTo = location.state?.from || "/plans";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
        : "bg-white text-slate-900"
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b ${
        isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="w-[110px] md:w-[130px] flex items-center cursor-pointer"
              aria-label={t("walletPage.goHome", "Go to Home")}
            >
              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt={t("walletPage.logoAlt", "QuizMate AI Logo")}
                className="w-full h-auto object-contain"
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
                <Settings className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">{t("common.settings")}</span>
              </Button>

              {isSettingsOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-gray-200 text-gray-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); toggleLanguage(); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                      isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      <Globe className="w-4 h-4" />
                      {t("common.language")}
                    </span>
                    <span className={`text-xs font-semibold ${fontClass}`}>{currentLang === "vi" ? "VI" : "EN"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); toggleDarkMode(); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                      isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button bình thường, cuộn cùng nội dung */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(backTo, { replace: true })}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode
                ? "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("walletPage.back", "Back")}
          </button>
        </div>

        {/* Top summary */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <Card className={`flex-1 overflow-hidden backdrop-blur-xl ${
            isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center rounded-2xl ring-1 ring-inset ${
                      isDarkMode
                        ? "bg-blue-500/10 ring-blue-400/25 shadow-[0_0_0_6px_rgba(99,102,241,0.10)]"
                        : "bg-slate-100 ring-slate-200"
                    }`}>
                      <CreditIconImage alt="Quizmate Credit" className="w-9 h-9 rounded-2xl animate-floaty" />
                    </span>
                    {t("walletPage.summary.title", "Your Credit Wallet")}
                  </CardTitle>
                  <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
                    {t("walletPage.summary.subtitle", "Track your balance and manage credits used for AI features")}
                  </CardDescription>
                </div>
                <Badge className={`rounded-full px-3 py-1 ${
                  isDarkMode ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"
                }`}>
                  {t("walletPage.summary.badge", "Personal wallet")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`rounded-2xl p-5 ring-1 ring-inset ${
                isDarkMode ? "bg-slate-950/40 ring-slate-700/60" : "bg-white ring-slate-200"
              }`}>
                <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{t("walletPage.summary.totalAvailable", "Total available credits")}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold tracking-tight ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                    {formatNumber(walletSummary.totalAvailableCredits, numberLocale)}
                  </span>
                  <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {t("walletPage.summary.creditsUnit", "credits")}
                  </span>
                </div>
                <div className={`mt-3 inline-flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <Sparkles className={`w-4 h-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
                  {t("walletPage.summary.hint", "Credits are used to run AI tasks like quiz generation, flashcards, study roadmaps...")}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-2xl px-4 py-3 ring-1 ring-inset ${
                    isDarkMode ? "bg-slate-900/60 ring-slate-700/60" : "bg-white/80 ring-slate-200"
                  }`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {t("walletPage.summary.regularCredits", "Regular credits")}
                    </p>
                    <p className={`mt-2 text-2xl font-bold tabular-nums ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                      {formatNumber(walletSummary.regularCreditBalance, numberLocale)}
                    </p>
                  </div>
                  {walletSummary.hasActivePlan && (
                    <div className={`rounded-2xl px-4 py-3 ring-1 ring-inset ${
                      isDarkMode ? "bg-slate-900/60 ring-slate-700/60" : "bg-white ring-slate-200"
                    }`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                        {t("walletPage.summary.planCredits", "Plan credits")}
                      </p>
                      <p className={`mt-2 text-2xl font-bold tabular-nums ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                        {formatNumber(walletSummary.planCreditBalance, numberLocale)}
                      </p>
                      {walletSummary.planCreditExpiresAt && (
                        <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {t("walletPage.summary.expiresAt", "Expires at")}: {formatTime(walletSummary.planCreditExpiresAt, currentLang)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className={`rounded-full cursor-pointer ${
                      isDarkMode ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {t("walletPage.summary.pricingGuide", "View detailed pricing")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`w-full lg:w-[420px] backdrop-blur-xl ${
            isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                {t("walletPage.buy.title", "Buy more credits")}
              </CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
                {t("walletPage.buy.subtitle", "Pick a credit package to keep using AI features")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canBuyCredit && (
                <p className={`text-sm py-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("walletPage.buy.cannotBuyCredit", "Your current plan does not support buying extra credits.")}
                </p>
              )}

              {isLoadingPackages && packages.length === 0 && (
                <p className={isDarkMode ? "text-slate-400 text-sm" : "text-slate-600 text-sm"}>
                  {t("walletPage.buy.loading", "Loading...")}
                </p>
              )}
              {canBuyCredit && packages.map((pkg) => {
                const base = pkg.baseCredit ?? 0;
                const bonus = pkg.bonusCredit ?? 0;
                const packageName = String(pkg.displayName || pkg.code || "").trim()
                  || t("walletPage.buy.packageFallback", "Credit package {{id}}", { id: pkg.creditPackageId ?? "" }).trim();
                const baseCreditsLabel = t(
                  "walletPage.buy.baseCredits",
                  "{{count}} base credits",
                  { count: formatNumber(base, numberLocale) }
                );
                const bonusCreditsLabel = t(
                  "walletPage.buy.bonusCredits",
                  "+{{count}} bonus credits",
                  { count: formatNumber(bonus, numberLocale) }
                );
                return (
                <button
                  key={pkg.creditPackageId ?? `${packageName}-${base}-${bonus}`}
                  type="button"
                  onClick={() => buyCredits(pkg)}
                  className={`w-full text-left rounded-2xl p-4 ring-1 ring-inset transition-all active:scale-[0.99] cursor-pointer ${
                    isDarkMode
                      ? "bg-slate-950/30 ring-slate-700/60 hover:bg-slate-800/60"
                      : "bg-white ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`} title={packageName}>
                        {packageName}
                      </p>
                      <p
                        className={`mt-1 truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                        title={baseCreditsLabel}
                      >
                        {baseCreditsLabel}
                      </p>
                      <p
                        className={`mt-1 truncate text-sm ${bonus > 0
                          ? (isDarkMode ? "text-emerald-400" : "text-emerald-800")
                          : (isDarkMode ? "text-slate-500" : "text-slate-500")}`}
                        title={bonusCreditsLabel}
                      >
                        {bonusCreditsLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                        {formatVnd(pkg.price ?? 0, numberLocale)}
                      </p>
                    </div>
                  </div>
                </button>
              );})}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className={`backdrop-blur-xl ${
          isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60 shadow-slate-900/10"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-500" />
              {t("walletPage.history.title", "Transaction history")}
            </CardTitle>
            <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t("walletPage.history.subtitle", "The 20 most recent transactions on your wallet")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl overflow-hidden ring-1 ring-inset dark:ring-slate-700/60 ring-slate-200">
              <Table className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                <TableHeader className={isDarkMode ? "bg-slate-950/40" : "bg-slate-50"}>
                  <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("walletPage.history.table.time", "Time")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                      {t("walletPage.history.table.activity", "Activity")}
                    </TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                      {t("walletPage.history.table.workspace", "Workspace")}
                    </TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("walletPage.history.table.amount", "Credits")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTransactions && (
                    <TableRow>
                      <TableCell colSpan={4} className={`py-10 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {t("walletPage.history.loading", "Loading...")}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingTransactions && transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className={`py-10 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {t("walletPage.history.noHistory", "No transactions yet.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => {
                      const activity = getTransactionActivity(tx, t);

                      return (
                      <TableRow key={tx.id ?? `${tx.time}-${tx.type}-${tx.amount}`} className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                          {formatTime(tx.time, currentLang)}
                        </TableCell>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                          <div className="min-w-[200px]">
                            <p
                              className={`max-w-[420px] truncate font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
                              title={activity.title}
                            >
                              {activity.title}
                            </p>
                            {activity.subtitle ? (
                              <p
                                className={`mt-1 max-w-[420px] truncate text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                title={activity.subtitle}
                              >
                                {activity.subtitle}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                          <p
                            className={`max-w-[240px] truncate text-sm ${activity.workspaceName ? (isDarkMode ? "text-slate-200" : "text-slate-700") : (isDarkMode ? "text-slate-500" : "text-slate-400")}`}
                            title={activity.workspaceName || undefined}
                          >
                            {activity.workspaceName || t("walletPage.history.emptyWorkspace", "—")}
                          </p>
                        </TableCell>
                        <TableCell className={`font-bold tabular-nums ${tx.amount >= 0 ? (isDarkMode ? "text-emerald-400" : "text-emerald-700") : (isDarkMode ? "text-amber-400" : "text-amber-700")}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount, numberLocale)}
                        </TableCell>

                      </TableRow>
                    );})
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

