import React, { memo, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Files,
  GraduationCap,
  Home,
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
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import CreditIconImage from "@/Components/ui/CreditIconImage";
import { getMyWallet } from "@/api/ManagementSystemAPI";
import { cn } from "@/lib/utils";
import { workspaceShellTheme, workspaceSurface } from "./workspaceShellTheme";
import VietnamFlag from "@/assets/Viet_nam.png";
import EnglishFlag from "@/assets/UK_flag.svg";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { preloadWalletPage } from "@/lib/routeLoaders";

const NAV_ITEMS = [
  { key: "sources", icon: Files },
  { key: "roadmap", icon: ScrollText },
  { key: "quiz", icon: GraduationCap },
  { key: "flashcard", icon: CreditCard },
  { key: "mockTest", icon: NotebookTabs },
  { key: "questionStats", icon: BarChart3 },
];

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
  onOpenProfile,
  onToggleLanguage,
  onToggleDarkMode,
  onEditWorkspace,
  disabledMap = {},
  badgeMap = {},
  mobileOpen = false,
  onCloseMobile,
  isMobile = false,
  walletRefreshToken = 0,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const walletLocale = i18n.language === "vi" ? "vi-VN" : "en-US";
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
    if (disabledMap[key]) return;
    if (key === activeView) return;

    onNavigate?.(key);

    if (isMobile) {
      onCloseMobile?.();
    }
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
    const isActive = activeView === item.key;
    const isDisabled = Boolean(disabledMap[item.key]);
    const badgeValue = badgeMap[item.key];
    const label = t(`workspace.shell.nav.${item.key}`, item.key);

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => handleNavigate(item.key)}
        disabled={isDisabled}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left transition-[background-color,border-color,color,box-shadow] duration-200 ease-out",
          isDisabled
            ? isDarkMode
              ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
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
            isActive
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

        {badgeValue ? (
          <span className={cn(
            "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-200 ease-out",
            isActive ? "bg-white text-blue-700" : isDarkMode ? "bg-slate-200 text-slate-900" : "bg-slate-900 text-white",
          )}>
            {badgeValue}
          </span>
        ) : null}
      </button>
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
                alt="QuizMate AI"
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
                    ? "Không gian học tập cá nhân"
                    : "Personal workspace")}
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
            {NAV_ITEMS.map(renderNavItem)}
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
                  alt="QuizMate Credits"
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
                  credit
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
                {i18n.language === "vi" ? "Hồ sơ" : "Profile"}
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
                aria-label={i18n.language === "vi" ? "Tiếng Việt" : "English"}
              >
                {i18n.language === "vi" ? (
                  <img
                    src={VietnamFlag}
                    alt="Tiếng Việt"
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                ) : (
                  <img
                    src={EnglishFlag}
                    alt="English"
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                )}
                <span className={cn("text-[13px] font-semibold", fontClass)}>
                  {i18n.language === "vi" ? "VI" : "EN"}
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
