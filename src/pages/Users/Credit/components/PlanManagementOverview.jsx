import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertCircle, ArrowUpRight, CalendarDays, CreditCard, Plus, ReceiptText, RefreshCw, ShieldCheck, Calculator, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreditIconImage from "@/components/ui/CreditIconImage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getMyWalletTransactions,
  getGroupWorkspaceWalletTransactions,
  getPurchaseableCreditPackages,
  getUserPayments,
  getWorkspacePayments,
} from "@/api/ManagementSystemAPI";
import { buildPaymentCreditsPath, buildWalletsPath, withQueryParams } from "@/lib/routePaths";
import {
  creditSourceLabel,
  creditTransactionLabel,
  formatUiActivitySubtitle,
  formatUiActivityTitle,
  parseUiActivityNote,
  sanitizeActivityNote,
} from "@/utils/creditTransactionLabels";
import CustomCreditPurchaseCard from "./CustomCreditPurchaseCard";

const PAYMENT_TARGET_LABELS = {
  USER_PLAN: "plan.manage.target.userPlan",
  WORKSPACE_PLAN: "plan.manage.target.workspacePlan",
  USER_CREDIT: "plan.manage.target.userCredit",
  WORKSPACE_CREDIT: "plan.manage.target.workspaceCredit",
  WORKSPACE_SLOT: "plan.manage.target.workspaceSlot",
};

const PAYMENT_STATUS_KEYS = {
  PENDING: "plan.manage.status.pending",
  COMPLETED: "plan.manage.status.completed",
  FAILED: "plan.manage.status.failed",
  CANCELLED: "plan.manage.status.cancelled",
};

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

function formatVnd(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale);
}

function getDaysUntil(value) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  return Math.ceil(diffMs / 86400000);
}

function normalizePayments(response) {
  const data = response?.data?.data ?? response?.data ?? response ?? {};
  return Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
}

function normalizeTransactions(response) {
  const data = response?.data?.data ?? response?.data ?? response ?? {};
  return Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
}

function getChangeStyle(change, isDarkMode) {
  if (change > 0) {
    return isDarkMode ? "text-emerald-300" : "text-emerald-700";
  }
  if (change < 0) {
    return isDarkMode ? "text-amber-300" : "text-amber-700";
  }
  return isDarkMode ? "text-slate-300" : "text-slate-700";
}

function normalizeCreditPackages(response) {
  const data = response?.data?.data ?? response?.data ?? response ?? [];
  return Array.isArray(data) ? data : [];
}

function getCreditPackageName(pkg, t) {
  return String(pkg?.displayName || pkg?.code || "").trim()
    || t("walletPage.buy.packageFallback", "Credit package {{id}}", { id: pkg?.creditPackageId ?? "" }).trim();
}

function getStatusBadgeClass(status, isDarkMode) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "COMPLETED") {
    return isDarkMode
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "PENDING") {
    return isDarkMode
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "FAILED") {
    return isDarkMode
      ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
      : "border-rose-200 bg-rose-50 text-rose-700";
  }

  return isDarkMode
    ? "border-slate-600 bg-slate-800 text-slate-300"
    : "border-slate-200 bg-slate-100 text-slate-700";
}

function getPaymentTitle(payment, t) {
  const directName = String(
    payment?.planName
    || payment?.planDisplayName
    || payment?.creditPackageName
    || payment?.creditPackageDisplayName
    || "",
  ).trim();

  if (directName) return directName;

  const targetKey = PAYMENT_TARGET_LABELS[String(payment?.paymentTargetType || "").toUpperCase()];
  return targetKey ? t(targetKey) : t("plan.manage.target.payment");
}

export default function PlanManagementOverview({
  currentPlanSummary,
  isDarkMode,
  locale,
  loadingWallet,
  walletSummary,
  isGroupScopedPage = false,
  workspaceId = null,
  canBuyCredit = true,
  onBrowsePlans,
  onTopUpCredits,
}) {
  const { t, i18n } = useTranslation();
  const lang = String(i18n?.language || "vi").startsWith("en") ? "en" : "vi";
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [creditPackages, setCreditPackages] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingCreditPackages, setLoadingCreditPackages] = useState(true);
  const [paymentError, setPaymentError] = useState("");
  const [confirmPackage, setConfirmPackage] = useState(null);
  const [isCustomCreditDialogOpen, setIsCustomCreditDialogOpen] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState("payment");
  const [usageTransactions, setUsageTransactions] = useState([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState("");
  const [usageAttempted, setUsageAttempted] = useState(false);

  const activePlanName = currentPlanSummary?.planName || t("plan.manage.freePlan");
  const activePlanStatus = currentPlanSummary?.status || "ACTIVE";
  const activePlanEndDate = currentPlanSummary?.endDate
    ? formatDate(currentPlanSummary.endDate, locale)
    : t("plan.manage.noExpiry");
  const daysUntilPlanEnds = getDaysUntil(currentPlanSummary?.endDate);
  const showPlanEndHint = currentPlanSummary?.endDate && daysUntilPlanEnds !== null;
  const planEndHintText = showPlanEndHint
    ? (daysUntilPlanEnds > 0
      ? t("plan.manage.planEndsIn", "Your plan ends in {{count}} days", { count: daysUntilPlanEnds })
      : daysUntilPlanEnds === 0
        ? t("plan.manage.planEndsToday", "Your plan ends today")
        : t("plan.manage.planExpired", "Your plan has expired"))
    : "";

  const totalCredits = Number(walletSummary?.totalAvailableCredits || 0);
  const planCredits = Number(walletSummary?.planCreditBalance || 0);
  const regularCredits = Number(walletSummary?.regularCreditBalance || 0);
  const planCreditExpiresAt = walletSummary?.planCreditExpiresAt || null;
  const showPlanCreditExpiry = planCredits > 0 && Boolean(planCreditExpiresAt);

  const heading = isGroupScopedPage
    ? t("plan.manage.groupTitle")
    : t("plan.manage.title");
  const historyHeading = isGroupScopedPage
    ? t("plan.manage.history.groupTitle")
    : t("plan.manage.history.title");
  const usageHeading = isGroupScopedPage
    ? t("plan.manage.history.usage.groupTitle", "Group usage history")
    : t("plan.manage.history.usage.title", "Usage history");
  const isUsageTab = activeHistoryTab === "usage";

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    setPaymentError("");
    try {
      const response = isGroupScopedPage && workspaceId
        ? await getWorkspacePayments(workspaceId, 0, 5)
        : await getUserPayments(0, 5);
      setPayments(normalizePayments(response));
    } catch {
      setPayments([]);
      setPaymentError(t("plan.manage.history.loadError"));
    } finally {
      setLoadingPayments(false);
    }
  }, [isGroupScopedPage, workspaceId, t]);

  const loadUsage = useCallback(async () => {
    setLoadingUsage(true);
    setUsageError("");
    setUsageAttempted(true);
    try {
      const response = isGroupScopedPage && workspaceId
        ? await getGroupWorkspaceWalletTransactions(workspaceId, 0, 5)
        : await getMyWalletTransactions(0, 5);
      setUsageTransactions(normalizeTransactions(response));
    } catch {
      setUsageTransactions([]);
      setUsageError(t("plan.manage.history.usage.loadError", "Unable to load usage history."));
    } finally {
      setLoadingUsage(false);
    }
  }, [isGroupScopedPage, workspaceId, t]);

  useEffect(() => {
    setUsageAttempted(false);
    setUsageTransactions([]);
    setUsageError("");
  }, [isGroupScopedPage, workspaceId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      await loadPayments();
    });
    return () => {
      cancelled = true;
    };
  }, [loadPayments]);

  useEffect(() => {
    if (!isUsageTab || usageAttempted) return;
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      await loadUsage();
    });
    return () => {
      cancelled = true;
    };
  }, [isUsageTab, usageAttempted, loadUsage]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoadingCreditPackages(true);

      try {
        const response = await getPurchaseableCreditPackages();
        if (cancelled) return;
        setCreditPackages(normalizeCreditPackages(response));
      } catch {
        if (cancelled) return;
        setCreditPackages([]);
      } finally {
        if (!cancelled) setLoadingCreditPackages(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const openCreditCheckout = (pkg) => {
    if (!pkg?.creditPackageId) return;

    const queryParams = { creditPackageId: pkg.creditPackageId };
    if (isGroupScopedPage && workspaceId) {
      queryParams.workspaceId = workspaceId;
    }

    navigate(withQueryParams(buildPaymentCreditsPath(), queryParams), {
      state: { from: buildWalletsPath(), workspaceId },
    });
  };

  const confirmBaseCredit = Number(confirmPackage?.baseCredit || 0);
  const confirmBonusCredit = Number(confirmPackage?.bonusCredit || 0);
  const confirmTotalCredit = confirmBaseCredit + confirmBonusCredit;
  const confirmPackageName = confirmPackage ? getCreditPackageName(confirmPackage, t) : "";

  return (
    <section className="mt-8 space-y-6">
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <div className={`h-full rounded-[24px] border p-5 sm:p-6 ${
          isDarkMode ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
        }`}>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                isDarkMode ? "text-blue-200/80" : "text-blue-700"
              }`}>
                {t("plan.manage.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{heading}</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onBrowsePlans}
              className={`w-full justify-center sm:w-auto ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" : "border-slate-200 bg-white"}`}
            >
              {t("plan.manage.changePlan")}
            </Button>
          </div>

          <div className={`${isDarkMode ? "bg-blue-500/15 ring-blue-400/20" : "bg-blue-600 text-white"} rounded-[22px] p-5 ring-1`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Badge
                  variant="outline"
                  className={isDarkMode ? "border-blue-300/30 bg-blue-300/10 text-blue-100" : "border-white/25 bg-white/15 text-white"}
                >
                  {t("plan.manage.currentBadge")}
                </Badge>
                <h3 className="mt-4 truncate text-2xl font-black">{activePlanName}</h3>
                <p className={isDarkMode ? "mt-1 text-sm text-blue-100/80" : "mt-1 text-sm text-blue-50"}>
                  {t("plan.manage.statusLabel")}: {t(`plan.manage.subscriptionStatus.${activePlanStatus}`, activePlanStatus)}
                </p>
              </div>
              <CreditCard className="h-6 w-6 shrink-0" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className={isDarkMode ? "text-xs text-blue-100/70" : "text-xs text-blue-50"}>
                  {t("plan.manage.validUntil")}
                </p>
                <p className="mt-1 text-sm font-bold">{activePlanEndDate}</p>
              </div>
              <div>
                <p className={isDarkMode ? "text-xs text-blue-100/70" : "text-xs text-blue-50"}>
                  {t("plan.manage.scope")}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {isGroupScopedPage ? t("plan.types.group") : t("plan.types.individual")}
                </p>
              </div>
            </div>

            {showPlanEndHint ? (
              <div className={`mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3 text-xs ${
                isDarkMode ? "border-white/10 text-blue-100/85" : "border-white/20 text-blue-50"
              }`}>
                <span>{planEndHintText}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onBrowsePlans}
                  className="cursor-pointer font-semibold underline underline-offset-2 transition hover:opacity-80"
                >
                  {t("plan.manage.resubscribe", "Resubscribe")}
                </button>
              </div>
            ) : null}
          </div>

          <div className={`mt-5 border-t pt-5 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  isDarkMode ? "text-slate-500" : "text-slate-500"
                }`}>
                  {t("plan.manage.creditWallet")}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <CreditIconImage
                    alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })}
                    className="h-10 w-10 rounded-2xl"
                  />
                  <p className="text-3xl font-black tabular-nums">
                    {loadingWallet ? "-" : formatNumber(totalCredits, locale)}
                  </p>
                </div>
              </div>
              <Wallet className={isDarkMode ? "h-5 w-5 text-slate-400" : "h-5 w-5 text-slate-500"} />
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className={`rounded-xl px-3 py-2 ring-1 ring-inset ${
                isDarkMode
                  ? "bg-emerald-500/10 ring-emerald-400/20"
                  : "bg-emerald-50 ring-emerald-200"
              }`}>
                <p className={`text-xs font-semibold ${
                  isDarkMode ? "text-emerald-300" : "text-emerald-700"
                }`}>
                  {t("plan.manage.regularCredits")}
                </p>
                <p className={`mt-1 font-bold tabular-nums ${
                  isDarkMode ? "text-emerald-100" : "text-emerald-900"
                }`}>
                  {formatNumber(regularCredits, locale)}
                </p>
              </div>
              <div className={`rounded-xl px-3 py-2 ring-1 ring-inset ${
                isDarkMode
                  ? "bg-violet-500/10 ring-violet-400/20"
                  : "bg-violet-50 ring-violet-200"
              }`}>
                <p className={`text-xs font-semibold ${
                  isDarkMode ? "text-violet-300" : "text-violet-700"
                }`}>
                  {t("plan.manage.planCredits")}
                </p>
                <p className={`mt-1 font-bold tabular-nums ${
                  isDarkMode ? "text-violet-100" : "text-violet-900"
                }`}>
                  {formatNumber(planCredits, locale)}
                </p>
                {showPlanCreditExpiry ? (
                  <p className={`mt-1 text-[11px] font-medium ${
                    isDarkMode ? "text-violet-300/80" : "text-violet-700/80"
                  }`}>
                    {t("plan.manage.planCreditsExpire", "Expires")}: {formatDate(planCreditExpiresAt, locale)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={`h-full rounded-[24px] border p-5 sm:p-6 ${
          isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
        }`}>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black">
                  <Plus className="h-4 w-4 text-blue-600" />
                  {t("walletPage.buy.title", "Buy more credits")}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {t("walletPage.buy.subtitle", "Pick a credit package to keep using AI features")}
                </p>
              </div>
              {canBuyCredit ? (
                <button
                  type="button"
                  onClick={() => setIsCustomCreditDialogOpen(true)}
                  aria-label={t("walletPage.customCredit.openAria", { defaultValue: "Mua credit theo số lượng tự nhập" })}
                  className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold ring-1 ring-inset transition-colors ${
                    isDarkMode
                      ? "bg-blue-500/15 text-blue-200 ring-blue-400/30 hover:bg-blue-500/25"
                      : "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>{t("walletPage.customCredit.cta", { defaultValue: "Số lượng tùy chọn" })}</span>
                </button>
              ) : null}
            </div>

            {!canBuyCredit ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {t("walletPage.buy.cannotBuyCredit", "Your current plan does not support buying extra credits.")}
              </p>
            ) : loadingCreditPackages ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t("walletPage.buy.loading", "Loading...")}
              </p>
            ) : creditPackages.length === 0 ? (
              <Button
                type="button"
                onClick={() => {
                  if (onTopUpCredits) {
                    onTopUpCredits();
                    return;
                  }
                  navigate(buildWalletsPath(), { state: { from: "/plans" } });
                }}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {t("plan.manage.topUpCredits")}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="space-y-3">
                {creditPackages.map((pkg) => {
                  const base = Number(pkg?.baseCredit || 0);
                  const bonus = Number(pkg?.bonusCredit || 0);
                  const packageName = getCreditPackageName(pkg, t);

                  return (
                    <button
                      key={pkg.creditPackageId ?? `${packageName}-${base}-${bonus}`}
                      type="button"
                      onClick={() => setConfirmPackage(pkg)}
                      className={`min-h-[80px] w-full cursor-pointer rounded-xl p-4 text-left ring-1 ring-inset transition-colors ${
                        isDarkMode
                          ? "bg-slate-950/60 ring-slate-700 hover:bg-slate-800"
                          : "bg-white ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                            {packageName}
                          </p>
                          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                            {t("walletPage.buy.baseCredits", "{{count}} base credits", { count: formatNumber(base, locale) })}
                            {" · "}
                            {t("walletPage.buy.bonusCredits", "+{{count}} bonus credits", { count: formatNumber(bonus, locale) })}
                          </p>
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-sm font-black tabular-nums sm:text-right">
                          {formatVnd(pkg?.price ?? 0, locale)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>

      <Dialog open={Boolean(confirmPackage)} onOpenChange={(open) => !open && setConfirmPackage(null)}>
        <DialogContent
          className={`max-w-[430px] overflow-hidden rounded-[28px] p-0 shadow-2xl ${
            isDarkMode ? "border-slate-700 bg-slate-950 text-slate-50" : "border-slate-200 bg-white text-slate-950"
          }`}
        >
          <DialogHeader className={`border-b px-6 py-5 text-left ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
            <DialogTitle className="text-xl font-black">
              {t("payment.orderConfirm.title")}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
              {t("payment.orderConfirm.description")}
            </DialogDescription>
          </DialogHeader>

          {confirmPackage ? (
            <div className="px-6 py-6">
              <div className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-4 ${
                isDarkMode
                  ? "bg-emerald-500/10 ring-1 ring-emerald-400/20"
                  : "bg-gradient-to-r from-blue-50 to-emerald-50"
              }`}>
                <CreditIconImage
                  alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })}
                  className="h-11 w-11 shrink-0 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{confirmPackageName}</p>
                  <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {t("walletPage.buy.baseCredits", "{{count}} base credits", { count: formatNumber(confirmBaseCredit, locale) })}
                    {confirmBonusCredit > 0
                      ? ` · ${t("walletPage.buy.bonusCredits", "+{{count}} bonus credits", { count: formatNumber(confirmBonusCredit, locale) })}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${
                isDarkMode ? "bg-slate-900" : "bg-slate-50"
              }`}>
                <dl className={`space-y-3 border-b pb-4 text-sm ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <dt className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                      {t("payment.orderConfirm.creditType")}
                    </dt>
                    <dd className="font-bold">{confirmPackageName}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                      {t("wallet.totalAvailable")}
                    </dt>
                    <dd className="font-bold tabular-nums">
                      {formatNumber(confirmTotalCredit, locale)} {t("wallet.creditsUnit")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                      {t("plan.manage.scope")}
                    </dt>
                    <dd className="font-bold">
                      {isGroupScopedPage ? t("plan.types.group") : t("plan.types.individual")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <span className="text-sm font-bold">{t("payment.orderConfirm.grandTotal")}</span>
                  <span className="text-2xl font-black tabular-nums">
                    {formatVnd(confirmPackage.price, locale)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => openCreditCheckout(confirmPackage)}
                className="mt-5 h-12 w-full rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                {t("payment.orderConfirm.continue")}
              </Button>

              <div className={`mt-5 flex items-center justify-center gap-2 text-xs ${
                isDarkMode ? "text-sky-200/80" : "text-sky-700/70"
              }`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("payment.secureNote")}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomCreditDialogOpen} onOpenChange={setIsCustomCreditDialogOpen}>
        <DialogContent
          className={`max-w-[460px] overflow-hidden rounded-[28px] p-0 shadow-2xl ${
            isDarkMode ? "border-slate-700 bg-slate-950 text-slate-50" : "border-slate-200 bg-white text-slate-950"
          }`}
        >
          <DialogHeader className={`border-b px-6 py-5 text-left ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Calculator className={`h-5 w-5 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} />
              {t("walletPage.customCredit.title", { defaultValue: "Tự nhập số credit" })}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
              {t("walletPage.customCredit.dialogDesc", {
                defaultValue: "Chọn số credit muốn mua, hệ thống sẽ tự tính tổng tiền theo đơn giá.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <CustomCreditPurchaseCard
              isDarkMode={isDarkMode}
              locale={locale}
              workspaceId={workspaceId}
              isGroupScopedPage={isGroupScopedPage}
              variant="dialog"
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className={`rounded-[24px] border p-5 sm:p-6 ${
        isDarkMode ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
      }`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-2xl p-1 sm:w-auto ${
            isDarkMode ? "bg-slate-900 ring-1 ring-slate-800" : "bg-slate-100 ring-1 ring-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => setActiveHistoryTab("payment")}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                !isUsageTab
                  ? (isDarkMode ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30" : "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100")
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
              }`}
              aria-pressed={!isUsageTab}
            >
              <ReceiptText className="h-4 w-4" />
              {historyHeading}
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryTab("usage")}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                isUsageTab
                  ? (isDarkMode ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30" : "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100")
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
              }`}
              aria-pressed={isUsageTab}
            >
              <Activity className="h-4 w-4" />
              {usageHeading}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <p className={`hidden text-xs sm:block ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
              {isUsageTab
                ? t("plan.manage.history.usage.subtitle", "5 most recent credit movements")
                : t("plan.manage.history.subtitle")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => (isUsageTab ? loadUsage() : loadPayments())}
              disabled={isUsageTab ? loadingUsage : loadingPayments}
              className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" : "border-slate-200 bg-white"}
              aria-label={isUsageTab
                ? t("plan.manage.history.usage.refresh", "Refresh usage history")
                : t("plan.manage.history.refresh")}
            >
              <RefreshCw className={`h-4 w-4 ${(isUsageTab ? loadingUsage : loadingPayments) ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <p className={`mb-4 text-sm sm:hidden ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          {isUsageTab
            ? t("plan.manage.history.usage.subtitle", "5 most recent credit movements")
            : t("plan.manage.history.subtitle")}
        </p>

        {isUsageTab ? (
          <UsageHistoryTable
            transactions={usageTransactions}
            loading={loadingUsage}
            error={usageError}
            isDarkMode={isDarkMode}
            locale={locale}
            lang={lang}
            t={t}
          />
        ) : (
          <PaymentHistoryTable
            payments={payments}
            loading={loadingPayments}
            error={paymentError}
            isDarkMode={isDarkMode}
            locale={locale}
            t={t}
          />
        )}
      </div>
    </section>
  );
}

function PaymentHistoryTable({ payments, loading, error, isDarkMode, locale, t }) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${
      isDarkMode ? "border-slate-800" : "border-slate-200"
    }`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={isDarkMode ? "bg-slate-900" : "bg-slate-50"}>
            <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
              <TableHead>{t("plan.manage.history.date")}</TableHead>
              <TableHead>{t("plan.manage.history.package")}</TableHead>
              <TableHead>{t("plan.manage.history.amount")}</TableHead>
              <TableHead>{t("plan.manage.history.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm">
                  {t("plan.manage.history.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10">
                  <div className="flex items-center justify-center gap-2 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm">
                  {t("plan.manage.history.empty")}
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const status = String(payment?.paymentStatus || "").toUpperCase();
                const statusKey = PAYMENT_STATUS_KEYS[status];
                const paymentDate = payment?.paidAt || payment?.gatewayVerifiedAt || payment?.createdAt;
                const method = String(payment?.paymentMethod || "").toUpperCase();

                return (
                  <TableRow key={payment?.paymentId ?? payment?.orderId} className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                    <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      <div className="flex min-w-[112px] items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatDate(paymentDate, locale)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[180px]">
                        <p className={`truncate text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {getPaymentTitle(payment, t)}
                        </p>
                        <p className={`mt-1 flex items-center gap-1 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                          <ReceiptText className="h-3.5 w-3.5" />
                          {method || "-"} · {payment?.orderId || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold tabular-nums">
                      {formatVnd(payment?.amount ?? payment?.gatewayAmount, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(status, isDarkMode)}>
                        {statusKey ? t(statusKey) : status || "-"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UsageHistoryTable({ transactions, loading, error, isDarkMode, locale, lang, t }) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${
      isDarkMode ? "border-slate-800" : "border-slate-200"
    }`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={isDarkMode ? "bg-slate-900" : "bg-slate-50"}>
            <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
              <TableHead>{t("plan.manage.history.date")}</TableHead>
              <TableHead>{t("plan.manage.history.usage.activity", "Hoạt động")}</TableHead>
              <TableHead>{t("plan.manage.history.usage.change", "Biến động")}</TableHead>
              <TableHead>{t("plan.manage.history.usage.balance", "Số dư sau")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm">
                  {t("plan.manage.history.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10">
                  <div className="flex items-center justify-center gap-2 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm">
                  {t("plan.manage.history.usage.empty", "Chưa có hoạt động sử dụng QMC.")}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const change = Number(tx?.creditChange ?? 0);
                const balanceAfter = Number(tx?.balanceAfter ?? 0);
                const typeLabel = creditTransactionLabel(tx?.transactionType, lang, t);
                const sourceLabel = creditSourceLabel(tx?.sourceType, lang, t);
                const uiActivity = parseUiActivityNote(tx?.note);

                let title;
                const subtitleParts = [sourceLabel];
                if (uiActivity) {
                  title = formatUiActivityTitle(uiActivity.actionKey, uiActivity.target, lang, t);
                  const workspaceLine = formatUiActivitySubtitle(uiActivity.workspaceName, lang, t);
                  if (workspaceLine) subtitleParts.push(workspaceLine);
                  subtitleParts.push(typeLabel);
                } else {
                  title = typeLabel;
                  const sanitized = sanitizeActivityNote(tx?.note);
                  if (sanitized) subtitleParts.push(sanitized);
                }
                const subtitle = subtitleParts.filter(Boolean).join(" · ");

                return (
                  <TableRow key={tx?.creditTransactionId ?? `${tx?.createdAt}-${change}`} className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                    <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      <div className="flex min-w-[112px] items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatDate(tx?.createdAt, locale)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[220px] max-w-[480px]">
                        <p className={`truncate text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`} title={title}>
                          {title}
                        </p>
                        <p className={`mt-1 truncate text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`} title={subtitle}>
                          {subtitle}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className={`font-bold tabular-nums ${getChangeStyle(change, isDarkMode)}`}>
                      {change > 0 ? "+" : ""}{formatNumber(change, locale)}
                    </TableCell>
                    <TableCell className={`tabular-nums ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {formatNumber(balanceAfter, locale)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
