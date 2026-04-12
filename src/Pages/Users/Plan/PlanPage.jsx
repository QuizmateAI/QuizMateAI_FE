import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Check,
  Globe,
  Map as MapIcon,
  MessageCircle,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useGroup } from "@/hooks/useGroup";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import ListSpinner from "@/Components/ui/ListSpinner";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import CreditIconImage from "@/Components/ui/CreditIconImage";
import { getActiveGroupPlan, getActiveUserPlans, getMyWallet } from "@/api/ManagementSystemAPI";
import { getWorkspaceCurrentPlan } from "@/api/WorkspaceAPI";
import { createPlanSummaryFromSubscription, useCurrentSubscription } from "@/hooks/useCurrentSubscription";
import { buildWalletsPath } from "@/lib/routePaths";

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

function normalizeWorkspaceId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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
  purchaseLocked = false,
  purchaseLockedLabel = "",
  onUpgrade,
  compact = false,
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
  const showCtaRow = !isDefaultPlan || isCurrentPlan;
  const isActionDisabled = isCurrentPlan || purchaseLocked || (isDefaultPlan && !isCurrentPlan);

  const cardPad = compact ? "p-5 sm:p-5" : "p-6 sm:p-7";
  const cardRadius = compact ? "rounded-[22px]" : "rounded-[28px]";
  const heroBlur = compact ? "h-24" : "h-32";
  const priceSize = compact ? "text-3xl" : "text-4xl";
  const blockGap = compact ? "mt-5" : "mt-8";
  const listGap = compact ? "space-y-2" : "space-y-3";
  const featTopPad = compact ? "pt-4" : "pt-6";
  const ctaGap = compact ? "mt-5 h-11 rounded-xl" : "mt-8 h-12 rounded-2xl";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden ${cardRadius} border ${cardPad} transition-all duration-300 hover:-translate-y-1 ${surfaceClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 ${heroBlur} opacity-70 blur-3xl ${
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

        <div className={`${blockGap} flex items-end gap-2`}>
          <span className={`${priceSize} font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-950"}`}>
            {formatVnd(plan.price, locale)}
          </span>
          <span className={`pb-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            / {isForeverDuration(plan.durationInDay) ? t("plan.durationForeverShort") : t("plan.durationDays", { count: plan.durationInDay })}
          </span>
        </div>

        <div className={`${blockGap} flex-1 border-t ${featTopPad} ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
          <ul className={listGap}>
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

        {showCtaRow ? (
          <Button
            type="button"
            onClick={isActionDisabled ? undefined : () => onUpgrade(plan)}
            disabled={isActionDisabled}
            className={`${ctaGap} font-semibold cursor-pointer disabled:cursor-default disabled:opacity-100 ${ctaClass} ${
              isActionDisabled
                ? isDarkMode
                  ? "bg-white/6 text-slate-400 ring-1 ring-white/8 hover:bg-white/6"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                : ""
            }`}
          >
            {isCurrentPlan
              ? t("plan.currentCta")
              : purchaseLocked
                ? purchaseLockedLabel
              : plan.type === "GROUP"
                ? t("plan.teamCta")
                : t("plan.upgrade")}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function useSettingsMenu({ fontClass, isDarkMode, toggleDarkMode, toggleLanguage }) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsRef, setSettingsRef] = useState(null);
  const currentLang = i18n?.language || "vi";

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
  const [searchParams] = useSearchParams();
  const currentLang = i18n?.language || "vi";
  const fontClass = currentLang === "en" ? "font-poppins" : "font-sans";
  const locale = currentLang === "vi" ? "vi-VN" : "en-US";
  const scopedWorkspaceId = normalizeWorkspaceId(searchParams.get("workspaceId"));
  const requestedPlanType = String(searchParams.get("planType") || "").toUpperCase();
  const isGroupScopedPage = requestedPlanType === "GROUP" && scopedWorkspaceId != null;
  const planType = isGroupScopedPage ? "GROUP" : "INDIVIDUAL";

  const toggleLanguage = () => {
    if (!i18n?.changeLanguage) return;
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [groupCurrentPlan, setGroupCurrentPlan] = useState(null);
  const { summary: userPlanSummary } = useCurrentSubscription({ enabled: !isGroupScopedPage });
  const { groups, loading: loadingGroups } = useGroup({ enabled: isGroupScopedPage });
  const scopedGroup = useMemo(
    () => groups.find((group) => String(group.workspaceId) === String(scopedWorkspaceId)) ?? null,
    [groups, scopedWorkspaceId],
  );
  const isScopedGroupLeader = scopedGroup?.memberRole === "LEADER";
  const currentPlanSummary = useMemo(
    () => (isGroupScopedPage ? createPlanSummaryFromSubscription(groupCurrentPlan) : userPlanSummary),
    [groupCurrentPlan, isGroupScopedPage, userPlanSummary],
  );
  const pageTitle = isGroupScopedPage
    ? t("plan.groupScopeTitle", {
        groupName: scopedGroup?.groupName || t("plan.groupFallbackName"),
      })
    : t("plan.title");
  const pageSubtitle = isGroupScopedPage
    ? t("plan.groupScopeSubtitle")
    : t("plan.subtitle");
  const sectionLoading = loading || (isGroupScopedPage && loadingGroups);
  const groupPurchaseLocked = isGroupScopedPage && (!scopedGroup || !isScopedGroupLeader);
  const groupPurchaseLockLabel = groupPurchaseLocked
    ? t("plan.groupLeaderManagedCta")
    : "";

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const fetchPlans = isGroupScopedPage
      ? getActiveGroupPlan().then((res) => {
          const raw = res?.data?.data ?? res?.data ?? res;
          return Array.isArray(raw) ? raw : raw ? [raw] : [];
        })
      : getActiveUserPlans().then((res) => {
          const raw = res?.data?.data ?? res?.data ?? res;
          return Array.isArray(raw) ? raw : [];
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
  }, [isGroupScopedPage, t]);

  useEffect(() => {
    if (!isGroupScopedPage || !scopedWorkspaceId) {
      setGroupCurrentPlan(null);
      return undefined;
    }

    let cancelled = false;

    getWorkspaceCurrentPlan(scopedWorkspaceId)
      .then((res) => {
        if (!cancelled) {
          setGroupCurrentPlan(res?.data?.data ?? res?.data ?? res ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGroupCurrentPlan(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isGroupScopedPage, scopedWorkspaceId]);

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

  const handleUpgrade = useCallback(
    (plan) => {
      if (plan.type === "GROUP") {
        const params = new URLSearchParams({
          planId: String(plan.planId),
          planType: "GROUP",
        });
        if (scopedWorkspaceId != null) {
          params.set("workspaceId", String(scopedWorkspaceId));
        }
        navigate(`/payment?${params.toString()}`);
        return;
      }
      navigate(`/payment?planId=${plan.planId}`);
    },
    [navigate, scopedWorkspaceId],
  );

  const displayPlans = plans;

  const recommendedIndex = useMemo(() => getRecommendedPlanIndex(displayPlans), [displayPlans]);

  const isCompactGroupPlanLayout = isGroupScopedPage && displayPlans.length === 2;

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

  const backTo = location.state?.from
    || (isGroupScopedPage && scopedWorkspaceId != null ? `/group-workspaces/${scopedWorkspaceId}` : "/home");
  const pageSurfaceClass = isDarkMode
    ? "bg-slate-950 text-slate-50"
    : "bg-slate-50 text-slate-900";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${pageSurfaceClass}`}>
      <header className={`sticky top-0 z-30 border-b ${
        isDarkMode ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
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
              onClick={() => navigate(buildWalletsPath(), { state: { from: "/plans" } })}
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

      <main
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${
          isCompactGroupPlanLayout ? "py-3 sm:py-4" : "py-8"
        }`}
      >
        <section
          className={`rounded-[24px] border ${
            isCompactGroupPlanLayout ? "px-4 py-4 sm:px-5 sm:py-5" : "px-5 py-6 sm:px-8 sm:py-8"
          } ${isDarkMode ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}
        >
          <div>
            <div className={`flex flex-col ${isCompactGroupPlanLayout ? "gap-2" : "gap-4"}`}>
              <button
                type="button"
                onClick={() => navigate(backTo, { replace: true })}
                className={`inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isDarkMode
                    ? "text-slate-200 hover:bg-white/5"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("plan.back")}
              </button>

              <div>
                <h1
                  className={
                    isCompactGroupPlanLayout
                      ? "max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl"
                      : "max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl"
                  }
                >
                  {pageTitle}
                </h1>
                <p
                  className={`max-w-2xl text-sm leading-6 sm:text-base ${
                    isCompactGroupPlanLayout ? "mt-1.5" : "mt-3 leading-7"
                  } ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                >
                  {pageSubtitle}
                </p>
              </div>

            </div>

            <div
              className={`border-t ${
                isCompactGroupPlanLayout ? "mt-3 pt-3" : "mt-6 pt-4"
              } ${isDarkMode ? "border-white/10" : "border-slate-200"}`}
            >
              <p className="text-sm font-semibold">
                {isGroupScopedPage ? t("plan.groupScopeNoticeTitle") : t("plan.groupEntryTitle")}
              </p>
              <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {isGroupScopedPage
                  ? t(
                      isScopedGroupLeader
                        ? "plan.groupScopeLeaderDesc"
                        : "plan.groupScopeMemberDesc",
                      {
                        groupName: scopedGroup?.groupName || t("plan.groupFallbackName"),
                      },
                    )
                  : t("plan.groupEntryDesc")}
              </p>
            </div>

            <div className={isCompactGroupPlanLayout ? "mt-4" : "mt-10"}>
              {sectionLoading ? (
                <ListSpinner variant="section" className={isCompactGroupPlanLayout ? "py-8" : "py-16"} />
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
                  className={`grid ${
                    displayPlans.length === 1
                      ? "mx-auto max-w-md gap-5"
                      : displayPlans.length === 2
                        ? isGroupScopedPage
                          ? "mx-auto w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2"
                          : "mx-auto max-w-5xl gap-5 lg:grid-cols-2"
                        : "gap-5 xl:grid-cols-3"
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
                      purchaseLocked={groupPurchaseLocked}
                      purchaseLockedLabel={groupPurchaseLockLabel}
                      onUpgrade={handleUpgrade}
                      compact={isCompactGroupPlanLayout}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {(studyFeatureTiles.length > 0 || notes.length > 0) && (
          <section
            className={`${isCompactGroupPlanLayout ? "mt-6" : "mt-12"} rounded-[20px] border p-5 sm:p-6 ${
              isDarkMode ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
            }`}
          >
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">{t("plan.studyFeatures.title")}</h2>
              <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t("plan.studyFeatures.subtitle")}
              </p>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="grid gap-4 md:grid-cols-2">
                {studyFeatureTiles.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.key}
                      className={`flex gap-4 rounded-xl border p-4 ${
                        isDarkMode ? "border-white/10 bg-slate-900" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isDarkMode ? "bg-white/5 text-slate-200" : "bg-white text-slate-700"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>
                          {feature.title}
                        </p>
                        <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`rounded-xl border p-4 ${
                isDarkMode ? "border-white/10 bg-slate-900" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div
                      key={note.title}
                      className={index > 0 ? `border-t pt-4 ${isDarkMode ? "border-white/10" : "border-slate-200"}` : ""}
                    >
                      <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>{note.title}</p>
                      <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{note.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
