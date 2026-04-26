import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ReceiptText,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreditIconImage from '@/components/ui/CreditIconImage';
import { cn } from '@/lib/utils';
import {
  getGroupWorkspaceWallet,
  getGroupWorkspaceWalletTransactions,
  getPurchaseableCreditPackages,
  getWorkspacePayments,
} from '@/api/ManagementSystemAPI';
import { unwrapApiData } from '@/utils/apiResponse';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_PAGE_SIZE = 5;

const toSafeDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

function formatDateTime(value, lang, withTime = false, t) {
  const date = toSafeDate(value);
  if (!date) {
    return t
      ? t('groupWalletTab.noDate', 'No date')
      : (lang === 'en' ? 'No date' : 'Chưa có ngày');
  }
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatNumber(value, locale) {
  try {
    return new Intl.NumberFormat(locale).format(Number(value) || 0);
  } catch {
    return String(value ?? 0);
  }
}

function formatCurrency(value, locale) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  } catch {
    return `${value ?? 0}₫`;
  }
}

function normalizeWalletSummary(walletData) {
  return {
    balance: Number(walletData?.balance ?? 0),
    totalAvailableCredits: Number(walletData?.totalAvailableCredits ?? walletData?.balance ?? 0),
    regularCreditBalance: Number(walletData?.regularCreditBalance ?? 0),
    planCreditBalance: Number(walletData?.planCreditBalance ?? 0),
    hasActivePlan: Boolean(walletData?.hasActivePlan),
    planCreditExpiresAt: walletData?.planCreditExpiresAt ?? null,
    updatedAt: walletData?.updatedAt ?? null,
  };
}

function extractPageItems(pageData) {
  if (Array.isArray(pageData)) return pageData;
  if (Array.isArray(pageData?.content)) return pageData.content;
  return [];
}

function creditTransactionLabel(type, lang, t) {
  const fallbackLabels = {
    WELCOME: lang === 'en' ? 'Welcome credits' : 'QMC chào mừng',
    TOPUP: lang === 'en' ? 'Top up' : 'Nạp QMC',
    CONSUME: lang === 'en' ? 'Consume' : 'Tiêu hao',
    RESERVE: lang === 'en' ? 'Reserved' : 'Tạm giữ',
    RESERVE_CANCELLED: lang === 'en' ? 'Reserve released' : 'Hoàn tạm giữ',
    REFUND: lang === 'en' ? 'Refund' : 'Hoàn QMC',
    ADJUST: lang === 'en' ? 'Adjustment' : 'Điều chỉnh',
    PLAN_BONUS: lang === 'en' ? 'Plan bonus' : 'QMC từ gói',
    PLAN_EXPIRE_RESET: lang === 'en' ? 'Plan reset' : 'Đặt lại QMC gói',
  };
  const enFallback = {
    WELCOME: 'Welcome credits',
    TOPUP: 'Top up',
    CONSUME: 'Consume',
    RESERVE: 'Reserved',
    RESERVE_CANCELLED: 'Reserve released',
    REFUND: 'Refund',
    ADJUST: 'Adjustment',
    PLAN_BONUS: 'Plan bonus',
    PLAN_EXPIRE_RESET: 'Plan reset',
  };
  const key = String(type || '').toUpperCase();
  if (fallbackLabels[key]) {
    return t
      ? t(`groupWalletTab.creditLabels.${key}`, enFallback[key])
      : fallbackLabels[key];
  }
  return type || '—';
}

function creditSourceLabel(type, lang, t) {
  const fallbackLabels = {
    SYSTEM: lang === 'en' ? 'System' : 'Hệ thống',
    PAYMENT: lang === 'en' ? 'Payment' : 'Thanh toán',
    AI_USAGE: lang === 'en' ? 'AI usage' : 'Sử dụng AI',
    USER_PLAN: lang === 'en' ? 'User plan' : 'Gói cá nhân',
    WORKSPACE_PLAN: lang === 'en' ? 'Group plan' : 'Gói nhóm',
    ADMIN: lang === 'en' ? 'Admin' : 'Quản trị',
  };
  const enFallback = {
    SYSTEM: 'System',
    PAYMENT: 'Payment',
    AI_USAGE: 'AI usage',
    USER_PLAN: 'User plan',
    WORKSPACE_PLAN: 'Group plan',
    ADMIN: 'Admin',
  };
  const key = String(type || '').toUpperCase();
  if (fallbackLabels[key]) {
    return t
      ? t(`groupWalletTab.creditSources.${key}`, enFallback[key])
      : fallbackLabels[key];
  }
  return type || '—';
}

function sanitizeActivityNote(note) {
  return String(note || '')
    .replace(/\s+\[(?:PARTIAL_REFUND|RELEASED|PLAN_CREDIT_FORFEITED)[^\]]*\]/gi, '')
    .trim();
}

function decodeUiActivityValue(value) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';

  try {
    return decodeURIComponent(normalizedValue.replace(/\+/g, '%20'));
  } catch {
    return normalizedValue;
  }
}

function parseUiActivityNote(note) {
  const normalizedNote = sanitizeActivityNote(note);
  if (normalizedNote.startsWith('UI_ACTIVITY_V2|')) {
    const [, actionKey, encodedTarget = '', encodedWorkspace = ''] = normalizedNote.split('|');
    return {
      actionKey: String(actionKey || '').toUpperCase(),
      target: decodeUiActivityValue(encodedTarget),
      workspaceName: decodeUiActivityValue(encodedWorkspace),
    };
  }

  if (!normalizedNote.startsWith('UI_ACTIVITY|')) return null;

  const [, actionKey, ...targetParts] = normalizedNote.split('|');
  return {
    actionKey: String(actionKey || '').toUpperCase(),
    target: targetParts.join('|').trim(),
    workspaceName: '',
  };
}

function formatUiActivityTitle(actionKey, target, lang, t) {
  const safeTarget = String(target || '').trim();
  const withTarget = (viPrefix, enPrefix, fallback, prefixKey, fallbackKey) => {
    const prefix = t && prefixKey
      ? t(`groupWalletTab.uiActivity.${prefixKey}`, enPrefix)
      : (lang === 'en' ? enPrefix : viPrefix);
    const fallbackLabel = t && fallbackKey
      ? t(`groupWalletTab.uiActivity.${fallbackKey}`, fallback)
      : fallback;
    return safeTarget ? `${prefix}${safeTarget}` : fallbackLabel;
  };

  const fallback = t
    ? t('groupWalletTab.uiActivity.fallback', 'Used an AI feature')
    : (lang === 'en' ? 'Used an AI feature' : 'Đã dùng một tính năng AI');
  const titleMap = {
    PROCESS_PDF: withTarget('Đã tải lên PDF: ', 'Uploaded PDF: ', lang === 'en' ? 'Uploaded a PDF' : 'Đã tải lên PDF', 'processPdfPrefix', 'processPdfFallback'),
    PROCESS_DOCX: withTarget('Đã tải lên file Word: ', 'Uploaded Word file: ', lang === 'en' ? 'Uploaded a Word file' : 'Đã tải lên file Word', 'processDocxPrefix', 'processDocxFallback'),
    PROCESS_PPTX: withTarget('Đã tải lên slide: ', 'Uploaded slides: ', lang === 'en' ? 'Uploaded slides' : 'Đã tải lên slide', 'processPptxPrefix', 'processPptxFallback'),
    PROCESS_XLSX: withTarget('Đã tải lên file Excel: ', 'Uploaded Excel file: ', lang === 'en' ? 'Uploaded an Excel file' : 'Đã tải lên file Excel', 'processXlsxPrefix', 'processXlsxFallback'),
    PROCESS_IMAGE: withTarget('Đã tải lên ảnh: ', 'Uploaded image: ', lang === 'en' ? 'Uploaded an image' : 'Đã tải lên ảnh', 'processImagePrefix', 'processImageFallback'),
    PROCESS_AUDIO: withTarget('Đã tải lên audio: ', 'Uploaded audio: ', lang === 'en' ? 'Uploaded audio' : 'Đã tải lên audio', 'processAudioPrefix', 'processAudioFallback'),
    PROCESS_VIDEO: withTarget('Đã tải lên video: ', 'Uploaded video: ', lang === 'en' ? 'Uploaded a video' : 'Đã tải lên video', 'processVideoPrefix', 'processVideoFallback'),
    GENERATE_QUIZ: withTarget('Đã tạo quiz: ', 'Generated quiz: ', lang === 'en' ? 'Generated a quiz' : 'Đã tạo quiz', 'generateQuizPrefix', 'generateQuizFallback'),
    GENERATE_FLASHCARDS: withTarget('Đã tạo flashcard từ: ', 'Generated flashcards from: ', lang === 'en' ? 'Generated flashcards' : 'Đã tạo flashcard', 'generateFlashcardsPrefix', 'generateFlashcardsFallback'),
    GENERATE_MOCK_TEST: withTarget('Đã tạo mock test: ', 'Generated mock test: ', lang === 'en' ? 'Generated a mock test' : 'Đã tạo mock test', 'generateMockTestPrefix', 'generateMockTestFallback'),
  };

  if (titleMap[actionKey]) return titleMap[actionKey];
  const defaultPrefix = t
    ? t('groupWalletTab.uiActivity.defaultPrefix', 'Used AI for: ')
    : (lang === 'en' ? 'Used AI for: ' : 'Đã dùng AI cho: ');
  return safeTarget ? `${defaultPrefix}${safeTarget}` : fallback;
}

function formatUiActivitySubtitle(workspaceName, lang, t) {
  const safeWorkspaceName = String(workspaceName || '').trim();
  if (!safeWorkspaceName) return '';

  if (t) {
    return t('groupWalletTab.uiActivity.inWorkspace', 'In workspace: {{name}}', { name: safeWorkspaceName });
  }
  return lang === 'en'
    ? `In workspace: ${safeWorkspaceName}`
    : `Trong workspace: ${safeWorkspaceName}`;
}

function paymentTargetLabel(type, lang, t) {
  const fallbackLabels = {
    WORKSPACE_PLAN: lang === 'en' ? 'Group plan' : 'Gói nhóm',
    WORKSPACE_CREDIT: lang === 'en' ? 'Group credits' : 'QMC nhóm',
    WORKSPACE_SLOT: lang === 'en' ? 'Seat slot' : 'Slot thành viên',
    USER_PLAN: lang === 'en' ? 'User plan' : 'Gói cá nhân',
    USER_CREDIT: lang === 'en' ? 'User credits' : 'QMC cá nhân',
  };
  const enFallback = {
    WORKSPACE_PLAN: 'Group plan',
    WORKSPACE_CREDIT: 'Group credits',
    WORKSPACE_SLOT: 'Seat slot',
    USER_PLAN: 'User plan',
    USER_CREDIT: 'User credits',
  };
  const key = String(type || '').toUpperCase();
  if (fallbackLabels[key]) {
    return t
      ? t(`groupWalletTab.paymentTargets.${key}`, enFallback[key])
      : fallbackLabels[key];
  }
  return type || '—';
}

function paymentStatusMeta(status, lang, isDarkMode, t) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'COMPLETED') {
    return {
      label: t
        ? t('groupWalletTab.paymentStatus.completed', 'Completed')
        : (lang === 'en' ? 'Completed' : 'Hoàn tất'),
      className: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    };
  }
  if (normalized === 'PENDING') {
    return {
      label: t
        ? t('groupWalletTab.paymentStatus.pending', 'Pending')
        : (lang === 'en' ? 'Pending' : 'Đang chờ'),
      className: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    };
  }
  const failedLabel = t
    ? t('groupWalletTab.paymentStatus.failed', 'Failed')
    : (lang === 'en' ? 'Failed' : 'Thất bại');
  const cancelledLabel = t
    ? t('groupWalletTab.paymentStatus.cancelled', 'Cancelled')
    : (lang === 'en' ? 'Cancelled' : 'Đã hủy');
  return {
    label: normalized === 'FAILED' ? failedLabel : cancelledLabel,
    className: isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700',
  };
}

function getPaginationMeta(pageData, fallbackSize = HISTORY_PAGE_SIZE) {
  const page = Math.max(0, Number(pageData?.number ?? pageData?.page ?? 0) || 0);
  const size = Math.max(1, Number(pageData?.size ?? fallbackSize) || fallbackSize);
  const totalElements = Math.max(0, Number(pageData?.totalElements ?? extractPageItems(pageData).length) || 0);
  const fallbackTotalPages = totalElements > 0 ? Math.ceil(totalElements / size) : 0;
  const totalPages = Math.max(0, Number(pageData?.totalPages ?? fallbackTotalPages) || fallbackTotalPages);

  return { page, size, totalElements, totalPages };
}

function HistoryPagination({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  isDarkMode,
  subtleTextClass,
  t,
}) {
  if (totalElements <= 0) return null;

  const safeTotalPages = Math.max(totalPages, 1);
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <div className={cn(
      'mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between',
      isDarkMode ? 'border-white/10' : 'border-slate-200/80',
    )}>
      <p className={`text-xs ${subtleTextClass}`}>
        {t('groupWalletTab.pagination.summary', 'Showing {{start}} - {{end}} of {{total}}', {
          start: startItem,
          end: endItem,
          total: totalElements,
        })}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className={cn(
            'h-8 rounded-lg px-2.5 text-xs',
            isDarkMode ? 'border-slate-700 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50',
          )}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          {t('groupWalletTab.pagination.previous', 'Previous')}
        </Button>
        <span className={`min-w-[92px] text-center text-xs font-medium ${subtleTextClass}`}>
          {t('groupWalletTab.pagination.page', 'Page {{page}} / {{totalPages}}', {
            page: currentPage + 1,
            totalPages: safeTotalPages,
          })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages - 1}
          className={cn(
            'h-8 rounded-lg px-2.5 text-xs',
            isDarkMode ? 'border-slate-700 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50',
          )}
        >
          {t('groupWalletTab.pagination.next', 'Next')}
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function GroupWalletTab({
  isDarkMode,
  group,
  groupSubscription = null,
  canManage = false,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = i18n.language;
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const fontClass = lang === 'en' ? 'font-poppins' : 'font-sans';
  const [renderTimestamp] = useState(() => Date.now());
  const [historyPages, setHistoryPages] = useState(() => ({
    workspaceId: null,
    purchase: 0,
    usage: 0,
  }));
  const workspaceId = group?.workspaceId;
  const purchaseHistoryPage = historyPages.workspaceId === workspaceId ? historyPages.purchase : 0;
  const usageHistoryPage = historyPages.workspaceId === workspaceId ? historyPages.usage : 0;
  const groupName = group?.groupName || group?.displayTitle || group?.name || t('groupWalletTab.group', 'Group');
  const currentGroupPlanName = String(groupSubscription?.plan?.displayName || groupSubscription?.plan?.code || '').trim();
  const groupEntitlement = groupSubscription?.plan?.entitlement || groupSubscription?.entitlement || null;
  const hasActiveGroupPlan = Boolean(groupSubscription?.plan || groupSubscription?.planCatalogId || groupSubscription?.planAssignmentId);
  const canBuyGroupCredits = hasActiveGroupPlan && groupEntitlement?.canBuyCredit === true;

  const updateHistoryPage = (key, nextPage, maxPage = Number.POSITIVE_INFINITY) => {
    setHistoryPages((current) => {
      const currentPurchase = current.workspaceId === workspaceId ? current.purchase : 0;
      const currentUsage = current.workspaceId === workspaceId ? current.usage : 0;
      const basePage = key === 'purchase' ? currentPurchase : currentUsage;
      const resolvedPage = typeof nextPage === 'function' ? nextPage(basePage) : nextPage;
      const safePage = Math.max(0, Math.min(Number(resolvedPage) || 0, Math.max(maxPage, 0)));

      return {
        workspaceId,
        purchase: key === 'purchase' ? safePage : currentPurchase,
        usage: key === 'usage' ? safePage : currentUsage,
      };
    });
  };

  const { data: groupWallet, isLoading: walletLoading, isError: walletError } = useQuery({
    queryKey: ['group-wallet-summary', workspaceId],
    queryFn: async () => normalizeWalletSummary(unwrapApiData(await getGroupWorkspaceWallet(workspaceId)) || {}),
    enabled: Boolean(canManage && workspaceId),
  });

  const { data: walletTransactionsPage, isLoading: walletTransactionsLoading, isError: walletTransactionsError } = useQuery({
    queryKey: ['group-wallet-transactions', workspaceId, usageHistoryPage],
    queryFn: async () => unwrapApiData(await getGroupWorkspaceWalletTransactions(workspaceId, usageHistoryPage, HISTORY_PAGE_SIZE)) || { content: [] },
    enabled: Boolean(canManage && workspaceId),
    placeholderData: (previousData) => previousData,
  });

  const { data: workspacePaymentsPage, isLoading: workspacePaymentsLoading, isError: workspacePaymentsError } = useQuery({
    queryKey: ['group-workspace-payments', workspaceId, purchaseHistoryPage],
    queryFn: async () => unwrapApiData(await getWorkspacePayments(workspaceId, purchaseHistoryPage, HISTORY_PAGE_SIZE)) || { content: [] },
    enabled: Boolean(canManage && workspaceId),
    placeholderData: (previousData) => previousData,
  });

  const { data: creditPackages = [], isLoading: creditPackagesLoading } = useQuery({
    queryKey: ['purchaseable-credit-packages'],
    queryFn: async () => {
      const payload = unwrapApiData(await getPurchaseableCreditPackages());
      return Array.isArray(payload) ? payload : [];
    },
    enabled: Boolean(canManage && workspaceId),
    staleTime: 5 * 60 * 1000,
  });

  const walletSummary = useMemo(
    () => normalizeWalletSummary(groupWallet || {}),
    [groupWallet],
  );

  /** Tên gói từ subscription; fallback khi API subscription trễ nhưng ví đã có gói active */
  const displayPlanLabel = useMemo(() => {
    if (currentGroupPlanName) return currentGroupPlanName;
    if (walletSummary.hasActivePlan) {
      return t('groupWalletTab.paidPlanActive', 'Paid plan active');
    }
    return '';
  }, [currentGroupPlanName, walletSummary.hasActivePlan, t]);

  const walletTransactions = useMemo(
    () => extractPageItems(walletTransactionsPage),
    [walletTransactionsPage],
  );

  const usageHistory = useMemo(
    () => walletTransactions
      .filter((tx) => {
        const normalizedType = String(tx?.transactionType || '').toUpperCase();
        return normalizedType !== 'WELCOME';
      }),
    [walletTransactions],
  );

  const workspacePayments = useMemo(
    () => extractPageItems(workspacePaymentsPage),
    [workspacePaymentsPage],
  );

  const purchaseHistory = useMemo(
    () => workspacePayments,
    [workspacePayments],
  );

  const purchasePagination = useMemo(
    () => getPaginationMeta(workspacePaymentsPage, HISTORY_PAGE_SIZE),
    [workspacePaymentsPage],
  );

  const usagePagination = useMemo(
    () => getPaginationMeta(walletTransactionsPage, HISTORY_PAGE_SIZE),
    [walletTransactionsPage],
  );

  const featuredCreditPackages = useMemo(
    () => creditPackages.slice(0, 4),
    [creditPackages],
  );

  const groupPlanExpiryLabel = groupSubscription?.expiresAt
    ? formatDateTime(groupSubscription.expiresAt, lang, true, t)
    : '';

  const openGroupPlanManager = () => {
    if (!workspaceId) return;
    navigate(`/plans?planType=GROUP&workspaceId=${workspaceId}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const openGroupCreditCheckout = (creditPackageId) => {
    if (!workspaceId || !creditPackageId) return;
    navigate(`/payments/credits?creditPackageId=${creditPackageId}&workspaceId=${workspaceId}`, {
      state: {
        from: `${location.pathname}${location.search}`,
        workspaceId,
      },
    });
  };

  const cardClass = `rounded-[28px] border ${isDarkMode ? 'border-slate-700/70 bg-[#08131a]/92' : 'border-slate-200/80 bg-white/90'}`;
  const innerCardClass = isDarkMode ? 'border-slate-700/60 bg-white/[0.04]' : 'border-slate-200/70 bg-white/85';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const eyebrowClass = 'text-slate-500';

  if (!canManage) {
    return (
      <div className={`space-y-6 ${fontClass}`}>
        <section className={`${cardClass} p-6 lg:p-7`}>
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-amber-400/10 text-amber-200' : 'bg-amber-50 text-amber-700'}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                {t('groupWalletTab.leaderOnlyEyebrow', 'Group wallet')}
              </p>
              <h2 className={`mt-2 text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('groupWalletTab.leaderOnlyTitle', 'Leader access only')}
              </h2>
              <p className={`mt-3 max-w-2xl text-sm leading-6 ${subtleTextClass}`}>
                {t('groupWalletTab.leaderOnlyDescription', 'Only the group leader can manage the shared wallet, top up credits, and inspect purchase history for this workspace.')}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`space-y-5 animate-in fade-in duration-300 ${fontClass}`}>
      <section className={`${cardClass} p-5 lg:p-6`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-start">
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>
              {t('groupWalletTab.groupWalletEyebrow', 'Group wallet')}
            </p>
            <h2 className={`mt-1 truncate text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {groupName}
            </h2>
            <p className={`mt-2 max-w-xl text-sm leading-relaxed ${subtleTextClass}`}>
              {t('groupWalletTab.qmcDescription', 'QMC means QuizMate Credit — the shared credit unit this group uses for quiz, flashcard, roadmap, and other AI actions.')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                {t('groupWalletTab.qmcBadge', 'QMC = QuizMate Credit')}
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-white/12 bg-white/[0.05] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                {t('groupWalletTab.sharedByGroup', 'Shared by the whole group')}
              </span>
            </div>
          </div>
          <div
            className={cn(
              'rounded-[26px] border px-5 py-5',
              isDarkMode
                ? 'border-cyan-400/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.12),rgba(8,19,26,0.94),rgba(8,19,26,0.92))]'
                : 'border-cyan-200 bg-[linear-gradient(145deg,rgba(236,254,255,0.92),rgba(255,255,255,0.98),rgba(240,249,255,0.94))]',
            )}
          >
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center justify-center rounded-2xl ring-1 ring-inset ${isDarkMode ? 'bg-cyan-400/10 ring-cyan-300/20' : 'bg-cyan-50 ring-cyan-200'}`}>
                <CreditIconImage alt={t('common.creditIconAlt', { brandName: 'QuizMate AI' })} className="h-11 w-11 rounded-2xl" />
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}>
                  {t('groupWalletTab.balanceEyebrow', 'Group wallet balance')}
                </p>
                <p className={`mt-1 text-xs leading-relaxed ${subtleTextClass}`}>
                  {t('groupWalletTab.balanceSubtitle', 'Available now for shared AI actions.')}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-end gap-3">
              <p className={`text-4xl font-black tabular-nums tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {walletLoading ? '…' : formatNumber(walletSummary.totalAvailableCredits, locale)}
              </p>
              <span className={`pb-1 text-sm font-semibold ${isDarkMode ? 'text-cyan-200' : 'text-cyan-700'}`}>QMC</span>
            </div>
            <p className={`mt-2 text-xs ${subtleTextClass}`}>QuizMate Credit (QMC)</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex max-w-[min(100%,320px)] items-center truncate rounded-full border px-3 py-1 text-xs font-semibold ${
              isDarkMode ? 'border-white/15 bg-white/[0.06] text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
            title={displayPlanLabel || undefined}
          >
            {displayPlanLabel || t('groupWalletTab.noPaidPlan', 'No paid plan')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {groupPlanExpiryLabel ? (
              <p className={`text-right text-xs ${subtleTextClass}`}>
                {t('groupWalletTab.expires', 'Expires')}: {groupPlanExpiryLabel}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3 text-xs',
                isDarkMode ? 'border-slate-600 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
              onClick={openGroupPlanManager}
            >
              {displayPlanLabel
                ? t('groupWalletTab.managePlan', 'Manage plan')
                : t('groupWalletTab.choosePlan', 'Choose plan')}
            </Button>
          </div>
        </div>
      </section>

      {(walletError || workspacePaymentsError || walletTransactionsError) ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {t('groupWalletTab.dataError', 'Some wallet data could not be loaded. Refresh to try again.')}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className={cn(cardClass, 'p-5')}>
          <div className="flex items-center gap-2">
            <CreditCard className={cn('h-4 w-4', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}>
              {t('groupWalletTab.balanceBreakdown', 'Balance breakdown')}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={cn('rounded-2xl border px-4 py-3', innerCardClass)}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${eyebrowClass}`}>
                {t('groupWalletTab.regularCredits', 'Regular credits')}
              </p>
              <p className={cn('mt-2 text-xl font-bold tabular-nums tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {walletLoading ? '…' : formatNumber(walletSummary.regularCreditBalance, locale)}
              </p>
            </div>
            <div className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-blue-400/20 bg-blue-400/10' : 'border-blue-200 bg-blue-50')}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                {t('groupWalletTab.planCredits', 'Plan credits')}
              </p>
              <p className={cn('mt-2 text-xl font-bold tabular-nums tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {walletLoading ? '…' : formatNumber(walletSummary.planCreditBalance, locale)}
              </p>
            </div>
          </div>

          <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs ${subtleTextClass}`}>
            <span>
              {t('groupWalletTab.walletUpdated', 'Wallet updated')}:{' '}
              {walletSummary.updatedAt ? formatDateTime(walletSummary.updatedAt, lang, true, t) : '—'}
            </span>
            {walletSummary.planCreditExpiresAt ? (
              <span>
                {t('groupWalletTab.planCreditsExpire', 'Plan credits expire')}:{' '}
                {formatDateTime(walletSummary.planCreditExpiresAt, lang, true, t)}
              </span>
            ) : null}
          </div>
        </div>

        <div className={cn(cardClass, 'p-5 lg:max-w-xl lg:justify-self-end w-full')}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className={cn('h-4 w-4', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('groupWalletTab.topUpCredits', 'Top up credits')}
            </h3>
          </div>
          <p className={`text-xs leading-relaxed ${subtleTextClass}`}>
            {t('groupWalletTab.topUpDescription', 'Add more QMC to this shared wallet.')}
          </p>
          {!canBuyGroupCredits ? (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {t('groupWalletTab.notAllowedBuyCredits', 'This plan currently does not allow buying extra credits for the group.')}
            </div>
          ) : creditPackagesLoading && featuredCreditPackages.length === 0 ? (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>…</div>
          ) : featuredCreditPackages.length === 0 ? (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>
              {t('groupWalletTab.noCreditPackages', 'No credit packages are available right now.')}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {featuredCreditPackages.map((pkg) => {
                const totalCredits = Number(pkg?.baseCredit ?? 0) + Number(pkg?.bonusCredit ?? 0);
                return (
                  <button
                    key={pkg.creditPackageId}
                    type="button"
                    className={cn(
                      'flex w-full max-w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:brightness-110',
                      isDarkMode ? 'border-white/12 bg-black/20' : 'border-slate-200/90 bg-white/94',
                    )}
                    onClick={() => openGroupCreditCheckout(pkg.creditPackageId)}
                  >
                    <div>
                      <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {formatNumber(totalCredits, locale)} QMC
                      </p>
                      <p className={`mt-1 text-xs ${subtleTextClass}`}>
                        {Number(pkg?.bonusCredit ?? 0) > 0
                          ? t('groupWalletTab.bonusIncluded', 'Includes +{{amount}} bonus QMC', { amount: formatNumber(pkg.bonusCredit, locale) })
                          : t('groupWalletTab.topUpSharedWallet', 'Top up the shared wallet')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {formatCurrency(pkg?.price, locale)}
                      </p>
                      <p className={`mt-1 text-[11px] font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>
                        {t('groupWalletTab.buyNow', 'Buy now')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className={cn(cardClass, 'p-5')}>
          <div className="mb-1 flex items-center gap-2">
            <ReceiptText className={cn('h-4 w-4', isDarkMode ? 'text-violet-300' : 'text-violet-600')} />
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('groupWalletTab.purchaseHistory', 'Purchase history')}
            </h3>
          </div>
          <p className={`text-xs ${subtleTextClass}`}>
            {t('groupWalletTab.purchaseHistoryDescription', 'Recent payments for this workspace plan and shared credits.')}
          </p>
          <div className="mt-4 space-y-3">
            {workspacePaymentsLoading ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>…</div>
            ) : purchaseHistory.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>
                {t('groupWalletTab.noPurchaseRecords', 'No purchase records yet.')}
              </div>
            ) : purchaseHistory.map((payment) => {
              const statusMeta = paymentStatusMeta(payment.paymentStatus, lang, isDarkMode, t);
              return (
                <div key={payment.paymentId || payment.orderId} className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-white/12 bg-black/20' : 'border-slate-200/90 bg-white/94')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold leading-5 break-words', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {paymentTargetLabel(payment.paymentTargetType, lang, t)}
                      </p>
                      <p className={`mt-1 break-all text-xs text-slate-500`}>
                        {payment.orderId || `#${payment.paymentId}`}
                      </p>
                    </div>
                    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className={cn('text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {formatCurrency(payment.amount, locale)}
                    </p>
                    <p className={`text-xs ${subtleTextClass}`}>
                      {formatDateTime(payment.paidAt || payment.createdAt, lang, true, t)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <HistoryPagination
            currentPage={purchaseHistoryPage}
            totalPages={purchasePagination.totalPages}
            totalElements={purchasePagination.totalElements}
            pageSize={purchasePagination.size}
            onPageChange={(nextPage) => updateHistoryPage('purchase', nextPage, (purchasePagination.totalPages || 1) - 1)}
            isDarkMode={isDarkMode}
            subtleTextClass={subtleTextClass}
            t={t}
          />
        </div>

        <div className={cn(cardClass, 'p-5')}>
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className={cn('h-4 w-4', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('groupWalletTab.usageHistory', 'Usage history')}
            </h3>
          </div>
          <p className={`text-xs ${subtleTextClass}`}>
            {t('groupWalletTab.usageHistoryDescription', 'Recent shared-wallet activity triggered by AI usage and credit movements.')}
          </p>
          <div className="mt-4 space-y-3">
            {walletTransactionsLoading ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>…</div>
            ) : usageHistory.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>
                {t('groupWalletTab.noUsageRecords', 'No usage records yet.')}
              </div>
            ) : usageHistory.map((tx) => {
              const totalChange = Number(tx.creditChange ?? 0);
              const isPositive = totalChange >= 0;
              const recentAt = toSafeDate(tx.createdAt)?.getTime() ?? 0;
              const isRecent = recentAt > 0 && renderTimestamp - recentAt <= 3 * DAY_MS;
              const uiActivity = parseUiActivityNote(tx.note);
              const activityTitle = uiActivity
                ? formatUiActivityTitle(uiActivity.actionKey, uiActivity.target, lang, t)
                : creditTransactionLabel(tx.transactionType, lang, t);
              const activityNote = uiActivity
                ? formatUiActivitySubtitle(uiActivity.workspaceName, lang, t)
                : sanitizeActivityNote(tx.note);

              return (
                <div key={tx.creditTransactionId} className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-white/12 bg-black/20' : 'border-slate-200/90 bg-white/94')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('max-w-full text-sm font-semibold leading-5 break-words', isDarkMode ? 'text-white' : 'text-slate-900')} title={activityTitle}>
                          {activityTitle}
                        </p>
                        {isRecent ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}`}>
                            {t('groupWalletTab.recent', 'Recent')}
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-1 text-xs ${subtleTextClass}`}>
                        {creditSourceLabel(tx.sourceType, lang, t)}
                        {activityNote ? ` · ${activityNote}` : ''}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className={cn(
                        'text-sm font-bold',
                        isPositive
                          ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700')
                          : (isDarkMode ? 'text-amber-300' : 'text-amber-700'),
                      )}>
                        {totalChange > 0 ? '+' : ''}{formatNumber(totalChange, locale)}
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 flex flex-col gap-1 text-xs ${subtleTextClass} sm:flex-row sm:items-center sm:justify-between sm:gap-3`}>
                    <span>
                      {t('groupWalletTab.balanceAfter', 'Balance after')}: {formatNumber(tx.balanceAfter, locale)}
                    </span>
                    <span>{formatDateTime(tx.createdAt, lang, true, t)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <HistoryPagination
            currentPage={usageHistoryPage}
            totalPages={usagePagination.totalPages}
            totalElements={usagePagination.totalElements}
            pageSize={usagePagination.size}
            onPageChange={(nextPage) => updateHistoryPage('usage', nextPage, (usagePagination.totalPages || 1) - 1)}
            isDarkMode={isDarkMode}
            subtleTextClass={subtleTextClass}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
