import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  ReceiptText,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import CreditIconImage from '@/Components/ui/CreditIconImage';
import { cn } from '@/lib/utils';
import {
  getGroupWorkspaceWallet,
  getGroupWorkspaceWalletTransactions,
  getPurchaseableCreditPackages,
  getWorkspacePayments,
} from '@/api/ManagementSystemAPI';
import { unwrapApiData } from '@/Utils/apiResponse';

const DAY_MS = 24 * 60 * 60 * 1000;

const toSafeDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

function formatDateTime(value, lang, withTime = false) {
  const date = toSafeDate(value);
  if (!date) return lang === 'en' ? 'No date' : 'Chưa có ngày';
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

function creditTransactionLabel(type, lang) {
  const labels = {
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
  return labels[String(type || '').toUpperCase()] || (type || '—');
}

function creditSourceLabel(type, lang) {
  const labels = {
    SYSTEM: lang === 'en' ? 'System' : 'Hệ thống',
    PAYMENT: lang === 'en' ? 'Payment' : 'Thanh toán',
    AI_USAGE: lang === 'en' ? 'AI usage' : 'Sử dụng AI',
    USER_PLAN: lang === 'en' ? 'User plan' : 'Gói cá nhân',
    WORKSPACE_PLAN: lang === 'en' ? 'Group plan' : 'Gói nhóm',
    ADMIN: lang === 'en' ? 'Admin' : 'Quản trị',
  };
  return labels[String(type || '').toUpperCase()] || (type || '—');
}

function sanitizeActivityNote(note) {
  return String(note || '')
    .replace(/\s+\[(?:PARTIAL_REFUND|RELEASED)[^\]]*\]/gi, '')
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

function formatUiActivityTitle(actionKey, target, lang) {
  const safeTarget = String(target || '').trim();
  const withTarget = (viPrefix, enPrefix, fallback) =>
    safeTarget ? `${lang === 'en' ? enPrefix : viPrefix}${safeTarget}` : fallback;

  const fallback = lang === 'en' ? 'Used an AI feature' : 'Đã dùng một tính năng AI';
  const titleMap = {
    PROCESS_PDF: withTarget('Đã tải lên PDF: ', 'Uploaded PDF: ', lang === 'en' ? 'Uploaded a PDF' : 'Đã tải lên PDF'),
    PROCESS_DOCX: withTarget('Đã tải lên file Word: ', 'Uploaded Word file: ', lang === 'en' ? 'Uploaded a Word file' : 'Đã tải lên file Word'),
    PROCESS_PPTX: withTarget('Đã tải lên slide: ', 'Uploaded slides: ', lang === 'en' ? 'Uploaded slides' : 'Đã tải lên slide'),
    PROCESS_XLSX: withTarget('Đã tải lên file Excel: ', 'Uploaded Excel file: ', lang === 'en' ? 'Uploaded an Excel file' : 'Đã tải lên file Excel'),
    PROCESS_IMAGE: withTarget('Đã tải lên ảnh: ', 'Uploaded image: ', lang === 'en' ? 'Uploaded an image' : 'Đã tải lên ảnh'),
    PROCESS_AUDIO: withTarget('Đã tải lên audio: ', 'Uploaded audio: ', lang === 'en' ? 'Uploaded audio' : 'Đã tải lên audio'),
    PROCESS_VIDEO: withTarget('Đã tải lên video: ', 'Uploaded video: ', lang === 'en' ? 'Uploaded a video' : 'Đã tải lên video'),
    GENERATE_QUIZ: withTarget('Đã tạo quiz: ', 'Generated quiz: ', lang === 'en' ? 'Generated a quiz' : 'Đã tạo quiz'),
    GENERATE_FLASHCARDS: withTarget('Đã tạo flashcard từ: ', 'Generated flashcards from: ', lang === 'en' ? 'Generated flashcards' : 'Đã tạo flashcard'),
    GENERATE_MOCK_TEST: withTarget('Đã tạo mock test: ', 'Generated mock test: ', lang === 'en' ? 'Generated a mock test' : 'Đã tạo mock test'),
  };

  return titleMap[actionKey] || withTarget('Đã dùng AI cho: ', 'Used AI for: ', fallback);
}

function formatUiActivitySubtitle(workspaceName, lang) {
  const safeWorkspaceName = String(workspaceName || '').trim();
  if (!safeWorkspaceName) return '';

  return lang === 'en'
    ? `In workspace: ${safeWorkspaceName}`
    : `Trong workspace: ${safeWorkspaceName}`;
}

function paymentTargetLabel(type, lang) {
  const labels = {
    WORKSPACE_PLAN: lang === 'en' ? 'Group plan' : 'Gói nhóm',
    WORKSPACE_CREDIT: lang === 'en' ? 'Group credits' : 'QMC nhóm',
    WORKSPACE_SLOT: lang === 'en' ? 'Seat slot' : 'Slot thành viên',
    USER_PLAN: lang === 'en' ? 'User plan' : 'Gói cá nhân',
    USER_CREDIT: lang === 'en' ? 'User credits' : 'QMC cá nhân',
  };
  return labels[String(type || '').toUpperCase()] || (type || '—');
}

function paymentStatusMeta(status, lang, isDarkMode) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'COMPLETED') {
    return {
      label: lang === 'en' ? 'Completed' : 'Hoàn tất',
      className: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    };
  }
  if (normalized === 'PENDING') {
    return {
      label: lang === 'en' ? 'Pending' : 'Đang chờ',
      className: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    };
  }
  return {
    label: normalized === 'FAILED'
      ? (lang === 'en' ? 'Failed' : 'Thất bại')
      : (lang === 'en' ? 'Cancelled' : 'Đã hủy'),
    className: isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700',
  };
}

export default function GroupWalletTab({
  isDarkMode,
  group,
  groupSubscription = null,
  canManage = false,
}) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = i18n.language;
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const fontClass = lang === 'en' ? 'font-poppins' : 'font-sans';
  const [renderTimestamp] = useState(() => Date.now());
  const workspaceId = group?.workspaceId;
  const groupName = group?.groupName || group?.displayTitle || group?.name || (lang === 'en' ? 'Group' : 'Nhóm');
  const currentGroupPlanName = String(groupSubscription?.plan?.displayName || groupSubscription?.plan?.code || '').trim();
  const canBuyGroupCredits = groupSubscription?.plan?.entitlement?.canBuyCredit !== false;

  const { data: groupWallet, isLoading: walletLoading, isError: walletError } = useQuery({
    queryKey: ['group-wallet-summary', workspaceId],
    queryFn: async () => normalizeWalletSummary(unwrapApiData(await getGroupWorkspaceWallet(workspaceId)) || {}),
    enabled: Boolean(canManage && workspaceId),
  });

  const { data: walletTransactionsPage, isLoading: walletTransactionsLoading, isError: walletTransactionsError } = useQuery({
    queryKey: ['group-wallet-transactions', workspaceId],
    queryFn: async () => unwrapApiData(await getGroupWorkspaceWalletTransactions(workspaceId, 0, 12)) || { content: [] },
    enabled: Boolean(canManage && workspaceId),
  });

  const { data: workspacePaymentsPage, isLoading: workspacePaymentsLoading, isError: workspacePaymentsError } = useQuery({
    queryKey: ['group-workspace-payments', workspaceId],
    queryFn: async () => unwrapApiData(await getWorkspacePayments(workspaceId, 0, 10)) || { content: [] },
    enabled: Boolean(canManage && workspaceId),
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
      return lang === 'en' ? 'Paid plan active' : 'Gói trả phí đang hiệu lực';
    }
    return '';
  }, [currentGroupPlanName, walletSummary.hasActivePlan, lang]);

  const walletTransactions = useMemo(
    () => extractPageItems(walletTransactionsPage),
    [walletTransactionsPage],
  );

  const usageHistory = useMemo(
    () => walletTransactions
      .filter((tx) => {
        const normalizedType = String(tx?.transactionType || '').toUpperCase();
        return !['WELCOME', 'TOPUP', 'PLAN_BONUS'].includes(normalizedType);
      })
      .slice(0, 8),
    [walletTransactions],
  );

  const workspacePayments = useMemo(
    () => extractPageItems(workspacePaymentsPage),
    [workspacePaymentsPage],
  );

  const purchaseHistory = useMemo(
    () => workspacePayments
      .filter((payment) => ['WORKSPACE_PLAN', 'WORKSPACE_CREDIT', 'WORKSPACE_SLOT'].includes(String(payment?.paymentTargetType || '').toUpperCase()))
      .slice(0, 8),
    [workspacePayments],
  );

  const featuredCreditPackages = useMemo(
    () => creditPackages.slice(0, 4),
    [creditPackages],
  );

  const groupPlanExpiryLabel = groupSubscription?.expiresAt
    ? formatDateTime(groupSubscription.expiresAt, lang, true)
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

  const cardClass = `rounded-[28px] border ${isDarkMode ? 'border-white/12 bg-[#08131a]/92' : 'border-slate-200/85 bg-white/86'}`;
  const innerCardClass = isDarkMode ? 'border-white/12 bg-white/[0.045]' : 'border-slate-200/80 bg-white/92';
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
                {lang === 'en' ? 'Group wallet' : 'Ví nhóm'}
              </p>
              <h2 className={`mt-2 text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {lang === 'en' ? 'Leader access only' : 'Chỉ trưởng nhóm quản lý'}
              </h2>
              <p className={`mt-3 max-w-2xl text-sm leading-6 ${subtleTextClass}`}>
                {lang === 'en'
                  ? 'Only the group leader can manage the shared wallet, top up credits, and inspect purchase history for this workspace.'
                  : 'Chỉ trưởng nhóm mới quản lý được ví dùng chung, nạp thêm QMC và xem lịch sử thanh toán của workspace này.'}
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
              {lang === 'en' ? 'Group wallet' : 'Ví nhóm'}
            </p>
            <h2 className={`mt-1 truncate text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {groupName}
            </h2>
            <p className={`mt-2 max-w-xl text-sm leading-relaxed ${subtleTextClass}`}>
              {lang === 'en'
                ? 'QMC means QuizMate Credit — the shared credit unit this group uses for quiz, flashcard, roadmap, and other AI actions.'
                : 'QMC là QuizMate Credit — đơn vị QMC dùng chung để tạo quiz, flashcard, roadmap và các tác vụ AI khác trong nhóm.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                QMC = QuizMate Credit
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-white/12 bg-white/[0.05] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                {lang === 'en' ? 'Shared by the whole group' : 'Dùng chung cho cả nhóm'}
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
                <CreditIconImage alt="QuizMate Credit" className="h-11 w-11 rounded-2xl" />
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}>
                  {lang === 'en' ? 'Group wallet balance' : 'Số dư ví nhóm'}
                </p>
                <p className={`mt-1 text-xs leading-relaxed ${subtleTextClass}`}>
                  {lang === 'en' ? 'Available now for shared AI actions.' : 'Sẵn sàng dùng cho các thao tác AI chung.'}
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
            {displayPlanLabel || (lang === 'en' ? 'No paid plan' : 'Chưa có gói trả phí')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {groupPlanExpiryLabel ? (
              <p className={`text-right text-xs ${subtleTextClass}`}>
                {lang === 'en' ? 'Expires' : 'Hết hạn'}: {groupPlanExpiryLabel}
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
                ? (lang === 'en' ? 'Manage plan' : 'Quản lý gói')
                : (lang === 'en' ? 'Choose plan' : 'Chọn gói')}
            </Button>
          </div>
        </div>
      </section>

      {(walletError || workspacePaymentsError || walletTransactionsError) ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {lang === 'en' ? 'Some wallet data could not be loaded. Refresh to try again.' : 'Một phần dữ liệu ví chưa tải được. Hãy tải lại để thử lại.'}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className={cn(cardClass, 'p-5')}>
          <div className="flex items-center gap-2">
            <CreditCard className={cn('h-4 w-4', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}>
              {lang === 'en' ? 'Balance breakdown' : 'Chi tiết số dư'}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={cn('rounded-2xl border px-4 py-3', innerCardClass)}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${eyebrowClass}`}>
                {lang === 'en' ? 'Regular credits' : 'QMC thường'}
              </p>
              <p className={cn('mt-2 text-xl font-bold tabular-nums tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {walletLoading ? '…' : formatNumber(walletSummary.regularCreditBalance, locale)}
              </p>
            </div>
            <div className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-blue-400/20 bg-blue-400/10' : 'border-blue-200 bg-blue-50')}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                {lang === 'en' ? 'Plan credits' : 'QMC từ gói'}
              </p>
              <p className={cn('mt-2 text-xl font-bold tabular-nums tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {walletLoading ? '…' : formatNumber(walletSummary.planCreditBalance, locale)}
              </p>
            </div>
          </div>

          <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs ${subtleTextClass}`}>
            <span>
              {lang === 'en' ? 'Wallet updated' : 'Ví cập nhật'}:{' '}
              {walletSummary.updatedAt ? formatDateTime(walletSummary.updatedAt, lang, true) : '—'}
            </span>
            {walletSummary.planCreditExpiresAt ? (
              <span>
                {lang === 'en' ? 'Plan credits expire' : 'QMC gói hết hạn'}:{' '}
                {formatDateTime(walletSummary.planCreditExpiresAt, lang, true)}
              </span>
            ) : null}
          </div>
        </div>

        <div className={cn(cardClass, 'p-5 lg:max-w-xl lg:justify-self-end w-full')}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className={cn('h-4 w-4', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {lang === 'en' ? 'Top up credits' : 'Nạp thêm QMC'}
            </h3>
          </div>
          <p className={`text-xs leading-relaxed ${subtleTextClass}`}>
            {lang === 'en'
              ? 'Add more QMC to this shared wallet.'
              : 'Bổ sung thêm QMC vào ví dùng chung của nhóm.'}
          </p>
          {!canBuyGroupCredits ? (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {lang === 'en'
                ? 'This plan currently does not allow buying extra credits for the group.'
                : 'Gói hiện tại chưa cho phép mua thêm QMC cho nhóm.'}
            </div>
          ) : creditPackagesLoading && featuredCreditPackages.length === 0 ? (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>…</div>
          ) : featuredCreditPackages.length === 0 ? (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>
              {lang === 'en' ? 'No credit packages are available right now.' : 'Hiện chưa có gói QMC khả dụng.'}
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
                          ? (lang === 'en'
                            ? `Includes +${formatNumber(pkg.bonusCredit, locale)} bonus QMC`
                            : `Bao gồm +${formatNumber(pkg.bonusCredit, locale)} QMC thưởng`)
                          : (lang === 'en' ? 'Top up the shared wallet' : 'Nạp vào ví dùng chung')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {formatCurrency(pkg?.price, locale)}
                      </p>
                      <p className={`mt-1 text-[11px] font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>
                        {lang === 'en' ? 'Buy now' : 'Mua ngay'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(cardClass, 'p-5')}>
          <div className="mb-1 flex items-center gap-2">
            <ReceiptText className={cn('h-4 w-4', isDarkMode ? 'text-violet-300' : 'text-violet-600')} />
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {lang === 'en' ? 'Purchase history' : 'Lịch sử mua'}
            </h3>
          </div>
          <p className={`text-xs ${subtleTextClass}`}>
            {lang === 'en' ? 'Recent payments for this workspace plan and shared credits.' : 'Các thanh toán gần đây cho gói và QMC dùng chung của không gian này.'}
          </p>
          <div className="mt-4 space-y-3">
            {workspacePaymentsLoading ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>…</div>
            ) : purchaseHistory.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>
                {lang === 'en' ? 'No purchase records yet.' : 'Chưa có lịch sử mua.'}
              </div>
            ) : purchaseHistory.map((payment) => {
              const statusMeta = paymentStatusMeta(payment.paymentStatus, lang, isDarkMode);
              return (
                <div key={payment.paymentId || payment.orderId} className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-white/12 bg-black/20' : 'border-slate-200/90 bg-white/94')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {paymentTargetLabel(payment.paymentTargetType, lang)}
                      </p>
                      <p className={`mt-1 text-xs text-slate-500`}>
                        {payment.orderId || `#${payment.paymentId}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className={cn('text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {formatCurrency(payment.amount, locale)}
                    </p>
                    <p className={`text-xs ${subtleTextClass}`}>
                      {formatDateTime(payment.paidAt || payment.createdAt, lang, true)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cn(cardClass, 'p-5')}>
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className={cn('h-4 w-4', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {lang === 'en' ? 'Usage history' : 'Lịch sử sử dụng'}
            </h3>
          </div>
          <p className={`text-xs ${subtleTextClass}`}>
            {lang === 'en' ? 'Recent shared-wallet activity triggered by AI usage and credit movements.' : 'Các biến động gần đây của ví dùng chung do AI và các thao tác QMC tạo ra.'}
          </p>
          <div className="mt-4 space-y-3">
            {walletTransactionsLoading ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>…</div>
            ) : usageHistory.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${subtleTextClass} ${innerCardClass}`}>
                {lang === 'en' ? 'No usage records yet.' : 'Chưa có lịch sử sử dụng.'}
              </div>
            ) : usageHistory.map((tx) => {
              const totalChange = Number(tx.creditChange ?? 0) + Number(tx.planCreditChange ?? 0);
              const isPositive = totalChange >= 0;
              const recentAt = toSafeDate(tx.createdAt)?.getTime() ?? 0;
              const isRecent = recentAt > 0 && renderTimestamp - recentAt <= 3 * DAY_MS;
              const uiActivity = parseUiActivityNote(tx.note);
              const activityTitle = uiActivity
                ? formatUiActivityTitle(uiActivity.actionKey, uiActivity.target, lang)
                : creditTransactionLabel(tx.transactionType, lang);
              const activityNote = uiActivity
                ? formatUiActivitySubtitle(uiActivity.workspaceName, lang)
                : sanitizeActivityNote(tx.note);

              return (
                <div key={tx.creditTransactionId} className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-white/12 bg-black/20' : 'border-slate-200/90 bg-white/94')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('max-w-[360px] truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')} title={activityTitle}>
                          {activityTitle}
                        </p>
                        {isRecent ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}`}>
                            {lang === 'en' ? 'Recent' : 'Gần đây'}
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-1 text-xs ${subtleTextClass}`}>
                        {creditSourceLabel(tx.sourceType, lang)}
                        {activityNote ? ` · ${activityNote}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
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
                  <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 text-xs ${subtleTextClass}`}>
                    <span>
                      {lang === 'en' ? 'Balance after' : 'Số dư sau'}: {formatNumber(tx.balanceAfter, locale)}
                    </span>
                    <span>{formatDateTime(tx.createdAt, lang, true)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
