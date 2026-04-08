import { useEffect, useRef, useState } from "react";
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
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import CreditIconImage from "@/Components/ui/CreditIconImage";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/Utils/getErrorMessage";
import {
  getMyWallet,
  getPurchaseableCreditPackages,
  getMyWalletTransactions,
} from "@/api/ManagementSystemAPI";
import { getCachedSubscription } from "@/Utils/userCache";

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

function formatFallbackLabel(value, lang) {
  if (!value) return lang === "vi" ? "Khác" : "Other";

  return String(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTransactionTypeLabel(type, lang) {
  const normalized = String(type || "").toUpperCase();
  const labels = {
    WELCOME: lang === "vi" ? "Credit chào mừng" : "Welcome credits",
    TOPUP: lang === "vi" ? "Nạp credit" : "Credit top-up",
    CONSUME: lang === "vi" ? "Dùng credit AI" : "AI credit usage",
    RESERVE: lang === "vi" ? "Tạm giữ credit" : "Credit reserved",
    RESERVE_CANCELLED: lang === "vi" ? "Hoàn tạm giữ" : "Reserve released",
    REFUND: lang === "vi" ? "Hoàn credit" : "Credit refund",
    ADJUST: lang === "vi" ? "Điều chỉnh credit" : "Credit adjustment",
    PLAN_BONUS: lang === "vi" ? "Credit từ gói" : "Plan credits",
    PLAN_EXPIRE_RESET: lang === "vi" ? "Reset credit gói" : "Plan reset",
  };

  return labels[normalized] || formatFallbackLabel(type, lang);
}

function getTransactionSourceLabel(source, lang) {
  const normalized = String(source || "").toUpperCase();
  const labels = {
    SYSTEM: lang === "vi" ? "Hệ thống" : "System",
    PAYMENT: lang === "vi" ? "Thanh toán" : "Payment",
    AI_USAGE: lang === "vi" ? "AI sử dụng" : "AI usage",
    USER_PLAN: lang === "vi" ? "Gói của bạn" : "Your plan",
    WORKSPACE_PLAN: lang === "vi" ? "Gói nhóm" : "Group plan",
    ADMIN: lang === "vi" ? "Quản trị viên" : "Admin",
  };

  return labels[normalized] || (source ? formatFallbackLabel(source, lang) : "—");
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
    .replace(/\s+\[(?:PARTIAL_REFUND|RELEASED)[^\]]*\]/gi, "")
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

function getAiActionActivity(actionKey, lang) {

  const activityMap = {
    PROCESS_PDF: {
      title: lang === "vi" ? "Bạn đã tải lên tài liệu PDF" : "You uploaded a PDF",
    },
    PROCESS_IMAGE: {
      title: lang === "vi" ? "Bạn đã tải lên hình ảnh" : "You uploaded an image",
    },
    PROCESS_TEXT: {
      title: lang === "vi" ? "Bạn đã gửi văn bản để AI xử lý" : "You sent text for AI processing",
    },
    PROCESS_DOCX: {
      title: lang === "vi" ? "Bạn đã tải lên tài liệu Word" : "You uploaded a Word document",
    },
    PROCESS_XLSX: {
      title: lang === "vi" ? "Bạn đã tải lên file Excel" : "You uploaded an Excel file",
    },
    PROCESS_PPTX: {
      title: lang === "vi" ? "Bạn đã tải lên slide PowerPoint" : "You uploaded a PowerPoint deck",
    },
    PROCESS_AUDIO: {
      title: lang === "vi" ? "Bạn đã tải lên tệp âm thanh" : "You uploaded an audio file",
    },
    PROCESS_VIDEO: {
      title: lang === "vi" ? "Bạn đã tải lên video" : "You uploaded a video",
    },
    GENERATE_QUIZ: {
      title: lang === "vi" ? "Bạn đã tạo bài quiz" : "You generated a quiz",
    },
    PREVIEW_QUIZ_STRUCTURE: {
      title: lang === "vi" ? "Bạn đã xem trước cấu trúc quiz" : "You previewed a quiz structure",
    },
    GENERATE_FLASHCARDS: {
      title: lang === "vi" ? "Bạn đã tạo flashcard" : "You generated flashcards",
    },
    GENERATE_MOCK_TEST: {
      title: lang === "vi" ? "Bạn đã tạo đề luyện tập" : "You generated a mock test",
    },
    GENERATE_ROADMAP: {
      title: lang === "vi" ? "Bạn đã tạo lộ trình học" : "You generated a study roadmap",
    },
    GENERATE_ROADMAP_PHASES: {
      title: lang === "vi" ? "Bạn đã tạo các giai đoạn học" : "You generated roadmap phases",
    },
    GENERATE_ROADMAP_PHASE_CONTENT: {
      title: lang === "vi" ? "Bạn đã tạo nội dung học tập" : "You generated study content",
    },
    GENERATE_ROADMAP_KNOWLEDGE_QUIZ: {
      title: lang === "vi" ? "Bạn đã tạo quiz kiến thức" : "You generated a knowledge quiz",
    },
    SUGGEST_LEARNING_RESOURCES: {
      title: lang === "vi" ? "Bạn đã gợi ý tài liệu học" : "You requested learning resources",
    },
    ANALYZE_STUDY_PROFILE_KNOWLEDGE: {
      title: lang === "vi" ? "Bạn đã phân tích hồ sơ học tập" : "You analyzed a study profile",
    },
    SUGGEST_STUDY_PROFILE_FIELDS: {
      title: lang === "vi" ? "Bạn đã gợi ý thông tin hồ sơ học tập" : "You requested study profile suggestions",
    },
    SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: {
      title: lang === "vi" ? "Bạn đã gợi ý mẫu đề phù hợp" : "You requested exam template suggestions",
    },
    VALIDATE_STUDY_PROFILE_CONSISTENCY: {
      title: lang === "vi" ? "Bạn đã kiểm tra hồ sơ học tập" : "You validated a study profile",
    },
  };

  return activityMap[actionKey] || {
    title: lang === "vi" ? "Bạn đã dùng một tính năng AI" : "You used an AI feature",
  };
}

function formatUiActivityTitle(actionKey, target, lang) {
  const safeTarget = String(target || "").trim();
  const withTarget = (viPrefix, enPrefix) =>
    safeTarget ? `${lang === "vi" ? viPrefix : enPrefix}${safeTarget}` : getAiActionActivity(actionKey, lang).title;

  const titleMap = {
    PROCESS_PDF: withTarget("Đã tải lên PDF: ", "Uploaded PDF: "),
    PROCESS_DOCX: withTarget("Đã tải lên file Word: ", "Uploaded Word file: "),
    PROCESS_PPTX: withTarget("Đã tải lên slide: ", "Uploaded slides: "),
    PROCESS_XLSX: withTarget("Đã tải lên file Excel: ", "Uploaded Excel file: "),
    PROCESS_IMAGE: withTarget("Đã tải lên ảnh: ", "Uploaded image: "),
    PROCESS_AUDIO: withTarget("Đã tải lên audio: ", "Uploaded audio: "),
    PROCESS_VIDEO: withTarget("Đã tải lên video: ", "Uploaded video: "),
    PROCESS_TEXT: withTarget("Đã gửi văn bản: ", "Processed text: "),
    GENERATE_QUIZ: withTarget("Đã tạo quiz: ", "Generated quiz: "),
    GENERATE_FLASHCARDS: withTarget("Đã tạo flashcard từ: ", "Generated flashcards from: "),
    GENERATE_MOCK_TEST: withTarget("Đã tạo mock test: ", "Generated mock test: "),
    GENERATE_ROADMAP: withTarget("Đã tạo roadmap: ", "Generated roadmap: "),
    GENERATE_ROADMAP_PHASES: withTarget("Đã tạo phase cho: ", "Generated phases for: "),
    GENERATE_ROADMAP_PHASE_CONTENT: withTarget("Đã tạo nội dung cho: ", "Generated content for: "),
    GENERATE_ROADMAP_KNOWLEDGE_QUIZ: withTarget("Đã tạo quiz kiến thức: ", "Generated knowledge quiz: "),
  };

  return titleMap[actionKey] || withTarget("Đã dùng AI cho: ", "Used AI for: ");
}

function getReadableNote(note) {
  const normalizedNote = sanitizeActivityNote(note);
  if (!normalizedNote) return "";
  if (normalizedNote.startsWith("UI_ACTIVITY|") || normalizedNote.startsWith("UI_ACTIVITY_V2|")) return "";
  if (/^AI\s+[A-Z_]+:/i.test(normalizedNote)) return "";
  return normalizedNote;
}

function getAiUsageActivity(tx, lang) {
  const uiActivity = parseUiActivityNote(tx?.note);
  if (uiActivity) {
    return {
      title: formatUiActivityTitle(uiActivity.actionKey, uiActivity.target, lang),
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
      title: getAiActionActivity(aiUsageMeta.actionKey, lang).title,
      subtitle: "",
      workspaceName: "",
    };
  }

  return {
    title: lang === "vi" ? "Bạn đã dùng một tính năng AI" : "You used an AI feature",
    subtitle: "",
    workspaceName: "",
  };
}

function getTransactionActivity(tx, lang) {
  const normalizedType = String(tx?.type || "").toUpperCase();
  const normalizedSource = String(tx?.source || "").toUpperCase();
  if (normalizedSource === "AI_USAGE") {
    return getAiUsageActivity(tx, lang);
  }

  if (normalizedType === "WELCOME") {
    return {
      title: lang === "vi" ? "Bạn đã nhận credit chào mừng" : "You received welcome credits",
      subtitle: lang === "vi" ? "Quà tặng dành cho tài khoản mới" : "A welcome bonus for your new account",
      workspaceName: "",
    };
  }

  if (normalizedType === "PLAN_BONUS") {
    return {
      title: lang === "vi" ? "Bạn đã nhận credit từ gói" : "You received plan credits",
      subtitle: lang === "vi" ? "Credit đi kèm gói đã được cộng vào ví" : "Included plan credits were added to your wallet",
      workspaceName: "",
    };
  }

  if (normalizedType === "TOPUP") {
    return {
      title: lang === "vi" ? "Bạn đã nạp thêm credit" : "You topped up credits",
      subtitle: lang === "vi" ? "Credit đã được cộng vào ví của bạn" : "Credits were added to your wallet",
      workspaceName: "",
    };
  }

  if (normalizedType === "REFUND") {
    return {
      title: lang === "vi" ? "Bạn đã được hoàn lại credit" : "You received a credit refund",
      subtitle: lang === "vi" ? "Số credit chưa dùng đã được hoàn về ví" : "Unused credits were returned to your wallet",
      workspaceName: "",
    };
  }

  if (normalizedType === "RESERVE_CANCELLED") {
    return {
      title: lang === "vi" ? "Một khoản tạm giữ đã được hoàn" : "A reserved amount was released",
      subtitle: lang === "vi" ? "Credit tạm giữ đã được trả lại vào ví" : "Reserved credits were returned to your wallet",
      workspaceName: "",
    };
  }

  if (normalizedType === "PLAN_EXPIRE_RESET") {
    return {
      title: lang === "vi" ? "Credit gói đã được làm mới" : "Plan credits were reset",
      subtitle: lang === "vi" ? "Hệ thống đã reset credit theo chu kỳ gói" : "The system reset your plan credits for the next cycle",
      workspaceName: "",
    };
  }

  return {
    title: getTransactionTypeLabel(tx?.type, lang),
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
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  const subscription = getCachedSubscription();
  const canBuyCredit = subscription?.entitlement?.canBuyCredit !== false;

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
    let cancelled = false;

    const fetchWalletData = async () => {
      setIsLoadingWallet(true);
      setIsLoadingTransactions(true);
      setIsLoadingPackages(true);
      try {
        const [walletRes, packagesRes, txRes] = await Promise.all([
          getMyWallet(),
          getPurchaseableCreditPackages(),
          getMyWalletTransactions(0, 20),
        ]);

        if (cancelled) return;

        const walletData = walletRes?.data ?? walletRes;
        const normalizedWallet = normalizeWalletSummary(walletData);

        const pkgData = packagesRes?.data ?? packagesRes;

        const page = txRes?.data ?? txRes;
        let mappedTx = normalizeTransactions(page);
        let finalWallet = normalizedWallet;

        const latestTxBalance = mappedTx[0]?.balanceAfter;
        const walletBalance = normalizedWallet.totalAvailableCredits ?? 0;

        // Avoid showing a split-brain snapshot when balance and history are fetched
        // around the same moment while multiple AI charges are still committing.
        if (latestTxBalance != null && latestTxBalance !== walletBalance) {
          const [walletRetryRes, txRetryRes] = await Promise.all([
            getMyWallet(),
            getMyWalletTransactions(0, 20),
          ]);
          if (cancelled) return;

          finalWallet = normalizeWalletSummary(walletRetryRes?.data ?? walletRetryRes);
          mappedTx = normalizeTransactions(txRetryRes?.data ?? txRetryRes);
        }

        setWalletSummary(finalWallet);
        setPackages(Array.isArray(pkgData) ? pkgData : []);
        setTransactions(mappedTx);
      } catch (err) {
        if (!cancelled) {
          showError(getFriendlyError(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWallet(false);
          setIsLoadingTransactions(false);
          setIsLoadingPackages(false);
        }
      }
    };

    fetchWalletData();
    return () => {
      cancelled = true;
    };
  }, [showError, t]);

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
              aria-label="Go to Home"
            >
              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt="QuizMate AI Logo"
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
            {t("wallet.back")}
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
                    {t("wallet.title")}
                  </CardTitle>
                  <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
                    {t("wallet.subtitle")}
                  </CardDescription>
                </div>
                <Badge className={`rounded-full px-3 py-1 ${
                  isDarkMode ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"
                }`}>
                  {t("wallet.badge")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`rounded-2xl p-5 ring-1 ring-inset ${
                isDarkMode ? "bg-slate-950/40 ring-slate-700/60" : "bg-white ring-slate-200"
              }`}>
                <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{t("wallet.totalAvailable")}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold tracking-tight ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                    {formatNumber(walletSummary.totalAvailableCredits, currentLang === "vi" ? "vi-VN" : "en-US")}
                  </span>
                  <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {t("wallet.creditsUnit")}
                  </span>
                </div>
                <div className={`mt-3 inline-flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <Sparkles className={`w-4 h-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
                  {t("wallet.hint")}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-2xl px-4 py-3 ring-1 ring-inset ${
                    isDarkMode ? "bg-slate-900/60 ring-slate-700/60" : "bg-white/80 ring-slate-200"
                  }`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {t("wallet.regularCredits")}
                    </p>
                    <p className={`mt-2 text-2xl font-bold tabular-nums ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                      {formatNumber(walletSummary.regularCreditBalance, currentLang === "vi" ? "vi-VN" : "en-US")}
                    </p>
                  </div>
                  {walletSummary.hasActivePlan && (
                    <div className={`rounded-2xl px-4 py-3 ring-1 ring-inset ${
                      isDarkMode ? "bg-slate-900/60 ring-slate-700/60" : "bg-white ring-slate-200"
                    }`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                        {t("wallet.planCredits")}
                      </p>
                      <p className={`mt-2 text-2xl font-bold tabular-nums ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                        {formatNumber(walletSummary.planCreditBalance, currentLang === "vi" ? "vi-VN" : "en-US")}
                      </p>
                      {walletSummary.planCreditExpiresAt && (
                        <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {t("wallet.expiresAt")}: {formatTime(walletSummary.planCreditExpiresAt, currentLang)}
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
                    Pricing Guide
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
                {t("wallet.buyTitle")}
              </CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
                {t("wallet.buySubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canBuyCredit && (
                <p className={`text-sm py-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("wallet.cannotBuyCredit", { defaultValue: "Gói hiện tại của bạn không hỗ trợ mua credit. Hãy nâng cấp gói để tiếp tục." })}
                </p>
              )}

              {isLoadingPackages && packages.length === 0 && (
                <p className={isDarkMode ? "text-slate-400 text-sm" : "text-slate-600 text-sm"}>
                  ...
                </p>
              )}
              {canBuyCredit && packages.map((pkg) => {
                const base = pkg.baseCredit ?? 0;
                const bonus = pkg.bonusCredit ?? 0;
                const packageName = String(pkg.displayName || pkg.code || "").trim()
                  || `${currentLang === "vi" ? "Gói credit" : "Credit package"} ${pkg.creditPackageId ?? ""}`.trim();
                const baseCreditsLabel = currentLang === "vi"
                  ? `${formatNumber(base, "vi-VN")} credit gốc`
                  : `${formatNumber(base, "en-US")} base credits`;
                const bonusCreditsLabel = currentLang === "vi"
                  ? `+${formatNumber(bonus, "vi-VN")} bonus credit`
                  : `+${formatNumber(bonus, "en-US")} bonus credits`;
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
                        {formatVnd(pkg.price ?? 0, currentLang === "vi" ? "vi-VN" : "en-US")}
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
              {t("wallet.historyTitle")}
            </CardTitle>
            <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t("wallet.historySubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl overflow-hidden ring-1 ring-inset dark:ring-slate-700/60 ring-slate-200">
              <Table className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                <TableHeader className={isDarkMode ? "bg-slate-950/40" : "bg-slate-50"}>
                  <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.time")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                      {currentLang === "vi" ? "Hoạt động" : "Activity"}
                    </TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                      {currentLang === "vi" ? "Workspace" : "Workspace"}
                    </TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.amount")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                      {currentLang === "vi" ? "Nguồn" : "Source"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTransactions && (
                    <TableRow>
                      <TableCell colSpan={5} className={`py-10 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        ...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingTransactions && transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className={`py-10 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {t("wallet.noHistory")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => {
                      const activity = getTransactionActivity(tx, currentLang);

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
                            {activity.workspaceName || "—"}
                          </p>
                        </TableCell>
                        <TableCell className={`font-bold tabular-nums ${tx.amount >= 0 ? (isDarkMode ? "text-emerald-400" : "text-emerald-700") : (isDarkMode ? "text-amber-400" : "text-amber-700")}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount, currentLang === "vi" ? "vi-VN" : "en-US")}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTransactionSourceBadgeClass(tx.source, isDarkMode)}`}>
                            {getTransactionSourceLabel(tx.source, currentLang)}
                          </span>
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

