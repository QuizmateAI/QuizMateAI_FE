import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  CreditCard,
  Crown,
  Files,
  GraduationCap,
  Home,
  Lock,
  Moon,
  NotebookTabs,
  Pencil,
  ScrollText,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CreditIconImage from "@/components/ui/CreditIconImage";
import { getMyWallet } from "@/api/ManagementSystemAPI";
import { cn } from "@/lib/utils";
import { workspaceShellTheme, workspaceSurface } from "./workspaceShellTheme";
import VietnamFlag from "@/assets/Viet_nam.png";
import EnglishFlag from "@/assets/UK_flag.svg";
import JapanFlag from "@/assets/Japan_flag.svg";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { preloadWalletPage } from "@/lib/routeLoaders";
import { getBaseAppLanguage, getAppNumberLocale, appLanguageShortLabel } from "@/utils/appSupportedLanguages";

const NAV_ITEMS = [
  { key: "sources", icon: Files },
  { key: "roadmap", icon: ScrollText },
  {
    key: "quiz",
    icon: GraduationCap,
    children: [{ key: "quizAi" }, { key: "quizManual" }, { key: "quizFromJson" }],
  },
  {
    key: "flashcard",
    icon: CreditCard,
    children: [{ key: "flashcardAi" }, { key: "flashcardManual" }],
  },
  { key: "mockTest", icon: NotebookTabs },
  { key: "quizCollection", icon: Archive },
  { key: "questionStats", icon: BarChart3 },
];

const QUIZ_CHILD_MODE = { quizAi: "ai", quizManual: "manual", quizFromJson: "paste" };
const FLASHCARD_CHILD_MODE = { flashcardAi: "ai", flashcardManual: "manual" };

const MOBILE_NAV_ITEM_KEYS = new Set(["sources", "roadmap", "quiz"]);
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => MOBILE_NAV_ITEM_KEYS.has(item.key));

const EMPTY_WALLET_SUMMARY = {
  totalAvailableCredits: 0,
};

function formatNumber(value, locale) {
  try {
    return new Intl.NumberFormat(locale).format(Number(value) || 0);
  } catch {
    return String(value ?? 0);
  }
}

function PersonalWorkspaceSidebar({
  isDarkMode = false,
  workspaceTitle = "",
  activeView = "sources",
  onNavigate,
  /** AI / thủ công / JSON từ sidebar */
  onStudioSubAction,
  onOpenProfile,
  onToggleLanguage,
  onToggleDarkMode,
  onEditWorkspace,
  disabledMap = {},
  lockReasonMap = {},
  badgeMap = {},
  mobileOpen = false,
  onCloseMobile,
  isMobile = false,
  walletRefreshToken = 0,
  studioQuizSubKey = null,
  studioFlashcardSubKey = null,
}) {
  const { t, i18n } = useTranslation();
  const sidebarLang = getBaseAppLanguage(i18n.language);
  const fontClass = sidebarLang === "en" ? "font-poppins" : "font-sans";
  const walletLocale = getAppNumberLocale(i18n.language);
  const navigate = useNavigate();
  const location = useLocation();
  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const hasResolvedInitialWalletRef = useRef(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadWallet = async (silent = false) => {
      if (!silent) {
        setLoadingWallet(true);
      }
      try {
        const response = await getMyWallet();
        const payload = response?.data ?? response ?? EMPTY_WALLET_SUMMARY;
        if (cancelled) return;

        setWalletSummary({
          ...EMPTY_WALLET_SUMMARY,
          ...payload,
          totalAvailableCredits:
            payload?.totalAvailableCredits ?? payload?.balance ?? 0,
        });
        hasResolvedInitialWalletRef.current = true;
      } catch {
        if (!cancelled) {
          setWalletSummary(EMPTY_WALLET_SUMMARY);
          hasResolvedInitialWalletRef.current = true;
        }
      } finally {
        if (
          !cancelled &&
          (!silent || !hasResolvedInitialWalletRef.current || loadingWallet)
        ) {
          setLoadingWallet(false);
        }
      }
    };

    loadWallet(walletRefreshToken > 0);

    return () => {
      cancelled = true;
    };
  }, [walletRefreshToken]);

  const asideClasses = cn(
    cn(
      "z-30 flex h-full w-[228px] shrink-0 flex-col border-r transition-[transform,background-color,border-color,color] duration-300 ease-out",
      isDarkMode ? "border-slate-700/80 bg-slate-900 text-slate-100" : "border-slate-200/80 bg-white text-slate-900",
    ),
    isMobile
      ? cn(
          isDarkMode
            ? "fixed inset-y-0 left-0 shadow-[0_28px_80px_rgba(2,6,23,0.5)]"
            : "fixed inset-y-0 left-0 shadow-[0_28px_80px_rgba(15,23,42,0.14)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )
      : "relative",
  );

  const handleNavigate = (key) => {
    if (key === activeView && !disabledMap[key]) return;

    onNavigate?.(key);

    if (isMobile && !disabledMap[key]) {
      onCloseMobile?.();
    }
  };

  const resolvedStudioView = activeView;
  const quizBranchBusy = useMemo(
    () =>
      ["quiz", "createQuiz", "editQuiz", "quizDetail"].includes(String(resolvedStudioView || "")),
    [resolvedStudioView],
  );
  const flashcardBranchBusy = useMemo(
    () =>
      ["flashcard", "createFlashcard", "createManualFlashcard", "flashcardDetail"].includes(
        String(resolvedStudioView || ""),
      ),
    [resolvedStudioView],
  );

  const handleChildNavigate = (parentKey, childKey) => {
    if (disabledMap[parentKey]) return;
    if (typeof onStudioSubAction === "function") {
      onStudioSubAction({ parentId: parentKey, childId: childKey });
      if (isMobile) {
        onCloseMobile?.();
      }
      return;
    }
    handleNavigate(parentKey);
  };

  const handleGoHome = () => {
    navigate("/home", { state: { from: location.pathname } });
    if (isMobile) {
      onCloseMobile?.();
    }
  };

  const openEditDialog = () => {
    setEditTitle(workspaceTitle || "");
    setEditDescription("");
    setEditOpen(true);
  };

  const visibleNavItems = isMobile ? MOBILE_NAV_ITEMS : NAV_ITEMS;

  const handleSave = async () => {
    if (!onEditWorkspace) return;
    setSaving(true);
    try {
      await onEditWorkspace({
        name: editTitle,
        description: editDescription,
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const childList = Array.isArray(item.children) ? item.children : [];
    const hasChildren = childList.length > 0;
    const isDisabled = Boolean(disabledMap[item.key]);
    const badgeValue = badgeMap[item.key];
    const label = t(`workspace.shell.nav.${item.key}`, item.key);
    const lockReason = lockReasonMap[item.key];
    const isPlanLocked = isDisabled && lockReason === "plan";
    const isSourcesLocked = isDisabled && lockReason === "sources";
    const tooltipText = isPlanLocked
      ? t("workspace.shell.lockTooltip.plan", "Nâng cấp gói để mở khóa tính năng này")
      : isSourcesLocked
        ? t("workspace.shell.lockTooltip.sources", "Hãy tải tài liệu lên để sử dụng tính năng này")
        : "";

    const branchBusy =
      (item.key === "quiz" && quizBranchBusy) || (item.key === "flashcard" && flashcardBranchBusy);
    const isActive = activeView === item.key;
    const branchSelected = hasChildren ? isActive || branchBusy : isActive;
    const subNavOpen =
      hasChildren
      && (activeView === item.key
        || (item.key === "quiz" && quizBranchBusy)
        || (item.key === "flashcard" && flashcardBranchBusy));

    if (hasChildren) {
      return (
        <div key={item.key} className="group relative space-y-0.5">
          <button
            type="button"
            onClick={() => handleNavigate(item.key)}
            aria-current={activeView === item.key ? "page" : undefined}
            aria-disabled={isDisabled || undefined}
            className={cn(
              "flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left transition-[background-color,border-color,color,box-shadow] duration-200 ease-out",
              isDisabled
                ? isDarkMode
                  ? "cursor-pointer border-slate-700 bg-slate-800/70 text-slate-500 hover:border-slate-600 hover:bg-slate-800"
                  : "cursor-pointer border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-200/70"
                : branchSelected
                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.55)]"
                  : isDarkMode
                    ? "border-transparent bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                    : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out",
                isDisabled
                  ? isDarkMode
                    ? "border-slate-700 bg-slate-900 text-slate-500"
                    : "border-slate-200 bg-white text-slate-400"
                  : branchSelected
                    ? "border-blue-500 bg-blue-500 text-white"
                    : isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-300"
                      : "border-slate-200 bg-white text-slate-600",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>

            <span className={cn("min-w-0 flex-1 truncate text-[14px] font-semibold", fontClass)}>
              {label}
            </span>

            {isPlanLocked ? (
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  isDarkMode
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-amber-100 text-amber-600",
                )}
                aria-label={t("workspace.shell.lockBadge.plan", "Tính năng VIP")}
              >
                <Crown className="h-3 w-3" />
              </span>
            ) : isSourcesLocked ? (
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  isDarkMode
                    ? "bg-slate-700 text-slate-300"
                    : "bg-slate-200 text-slate-500",
                )}
                aria-label={t("workspace.shell.lockBadge.sources", "Cần tài liệu")}
              >
                <Lock className="h-3 w-3" />
              </span>
            ) : null}

            {!isDisabled && badgeValue ? (
              <span className={cn(
                "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-200 ease-out",
                branchSelected ? "bg-white text-blue-700" : isDarkMode ? "bg-slate-200 text-slate-900" : "bg-slate-900 text-white",
              )}>
                {badgeValue}
              </span>
            ) : null}
          </button>

          {subNavOpen ? (
            <div
              className={cn(
                "space-y-0.5 border-l-2 py-0.5 pl-2 ml-4",
                isDarkMode ? "border-slate-700" : "border-slate-200",
              )}
            >
              {childList.map((child) => {
                const modeValue =
                  item.key === "quiz"
                    ? QUIZ_CHILD_MODE[child.key]
                    : item.key === "flashcard"
                      ? FLASHCARD_CHILD_MODE[child.key]
                      : null;
                const subKey = item.key === "quiz" ? studioQuizSubKey : studioFlashcardSubKey;
                const childActive =
                  Boolean(modeValue && subKey && modeValue === subKey);
                return (
                  <button
                    key={child.key}
                    type="button"
                    onClick={() => handleChildNavigate(item.key, child.key)}
                    disabled={isDisabled}
                    className={cn(
                      "flex w-full items-center rounded-xl px-2 py-1.5 text-left text-[13px] font-medium transition-colors",
                      childActive
                        ? isDarkMode
                          ? "bg-blue-500/20 text-blue-100"
                          : "bg-blue-50 text-blue-800"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      isDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className={cn("truncate", fontClass)}>{t(`workspace.shell.nav.${child.key}`, child.key)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {tooltipText ? (
            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium leading-tight opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
                isDarkMode
                  ? "bg-slate-100 text-slate-900"
                  : "bg-slate-900 text-white",
                fontClass,
              )}
            >
              {tooltipText}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div key={item.key} className="group relative">
        <button
          type="button"
          onClick={() => handleNavigate(item.key)}
          aria-current={isActive ? "page" : undefined}
          aria-disabled={isDisabled || undefined}
          className={cn(
            "flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left transition-[background-color,border-color,color,box-shadow] duration-200 ease-out",
            isDisabled
              ? isDarkMode
                ? "cursor-pointer border-slate-700 bg-slate-800/70 text-slate-500 hover:border-slate-600 hover:bg-slate-800"
                : "cursor-pointer border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-200/70"
              : isActive
                ? "border-blue-600 bg-blue-600 text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.55)]"
                : isDarkMode
                  ? "border-transparent bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                  : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out",
              isDisabled
                ? isDarkMode
                  ? "border-slate-700 bg-slate-900 text-slate-500"
                  : "border-slate-200 bg-white text-slate-400"
                : isActive
                  ? "border-blue-500 bg-blue-500 text-white"
                  : isDarkMode
                    ? "border-slate-700 bg-slate-800 text-slate-300"
                    : "border-slate-200 bg-white text-slate-600",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>

          <span className={cn("min-w-0 flex-1 truncate text-[14px] font-semibold", fontClass)}>
            {label}
          </span>

          {isPlanLocked ? (
            <span
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                isDarkMode
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-amber-100 text-amber-600",
              )}
              aria-label={t("workspace.shell.lockBadge.plan", "Tính năng VIP")}
            >
              <Crown className="h-3 w-3" />
            </span>
          ) : isSourcesLocked ? (
            <span
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                isDarkMode
                  ? "bg-slate-700 text-slate-300"
                  : "bg-slate-200 text-slate-500",
              )}
              aria-label={t("workspace.shell.lockBadge.sources", "Cần tài liệu")}
            >
              <Lock className="h-3 w-3" />
            </span>
          ) : null}

          {!isDisabled && badgeValue ? (
            <span className={cn(
              "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-200 ease-out",
              isActive ? "bg-white text-blue-700" : isDarkMode ? "bg-slate-200 text-slate-900" : "bg-slate-900 text-white",
            )}>
              {badgeValue}
            </span>
          ) : null}
        </button>

        {tooltipText ? (
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium leading-tight opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
              isDarkMode
                ? "bg-slate-100 text-slate-900"
                : "bg-slate-900 text-white",
              fontClass,
            )}
          >
            {tooltipText}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          aria-label={t("common.close", "Close")}
          className="fixed inset-0 z-20 bg-slate-950/20 backdrop-blur-[2px]"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside className={asideClasses}>
        <div className={cn("border-b px-4 pb-3.5 pt-4", isDarkMode ? "border-slate-700/80" : "border-slate-200/80")}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoHome}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors duration-200 ease-out",
                  isDarkMode
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
                aria-label={t("common.home", "Home")}
                title={t("common.home", "Home")}
              >
                <Home className="h-4 w-4" />
              </button>

              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt={t("common.brandLogoAlt", { brandName: "QuizMate AI" })}
                className="h-[90px] w-auto object-contain"
              />
            </div>

            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out",
                  isDarkMode
                    ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
                aria-label={t("common.close", "Close")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : <span className="h-9 w-9" />}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-[18px] font-semibold leading-tight",
                  isDarkMode ? "text-slate-100" : "text-slate-950",
                  fontClass,
                )}
              >
                {workspaceTitle
                  || (i18n.language === "vi"
                    ? t("workspace.shell.sidebarLabel")
                    : t("workspace.shell.sidebarLabel"))}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onEditWorkspace ? (
                <button
                  type="button"
                  onClick={openEditDialog}
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out",
                    isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  aria-label={t("common.edit", "Edit")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
          <div className="space-y-1">
            {visibleNavItems.map(renderNavItem)}
          </div>
        </div>

        <div className={cn("border-t px-3.5 pb-3 pt-2.5", isDarkMode ? "border-slate-700/80" : "border-slate-200/80")}>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onPointerEnter={() => void preloadWalletPage()}
              onFocus={() => void preloadWalletPage()}
              onClick={() =>
                navigate("/wallets", { state: { from: location.pathname } })
              }
              className={cn(
                "col-span-3 flex h-auto min-h-[48px] min-w-0 items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 pr-3 text-left transition-colors duration-200 ease-out",
                isDarkMode
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : workspaceSurface("hover:bg-slate-50"),
              )}
            >
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50",
              )}>
                <CreditIconImage
                  alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })}
                  className="h-4 w-4 rounded-full"
                />
              </span>
              <span
                className={cn(
                  "flex min-w-0 flex-1 items-baseline gap-1 truncate tabular-nums",
                  isDarkMode ? "text-slate-100" : "text-slate-900",
                  fontClass,
                )}
              >
                {/* <span className="shrink-0 text-[16px] font-semibold">QMC:</span> */}
                <span className="truncate text-[16px] font-semibold">
                  {loadingWallet
                    ? "-"
                    : formatNumber(
                        walletSummary.totalAvailableCredits,
                        walletLocale,
                      )}
                </span>
                <span className={cn("shrink-0 text-[8px] font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {t("common.creditsUnit")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenProfile}
              className={cn(
                "col-span-1 flex h-auto min-h-[40x] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center transition-colors duration-200 ease-out",
                isDarkMode
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
              aria-label={t("workspace.settingsMenu.workspaceProfile", "Workspace Profile")}
              title={t("workspace.settingsMenu.workspaceProfile", "Workspace Profile")}
            >
              <UserCircle className="h-4 w-4" />
              <span className={cn("text-[10px] font-semibold leading-tight", fontClass)}>
                {t("workspace.shell.profileShort")}
              </span>
            </button>

            <div
              className={cn(
                "col-span-4 flex items-center gap-1 rounded-2xl border p-1",
                isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50",
              )}
            >
              <button
                type="button"
                onClick={onToggleLanguage}
                className={cn(
                  "flex h-auto min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 transition-colors duration-200 ease-out active:scale-95",
                  isDarkMode
                    ? "bg-slate-900 text-slate-100 hover:bg-slate-700"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                )}
                aria-label={t("common.switchLanguage")}
              >
                {sidebarLang === "vi" ? (
                  <img
                    src={VietnamFlag}
                    alt={t("common.languageVietnamese")}
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                ) : sidebarLang === "ja" ? (
                  <img
                    src={JapanFlag}
                    alt={t("common.languageJapanese")}
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                ) : (
                  <img
                    src={EnglishFlag}
                    alt={t("common.languageEnglish")}
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                )}
                <span className={cn("text-[13px] font-semibold", fontClass)}>
                  {appLanguageShortLabel(i18n.language)}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className={cn(
                  "flex h-auto min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 transition-colors duration-200 ease-out active:scale-95",
                  isDarkMode
                    ? "bg-slate-900 text-slate-100 hover:bg-slate-700"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                )}
                aria-label={isDarkMode ? t("common.light", "Light") : t("common.dark", "Dark")}
              >
                {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className={cn("text-[13px] font-semibold", fontClass)}>
                  {isDarkMode ? t("common.dark", "Dark") : t("common.light", "Light")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={workspaceShellTheme.page}>
          <DialogHeader>
            <DialogTitle className={fontClass}>
              {t("workspace.shell.editWorkspaceTitle", "Edit workspace")}
            </DialogTitle>
            <DialogDescription className={fontClass}>
              {t("workspace.shell.editWorkspaceDescription", "Update the name and description for this workspace.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={cn("text-sm font-medium", fontClass)}>
                {t("workspace.shell.editWorkspaceNameLabel", "Workspace name")}
              </label>
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className={workspaceShellTheme.input}
                placeholder={t("workspace.shell.editWorkspaceNamePlaceholder", "Enter workspace name...")}
              />
            </div>
            <div className="space-y-1.5">
              <label className={cn("text-sm font-medium", fontClass)}>
                {t("workspace.shell.editWorkspaceDescriptionLabel", "Description")}
              </label>
              <Input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className={workspaceShellTheme.input}
                placeholder={t("workspace.shell.editWorkspaceDescriptionPlaceholder", "Enter a short workspace description...")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !editTitle.trim()}
              className={workspaceShellTheme.primaryButton}
            >
              {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// memo: sidebar re-render nhiều khi parent (WorkspacePage) update state nhỏ →
// props ở đây (title, activeView, handler callbacks ổn định qua useCallback) ít đổi → memo giảm re-render.
export default memo(PersonalWorkspaceSidebar);
