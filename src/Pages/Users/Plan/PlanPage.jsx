import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Check,
  CreditCard,
  Globe,
  Map as MapIcon,
  MessageCircle,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import ListSpinner from "@/Components/ui/ListSpinner";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import CreditIconImage from "@/Components/ui/CreditIconImage";
import { getActiveGroupPlan, getActiveUserPlans, getMyWallet } from "@/api/ManagementSystemAPI";
import { useCurrentSubscription } from "@/hooks/useCurrentSubscription";

const MATERIAL_FORMATS = [
  { key: "processPdf", labelKey: "pdf" },
  { key: "processWord", labelKey: "word" },
  { key: "processSlide", labelKey: "slide" },
  { key: "processExcel", labelKey: "excel" },
  { key: "processText", labelKey: "text" },
  { key: "processImage", labelKey: "image" },
  { key: "processVideo", labelKey: "video" },
  { key: "processAudio", labelKey: "audio" },
];

const CAPABILITY_FIELDS = [
  { key: "canCreateRoadMap", labelKey: "roadmaps" },
  { key: "hasAiCompanionMode", labelKey: "companion" },
  { key: "hasAiSummaryAndTextReading", labelKey: "summaries" },
  { key: "hasWorkspaceAnalytics", labelKey: "analytics" },
  { key: "hasAdvanceQuizConfig", labelKey: "advancedQuiz" },
];

const formatVnd = (amount, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const isForeverDuration = (durationInDay) => {
  const n = Number(durationInDay);
  return Number.isFinite(n) && n >= 999999;
};

const formatList = (items, locale) => {
  if (!items.length) return "";
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
};

const formatNumber = (value, locale) => {
  try {
    return new Intl.NumberFormat(locale).format(Number(value) || 0);
  } catch {
    return String(value ?? 0);
  }
};

const EMPTY_WALLET_SUMMARY = {
  totalAvailableCredits: 0,
  regularCreditBalance: 0,
  planCreditBalance: 0,
  hasActivePlan: false,
  planCreditExpiresAt: null,
};

/** Map PlanCatalogResponse sang format gọn cho trang plan. */
function mapPlanCatalogToCard(plan) {
  const e = plan.entitlement ?? {};
  const type = plan.planScope === "USER" ? "INDIVIDUAL" : "GROUP";

  return {
    planId: plan.planCatalogId,
    planName: plan.displayName,
    price: plan.price ?? 0,
    type,
    durationInDay: 999999,
    entitlement: e,
    planFeature: {
      processPdf: e.canProcessPdf,
      processWord: e.canProcessWord,
      processSlide: e.canProcessSlide,
      processExcel: e.canProcessExcel,
      processText: e.canProcessText,
      processImage: e.canProcessImage,
      processVideo: e.canProcessVideo,
      processAudio: e.canProcessAudio,
    },
    bonusCreditOnPlanPurchase: e.bonusCreditOnPlanPurchase ?? 0,
  };
}

function buildFormatSummary(plan, t, locale) {
  const labels = getSupportedFormatLabels(plan, t);

  if (labels.length === 0) return null;
  if (labels.length === 1) {
    return t("plan.bullets.singleFormat", { format: labels[0] });
  }
  if (labels.length <= 3) {
    return t("plan.bullets.multiFormat", { formats: formatList(labels, locale) });
  }
  return t("plan.bullets.multiFormatMore", {
    formats: formatList(labels.slice(0, 3), locale),
    count: labels.length - 3,
  });
}

function getSupportedFormatLabels(plan, t) {
  return MATERIAL_FORMATS
    .filter(({ key }) => plan.planFeature?.[key])
    .map(({ labelKey }) => t(`plan.formats.${labelKey}`));
}

function getRecommendedPlanIndex(plans) {
  if (plans.length <= 1) return -1;
  const firstPaidIndex = plans.findIndex((plan) => Number(plan.price) > 0);
  return firstPaidIndex >= 0 ? firstPaidIndex : 0;
}

function getPlanTierKey({ plan, index, totalPlans }) {
  if (plan.type === "GROUP") return "GROUP";
  if (Number(plan.price) === 0 || index === 0) return "FREE";
  if (index === totalPlans - 1) return "TITANIUM";
  return "PRO";
}

function getPlanFeatureCatalog(plan, t, locale) {
  const e = plan.entitlement ?? {};
  const items = [];
  const formatSummary = buildFormatSummary(plan, t, locale);

  if (formatSummary) {
    items.push({
      key: "formats",
      bullet: formatSummary,
      name: t("plan.featureNames.multiformatImport"),
    });
  }
  if (e.canCreateRoadMap) {
    items.push({
      key: "roadmaps",
      bullet: t("plan.bullets.roadmaps"),
      name: t("plan.featureNames.roadmaps"),
    });
  }
  if (e.hasAiCompanionMode) {
    items.push({
      key: "companion",
      bullet: t("plan.bullets.companion"),
      name: t("plan.featureNames.companion"),
    });
  }
  if (e.hasAiSummaryAndTextReading) {
    items.push({
      key: "summaries",
      bullet: t("plan.bullets.summaries"),
      name: t("plan.featureNames.summaries"),
    });
  }
  if (e.hasWorkspaceAnalytics) {
    items.push({
      key: "analytics",
      bullet: t("plan.bullets.analytics"),
      name: t("plan.featureNames.analytics"),
    });
  }
  if (e.hasAdvanceQuizConfig) {
    items.push({
      key: "advancedQuiz",
      bullet: t("plan.bullets.advancedQuiz"),
      name: t("plan.featureNames.advancedQuiz"),
    });
  }
  if (Number(plan.bonusCreditOnPlanPurchase) > 0) {
    items.push({
      key: "bonus",
      bullet: t("plan.bullets.bonusCredits", { count: plan.bonusCreditOnPlanPurchase }),
      name: t("plan.featureNames.bonusCredits"),
    });
  }

  return items;
}

function pickCatalogItems(catalog, priorityKeys, limit) {
  const catalogMap = new Map(catalog.map((item) => [item.key, item]));
  return priorityKeys.map((key) => catalogMap.get(key)).filter(Boolean).slice(0, limit);
}

function buildPlanHighlights(plan, previousPlan, tierKey, t, locale) {
  const highlights = [];
  const catalog = getPlanFeatureCatalog(plan, t, locale);

  const priorityMap = {
    FREE: ["formats", "roadmaps", "companion", "summaries"],
    PRO: ["roadmaps", "companion", "summaries", "formats", "analytics", "advancedQuiz", "bonus"],
    TITANIUM: ["analytics", "advancedQuiz", "bonus", "summaries", "companion", "roadmaps", "formats"],
    GROUP: ["formats", "roadmaps", "companion", "summaries", "analytics", "advancedQuiz", "bonus"],
  };

  if (tierKey === "GROUP") {
    highlights.push(t("plan.bullets.groupCollab"));
  } else if (previousPlan) {
    highlights.push(t("plan.bullets.includesPrevious", { planName: previousPlan.planName }));
  }

  pickCatalogItems(catalog, priorityMap[tierKey] ?? [], tierKey === "FREE" ? 3 : 4)
    .forEach((item) => highlights.push(item.bullet));

  if (highlights.length === 0) {
    highlights.push(t("plan.bullets.coreAi"));
  }

  return Array.from(new Set(highlights)).slice(0, tierKey === "FREE" ? 3 : 5);
}

function buildDynamicDescription({ plan, previousPlan, tierKey, t, locale }) {
  const catalog = getPlanFeatureCatalog(plan, t, locale);
  const descriptionPriorities = {
    PRO: ["companion", "summaries", "roadmaps", "formats", "analytics", "advancedQuiz", "bonus"],
    TITANIUM: ["analytics", "advancedQuiz", "bonus", "summaries", "formats", "companion", "roadmaps"],
    GROUP: ["formats", "roadmaps", "companion", "analytics", "advancedQuiz", "bonus"],
  };

  if (tierKey === "FREE") return t("plan.descriptions.free");
  if (tierKey === "GROUP") return t("plan.descriptions.group");

  const featureNames = pickCatalogItems(catalog, descriptionPriorities[tierKey] ?? [], 2)
    .map((item) => item.name);

  if (featureNames.length === 0) {
    return t("plan.descriptions.includesPreviousSimple", {
      previousPlan: previousPlan?.planName ?? "",
    });
  }

  return t("plan.descriptions.includesPrevious", {
    previousPlan: previousPlan?.planName ?? "",
    extras: formatList(featureNames, locale),
  });
}

function getPlanDescription({ plan, index, plans, t, locale }) {
  const previousPlan = index > 0 ? plans[index - 1] : null;
  const tierKey = getPlanTierKey({ plan, index, totalPlans: plans.length });
  return buildDynamicDescription({ plan, previousPlan, tierKey, t, locale });
}

function isMatchingCurrentPlan(plan, currentPlanSummary, planType) {
  if (!plan || !currentPlanSummary?.planName) return false;

  const summaryType = String(currentPlanSummary.planType || "").toUpperCase();
  if (planType === "INDIVIDUAL" && summaryType && summaryType !== "INDIVIDUAL") return false;
  if (planType === "GROUP" && summaryType && summaryType !== "GROUP") return false;

  const summaryId = String(currentPlanSummary.planId || "").trim();
  const currentPlanId = String(plan.planId || "").trim();
  if (summaryId && currentPlanId) {
    return currentPlanId === summaryId;
  }

  const summaryName = String(currentPlanSummary.planName || "").trim().toLowerCase();
  const currentPlanName = String(plan.planName || "").trim().toLowerCase();
  return Boolean(summaryName) && currentPlanName === summaryName;
}

function PlanTierCard({
  plan,
  index,
  plans,
  totalPlans,
  recommendedIndex,
  isDarkMode,
  locale,
  t,
  isCurrentPlan = false,
  onUpgrade,
}) {
  const previousPlan = index > 0 ? plans[index - 1] : null;
  const tierKey = getPlanTierKey({ plan, index, totalPlans });
  const isRecommended = totalPlans > 1 && index === recommendedIndex && Number(plan.price) > 0;
  const isDefaultPlan = Number(plan.price) === 0;
  const description = getPlanDescription({ plan, index, plans, t, locale });
  const highlights = buildPlanHighlights(plan, previousPlan, tierKey, t, locale);

  const surfaceClass = isRecommended
    ? isDarkMode
      ? "border-indigo-400/55 bg-[linear-gradient(180deg,rgba(79,70,229,0.24),rgba(15,23,42,0.92))] shadow-[0_24px_80px_rgba(79,70,229,0.32)]"
      : "border-indigo-300 bg-[linear-gradient(180deg,rgba(238,242,255,0.95),rgba(255,255,255,0.98))] shadow-[0_20px_60px_rgba(99,102,241,0.18)]"
    : isDarkMode
      ? "border-white/10 bg-slate-950/72 shadow-[0_18px_56px_rgba(2,6,23,0.36)]"
      : "border-slate-200 bg-white/88 shadow-[0_18px_48px_rgba(15,23,42,0.08)]";

  const ctaClass = isRecommended
    ? "bg-indigo-500 text-white hover:bg-indigo-400"
    : isDarkMode
      ? "bg-white/5 text-white ring-1 ring-white/12 hover:bg-white/10"
      : "bg-slate-950 text-white hover:bg-slate-800";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 ${surfaceClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70 blur-3xl ${
          isRecommended
            ? isDarkMode
              ? "bg-indigo-500/35"
              : "bg-indigo-200/70"
            : isDarkMode
              ? "bg-slate-700/20"
              : "bg-slate-200/60"
        }`}
      />

      {isRecommended && (
        <div className="absolute right-5 top-5 z-10">
          <Badge className="whitespace-nowrap rounded-full border-0 bg-indigo-500 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-none">
            {t("plan.mostPopular")}
          </Badge>
        </div>
      )}

      <div className="relative flex h-full flex-col">
        <div className={`flex items-start justify-between gap-3 ${isRecommended ? "pr-28" : ""}`}>
          <div>
            <p className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>
              {plan.planName}
            </p>
            <p className={`mt-2 max-w-[24ch] text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {description}
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-end gap-2">
          <span className={`text-4xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-950"}`}>
            {formatVnd(plan.price, locale)}
          </span>
          <span className={`pb-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            / {isForeverDuration(plan.durationInDay) ? t("plan.durationForeverShort") : t("plan.durationDays", { count: plan.durationInDay })}
          </span>
        </div>

        <Button
          type="button"
          onClick={isDefaultPlan || isCurrentPlan ? undefined : () => onUpgrade(plan)}
          disabled={isDefaultPlan || isCurrentPlan}
          className={`mt-8 h-12 rounded-2xl font-semibold cursor-pointer disabled:cursor-default disabled:opacity-100 ${ctaClass} ${
            isDefaultPlan || isCurrentPlan
              ? isDarkMode
                ? "bg-white/6 text-slate-400 ring-1 ring-white/8 hover:bg-white/6"
                : "bg-slate-100 text-slate-500 hover:bg-slate-100"
              : ""
          }`}
        >
          {isCurrentPlan
            ? t("plan.currentCta")
            : isDefaultPlan
            ? t("plan.defaultPlan")
            : plan.type === "GROUP"
              ? t("plan.teamCta")
              : t("plan.upgrade")}
        </Button>

        <div className={`mt-8 border-t pt-6 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
          <ul className="space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    isRecommended
                      ? "bg-indigo-400/18 text-indigo-200"
                      : isDarkMode
                        ? "bg-white/8 text-slate-200"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className={`text-sm leading-6 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function useSettingsMenu({ fontClass, isDarkMode, toggleDarkMode, toggleLanguage }) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsRef, setSettingsRef] = useState(null);
  const currentLang = i18n.language;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (settingsRef && !settingsRef.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, settingsRef]);

  const menu = (
    <div ref={setSettingsRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-full ${
          isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">{t("common.settings")}</span>
      </Button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
            isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              toggleLanguage();
            }}
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
            onClick={() => {
              setIsOpen(false);
              toggleDarkMode();
            }}
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
          <div className={`h-px w-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`} />
        </div>
      )}
    </div>
  );

  return { menu };
}

export default function PlanPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;
  const locale = currentLang === "vi" ? "vi-VN" : "en-US";

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const [planType, setPlanType] = useState("INDIVIDUAL");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const { summary: currentPlanSummary } = useCurrentSubscription();

  const switchPlanType = (type) => {
    setPlanType(type);
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchPlans = planType === "GROUP"
      ? getActiveGroupPlan().then((res) => {
          const data = res?.data;
          return data ? [data] : [];
        })
      : getActiveUserPlans().then((res) => {
          const data = res?.data ?? res;
          return Array.isArray(data) ? data : [];
        });

    fetchPlans
      .then((list) => {
        if (cancelled) return;
        const normalizedPlans = list
          .map(mapPlanCatalogToCard)
          .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
        setPlans(normalizedPlans);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("plan.loadError"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [planType, t]);

  useEffect(() => {
    let cancelled = false;

    const fetchWallet = async () => {
      setLoadingWallet(true);
      try {
        const res = await getMyWallet();
        const data = res?.data ?? res;
        if (cancelled) return;
        setWalletSummary({
          ...EMPTY_WALLET_SUMMARY,
          ...data,
          totalAvailableCredits: data?.totalAvailableCredits ?? data?.balance ?? 0,
          regularCreditBalance: data?.regularCreditBalance ?? 0,
          planCreditBalance: data?.planCreditBalance ?? 0,
          hasActivePlan: Boolean(data?.hasActivePlan),
          planCreditExpiresAt: data?.planCreditExpiresAt ?? null,
        });
      } catch {
        if (!cancelled) setWalletSummary(EMPTY_WALLET_SUMMARY);
      } finally {
        if (!cancelled) setLoadingWallet(false);
      }
    };

    fetchWallet();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpgrade = useCallback((plan) => {
    const url = plan.type === "GROUP"
      ? `/payment?planId=${plan.planId}&planType=GROUP`
      : `/payment?planId=${plan.planId}`;
    navigate(url);
  }, [navigate]);

  const displayPlans = plans;

  const recommendedIndex = useMemo(() => getRecommendedPlanIndex(displayPlans), [displayPlans]);

  const studyFeatureTiles = useMemo(() => {
    const hasRoadmap = plans.some((plan) => plan.entitlement?.canCreateRoadMap);
    const hasCompanion = plans.some((plan) => plan.entitlement?.hasAiCompanionMode);
    const hasSummary = plans.some((plan) => plan.entitlement?.hasAiSummaryAndTextReading);
    const hasAnalytics = plans.some((plan) => plan.entitlement?.hasWorkspaceAnalytics);
    const hasAdvancedQuiz = plans.some((plan) => plan.entitlement?.hasAdvanceQuizConfig);

    return [
      hasRoadmap && {
        key: "roadmap",
        icon: MapIcon,
        title: t("plan.studyFeatures.roadmap.title"),
        desc: t("plan.studyFeatures.roadmap.desc"),
      },
      hasCompanion && {
        key: "companion",
        icon: MessageCircle,
        title: t("plan.studyFeatures.companion.title"),
        desc: t("plan.studyFeatures.companion.desc"),
      },
      hasSummary && {
        key: "summary",
        icon: BookOpenText,
        title: t("plan.studyFeatures.summary.title"),
        desc: t("plan.studyFeatures.summary.desc"),
      },
      hasAnalytics && {
        key: "analytics",
        icon: BarChart3,
        title: t("plan.studyFeatures.analytics.title"),
        desc: t("plan.studyFeatures.analytics.desc"),
      },
      hasAdvancedQuiz && {
        key: "advancedQuiz",
        icon: Sparkles,
        title: t("plan.studyFeatures.advancedQuiz.title"),
        desc: t("plan.studyFeatures.advancedQuiz.desc"),
      },
    ].filter(Boolean);
  }, [plans, t]);

  const notes = useMemo(
    () => ([
      { title: t("plan.notes.permanentTitle"), desc: t("plan.notes.permanentDesc") },
      { title: t("plan.notes.creditsTitle"), desc: t("plan.notes.creditsDesc") },
      { title: t("plan.notes.refundTitle"), desc: t("plan.notes.refundDesc") },
    ]),
    [t],
  );

  const { menu: settingsMenu } = useSettingsMenu({
    fontClass,
    isDarkMode,
    toggleDarkMode,
    toggleLanguage,
  });

  const backTo = location.state?.from || "/home";
  const pageSurfaceClass = isDarkMode
    ? "bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#020617_100%)] text-slate-50"
    : "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_30%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_42%,#eef2ff_100%)] text-slate-900";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${pageSurfaceClass}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl ${
          isDarkMode ? "bg-indigo-500/18" : "bg-indigo-200/65"
        }`} />
        <div className={`absolute bottom-0 right-0 h-80 w-80 translate-x-1/4 rounded-full blur-3xl ${
          isDarkMode ? "bg-cyan-400/10" : "bg-blue-100/60"
        }`} />
      </div>

      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
        isDarkMode ? "border-white/10 bg-slate-950/72" : "border-slate-200 bg-white/78"
      }`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex w-[110px] cursor-pointer items-center md:w-[130px]"
              aria-label="Go to Home"
            >
              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt="QuizMate AI Logo"
                className="h-auto w-full object-contain"
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/wallet", { state: { from: "/plan" } })}
              className={`flex h-10 items-center gap-2 rounded-full px-3.5 cursor-pointer ${
                isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-label={t("common.wallet")}
            >
              <span className={`inline-flex items-center justify-center rounded-full ring-1 ring-inset ${
                isDarkMode ? "bg-blue-500/10 ring-blue-400/25" : "bg-blue-600/10 ring-blue-600/20"
              }`}>
                <CreditIconImage alt="Quizmate Credit" className="h-6 w-6 rounded-full" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-semibold">
                  {loadingWallet ? "—" : formatNumber(walletSummary.totalAvailableCredits, locale)}
                </span>
                <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("wallet.creditsUnit", "Credit")}
                </span>
              </span>
            </Button>
            {settingsMenu}
            <UserProfilePopover isDarkMode={isDarkMode} />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className={`relative overflow-hidden rounded-[32px] border px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 ${
          isDarkMode ? "border-white/10 bg-slate-950/42" : "border-white/70 bg-white/70"
        }`}>
          <div className={`pointer-events-none absolute inset-0 ${
            isDarkMode
              ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(2,6,23,0.25))]"
              : "bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(238,242,255,0.32))]"
          }`} />

          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(backTo, { replace: true })}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors cursor-pointer ${
                      isDarkMode
                        ? "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10"
                        : "bg-white/85 text-slate-700 ring-slate-200 hover:bg-white"
                    }`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("plan.back")}
                  </button>

                  <Badge className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    isDarkMode
                      ? "border-0 bg-indigo-400/12 text-indigo-100"
                      : "border-0 bg-indigo-100 text-indigo-700"
                  }`}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {t("plan.heroBadge")}
                  </Badge>
                </div>

                <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
                  {t("plan.title")}
                </h1>
                <p className={`mt-3 max-w-2xl text-sm leading-7 sm:text-base ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}>
                  {t("plan.subtitle")}
                </p>
              </div>

              <div className={`max-w-md rounded-[24px] border p-4 sm:p-5 ${
                isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/80"
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl ${
                    isDarkMode ? "bg-indigo-400/12 text-indigo-100" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t("plan.creditModel.title")}</p>
                    <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {t("plan.creditModel.desc")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate("/wallet")}
                    className="h-11 rounded-2xl bg-indigo-500 px-5 text-white hover:bg-indigo-400 cursor-pointer"
                  >
                    {t("plan.creditModel.cta")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className={`h-11 rounded-2xl px-5 cursor-pointer ${
                      isDarkMode
                        ? "border-white/12 bg-white/5 text-slate-100 hover:bg-white/10"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {t("plan.creditModel.guide")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <div className={`inline-flex rounded-full p-1 ring-1 ring-inset ${
                isDarkMode ? "bg-white/6 ring-white/10" : "bg-white/85 ring-slate-200"
              }`}>
                {["INDIVIDUAL", "GROUP"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => switchPlanType(type)}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition-all cursor-pointer ${
                      planType === type
                        ? isDarkMode
                          ? "bg-indigo-500 text-white shadow-[0_12px_30px_rgba(99,102,241,0.32)]"
                          : "bg-slate-950 text-white shadow"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-white/6 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {t(`plan.types.${type === "INDIVIDUAL" ? "individual" : "group"}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10">
              {loading ? (
                <ListSpinner variant="section" className="py-16" />
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <AlertCircle className={`h-8 w-8 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{error}</p>
                </div>
              ) : displayPlans.length === 0 ? (
                <p className={`py-16 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {t("plan.noPlans")}
                </p>
              ) : (
                <div
                  className={`grid gap-5 ${
                    displayPlans.length === 1
                      ? "mx-auto max-w-md"
                      : displayPlans.length === 2
                        ? "mx-auto max-w-5xl lg:grid-cols-2"
                        : "xl:grid-cols-3"
                  }`}
                >
                  {displayPlans.map((plan, index) => (
                    <PlanTierCard
                      key={plan.planId}
                      plan={plan}
                      index={index}
                      plans={displayPlans}
                      totalPlans={displayPlans.length}
                      recommendedIndex={recommendedIndex}
                      isDarkMode={isDarkMode}
                      locale={locale}
                      t={t}
                      isCurrentPlan={isMatchingCurrentPlan(plan, currentPlanSummary, planType)}
                      onUpgrade={handleUpgrade}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {studyFeatureTiles.length > 0 && (
          <section className="mt-14">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("plan.studyFeatures.title")}</h2>
              <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t("plan.studyFeatures.subtitle")}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {studyFeatureTiles.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.key}
                    className={`rounded-[24px] border p-5 ${
                      isDarkMode ? "border-white/10 bg-slate-950/56" : "border-slate-200 bg-white/82"
                    }`}
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isDarkMode ? "bg-indigo-400/12 text-indigo-100" : "bg-indigo-100 text-indigo-700"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className={`mt-4 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>
                      {feature.title}
                    </p>
                    <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.title}
              className={`rounded-[24px] border p-5 ${
                isDarkMode ? "border-white/10 bg-slate-950/48" : "border-slate-200 bg-white/82"
              }`}
            >
              <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>{note.title}</p>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{note.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
