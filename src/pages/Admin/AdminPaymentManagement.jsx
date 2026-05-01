import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Eye, Banknote, Clock, X, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { getAdminPayments, getAdminPaymentByOrderId, expireOverduePayments } from '@/api/ManagementSystemAPI';
import AdminPaymentDetailFields from './components/AdminPaymentDetailFields';
import AdminPagination from './components/AdminPagination';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from '@/pages/SuperAdmin/Components/SuperAdminSurface';

const INITIAL_FILTERS = {
  orderId: '',
  userId: '',
  workspaceId: '',
  status: '',
};

const STATUS_OPTIONS = ['', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];

const STATUS_META = {
  PENDING: 'bg-amber-100 text-amber-700 ring-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800 dark:hover:bg-amber-900/30',
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800 dark:hover:bg-emerald-900/30',
  FAILED: 'bg-rose-100 text-rose-700 ring-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800 dark:hover:bg-rose-900/30',
  CANCELLED: 'bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800 dark:hover:bg-orange-950/40',
};

const PAYMENT_METHOD_META = {
  STRIPE: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800',
  MOMO: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:ring-pink-800',
  VNPAY: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800',
  DEFAULT: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

const TARGET_TYPE_LABELS = {
  USER_PLAN: 'adminPayments.targetTypes.USER_PLAN',
  WORKSPACE_PLAN: 'adminPayments.targetTypes.WORKSPACE_PLAN',
  USER_CREDIT: 'adminPayments.targetTypes.USER_CREDIT',
  WORKSPACE_CREDIT: 'adminPayments.targetTypes.WORKSPACE_CREDIT',
  WORKSPACE_SLOT: 'adminPayments.targetTypes.WORKSPACE_SLOT',
};

const ADMIN_PAYMENTS_QUERY_KEY = ['admin', 'payments'];

const EMPTY_PAGE_INFO = {
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

function AdminPaymentManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const canRead = !permLoading && permissions.has('payment:read');
  const canWrite = !permLoading && permissions.has('payment:write');

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [isExpireOpen, setIsExpireOpen] = useState(false);
  const [expireForm, setExpireForm] = useState({ confirmText: '', reason: '' });

  const confirmTextValid = expireForm.confirmText === 'EXPIRE-OVERDUE';
  const reasonValid = expireForm.reason.trim().length >= 10 && expireForm.reason.trim().length <= 500;

  const openExpireDialog = () => {
    setExpireForm({ confirmText: '', reason: '' });
    setIsExpireOpen(true);
  };

  const closeExpireDialog = () => {
    if (isExpiring) return;
    setIsExpireOpen(false);
  };

  const getFriendlyError = (err, fallbackText) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return fallbackText;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(locale);
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(locale).format(amount);
  };

  const formatGatewayAmount = (payment) => {
    if (payment?.gatewayAmount == null) return '-';
    const currency = payment.gatewayCurrency ? ` ${payment.gatewayCurrency}` : '';
    return `${formatMoney(payment.gatewayAmount)}${currency}`;
  };

  const formatDateParts = (value) => {
    if (!value) return { time: '-', date: '' };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { time: '-', date: '' };
    return {
      time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: date.toLocaleDateString(locale),
    };
  };

  const formatTargetType = (paymentTargetType) => {
    const key = TARGET_TYPE_LABELS[paymentTargetType];
    if (!key) return paymentTargetType || '-';
    return t(key);
  };

  const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

  const getPayerUserName = (payment) => normalizeText(
    payment?.payerUserName
      || payment?.userFullName
      || payment?.userName
      || payment?.username
      || payment?.payerUsername
  ) || '-';

  const getChargedUserName = (payment) => normalizeText(
    payment?.chargedUserName
      || payment?.chargedUserFullName
      || payment?.chargedUserUsername
      || payment?.chargedUsername
  ) || '-';

  const normalizeNumericFilter = (value, label) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return undefined;
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(t('adminPayments.validation.positiveInteger', { field: label }));
    }
    return Number(trimmed);
  };

  const fetchPayments = async (currentPage, currentSize, currentFilters) => {
    const orderId = currentFilters.orderId.trim();
    if (orderId) {
      const detailRes = await getAdminPaymentByOrderId(orderId);
      const detailData = detailRes?.data ?? detailRes;
      return {
        payments: detailData ? [detailData] : [],
        pageInfo: {
          page: 0,
          size: currentSize,
          totalElements: detailData ? 1 : 0,
          totalPages: detailData ? 1 : 0,
          first: true,
          last: true,
        },
      };
    }

    const userId = normalizeNumericFilter(currentFilters.userId, t('adminPayments.fields.userId'));
    const workspaceId = normalizeNumericFilter(currentFilters.workspaceId, t('adminPayments.fields.workspaceId'));
    const res = await getAdminPayments({
      page: currentPage,
      size: currentSize,
      userId,
      workspaceId,
      status: currentFilters.status || undefined,
    });
    const data = res?.data ?? res ?? {};
    const content = Array.isArray(data?.content) ? data.content : [];
    return {
      payments: content,
      pageInfo: {
        page: Number(data?.page || 0),
        size: Number(data?.size || currentSize || 10),
        totalElements: Number(data?.totalElements || 0),
        totalPages: Number(data?.totalPages || 0),
        first: Boolean(data?.first),
        last: Boolean(data?.last),
      },
    };
  };

  const {
    data: queryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [...ADMIN_PAYMENTS_QUERY_KEY, page, size, appliedFilters],
    queryFn: () => fetchPayments(page, size, appliedFilters),
    enabled: canRead && !permLoading,
    placeholderData: (previous) => previous,
  });

  const payments = queryData?.payments ?? [];
  const pageInfo = queryData?.pageInfo ?? { ...EMPTY_PAGE_INFO, size };
  const error = queryError ? getFriendlyError(queryError, t('adminPayments.errors.loadList')) : detailError;

  const invalidatePayments = () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_PAYMENTS_QUERY_KEY });

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(0);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= pageInfo.totalPages || nextPage === pageInfo.page) return;
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextSize) => {
    setSize(nextSize);
    setPage(0);
  };

  const handleOpenDetail = async (payment) => {
    if (!payment?.orderId) return;
    setSelectedPayment(payment);
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailError('');
    try {
      const res = await getAdminPaymentByOrderId(payment.orderId);
      setSelectedPayment(res?.data ?? res ?? payment);
    } catch (err) {
      const msg = getFriendlyError(err, t('adminPayments.errors.loadDetail'));
      setDetailError(msg);
      showError(msg);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const expireMutation = useMutation({
    mutationFn: async ({ confirmText, reason }) => {
      const res = await expireOverduePayments({ confirmText, reason: reason.trim() });
      return res?.data?.data ?? res?.data ?? 0;
    },
    onSuccess: (count) => {
      showSuccess(t('adminPayments.expireSuccess', { count }));
      setIsExpireOpen(false);
      setExpireForm({ confirmText: '', reason: '' });
      invalidatePayments();
    },
    onError: (err) => {
      showError(getFriendlyError(err, t('adminPayments.errors.expireFailed')));
    },
  });

  const isExpiring = expireMutation.isPending;
  const canSubmitExpire = confirmTextValid && reasonValid && !isExpiring;

  const handleExpireOverdue = () => {
    if (!canSubmitExpire) return;
    expireMutation.mutate({
      confirmText: expireForm.confirmText,
      reason: expireForm.reason,
    });
  };

  const renderStatusBadge = (status) => (
    <Badge variant="outline" className={`inline-flex min-w-[82px] justify-center whitespace-nowrap rounded-lg border-0 px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_META[status] || STATUS_META.CANCELLED}`}>
      {status ? t(`adminPayments.status.${status}`, { defaultValue: status }) : '-'}
    </Badge>
  );

  const renderPaymentMethodBadge = (method) => {
    const normalizedMethod = String(method || '').toUpperCase();
    const metaClass = PAYMENT_METHOD_META[normalizedMethod] || PAYMENT_METHOD_META.DEFAULT;
    return (
      <span className={`inline-flex min-w-[74px] justify-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide ring-1 ${metaClass}`}>
        {normalizedMethod || '-'}
      </span>
    );
  };

  const renderOrderId = (orderId) => (
    <span
      title={orderId || '-'}
      className="block max-w-[145px] truncate font-mono text-[13px] font-medium text-blue-600 dark:text-blue-400"
    >
      {orderId || '-'}
    </span>
  );

  const renderUserName = (payment) => {
    const name = getPayerUserName(payment);
    return (
      <div className="min-w-0 max-w-[130px]">
        <div title={name} className={`block truncate whitespace-nowrap text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          {name}
        </div>
      </div>
    );
  };

  const renderPaymentTime = (payment) => {
    const parts = formatDateParts(payment.paidAt || payment.createdAt || payment.expiresAt);
    return (
      <div className="min-w-[108px] text-sm tabular-nums">
        <div className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{parts.time}</div>
        {parts.date && <div className={isDarkMode ? 'text-slate-500' : 'text-slate-500'}>{parts.date}</div>}
      </div>
    );
  };

  const renderTargetSummary = (payment) => {
    return (
      <div className="min-w-[130px] max-w-[150px]">
        <div className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          {formatTargetType(payment.paymentTargetType)}
        </div>
      </div>
    );
  };

  if (!permLoading && !canRead) {
    return (
      <SuperAdminPage className={fontClass}>
        <Card className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}>
          <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
            {t('adminPayments.permissionDenied')}
          </CardContent>
        </Card>
      </SuperAdminPage>
    );
  }

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        title={t('sidebar.payments')}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      <Card className={`rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className={`flex items-center gap-2 text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <Banknote className="w-5 h-5 text-[#0455BF]" />
            <span>{t('adminPayments.filterTitle')}</span>
          </CardTitle>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('adminPayments.desc')}
          </p>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_auto]">
            <Input
              value={filters.orderId}
              onChange={(event) => handleFilterChange('orderId', event.target.value)}
              placeholder={t('adminPayments.placeholders.orderId')}
              className="h-10 rounded-lg"
            />
            <Input
              value={filters.userId}
              onChange={(event) => handleFilterChange('userId', event.target.value)}
              placeholder={t('adminPayments.placeholders.userId')}
              className="h-10 rounded-lg"
            />
            <Input
              value={filters.workspaceId}
              onChange={(event) => handleFilterChange('workspaceId', event.target.value)}
              placeholder={t('adminPayments.placeholders.workspaceId')}
              className="h-10 rounded-lg"
            />
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className={`h-10 w-full rounded-lg border px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-[#0455BF] ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-input text-slate-900'
              }`}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status || 'ALL'} value={status}>
                  {status ? t(`adminPayments.status.${status}`, { defaultValue: status }) : t('adminPayments.allStatuses')}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="h-10 flex-1 rounded-lg">
                <Search className="w-4 h-4 mr-2" />
                {t('adminPayments.search')}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} className="h-10 rounded-lg px-3">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={`overflow-hidden rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="flex flex-col gap-3 p-5 border-b border-slate-100 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className={`flex items-center gap-2 text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <ReceiptText className="h-5 w-5 text-[#0455BF]" />
            <span>{t('adminPayments.listTitle')}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={openExpireDialog}
                className={`rounded-lg gap-2 ${isDarkMode ? 'border-amber-700 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
              >
                <Clock className="w-4 h-4" />
                {t('adminPayments.expireOverdue')}
              </Button>
            )}
            <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {t('adminPayments.summary', { count: new Intl.NumberFormat(locale).format(pageInfo.totalElements) })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1040px] table-fixed">
              <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[175px] font-bold text-slate-500">{t('adminPayments.table.orderId')}</TableHead>
                  <TableHead className="w-[145px] font-bold text-slate-500">{t('adminPayments.table.user')}</TableHead>
                  <TableHead className="w-[160px] font-bold text-slate-500">{t('adminPayments.table.target')}</TableHead>
                  <TableHead className="w-[115px] text-right font-bold text-slate-500">{t('adminPayments.table.amount')}</TableHead>
                  <TableHead className="w-[105px] font-bold text-slate-500">{t('adminPayments.table.method')}</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-500">{t('adminPayments.table.status')}</TableHead>
                  <TableHead className="w-[125px] font-bold text-slate-500">{t('adminPayments.table.time')}</TableHead>
                  <TableHead className="w-[95px] text-right font-bold text-slate-500">{t('adminPayments.detail.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-slate-400 italic">
                      {t('adminPayments.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow
                      key={payment.paymentId ?? payment.orderId}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="align-middle">{renderOrderId(payment.orderId)}</TableCell>
                      <TableCell className="align-middle">{renderUserName(payment)}</TableCell>
                      <TableCell>{renderTargetSummary(payment)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{renderPaymentMethodBadge(payment.paymentMethod)}</TableCell>
                      <TableCell>{renderStatusBadge(payment.paymentStatus)}</TableCell>
                      <TableCell>{renderPaymentTime(payment)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t('adminPayments.detail.action')}
                          title={t('adminPayments.detail.action')}
                          className="h-9 w-9 rounded-lg"
                          onClick={() => handleOpenDetail(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!filters.orderId.trim() && (
            <AdminPagination
              currentPage={pageInfo.page}
              totalPages={pageInfo.totalPages}
              totalElements={pageInfo.totalElements}
              pageSize={pageInfo.size}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isDarkMode={isDarkMode}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Expire Overdue Dialog */}
      <Dialog open={isExpireOpen} onOpenChange={(open) => (open ? openExpireDialog() : closeExpireDialog())}>
        <DialogContent className={isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {t('adminPayments.expireOverdue')}
            </DialogTitle>
            <DialogDescription>
              {t('adminPayments.expireDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="expire-confirm-text"
                className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
              >
                {t('adminPayments.expireForm.confirmTextLabel')}
              </label>
              <Input
                id="expire-confirm-text"
                value={expireForm.confirmText}
                onChange={(event) => setExpireForm((prev) => ({ ...prev, confirmText: event.target.value }))}
                placeholder="EXPIRE-OVERDUE"
                autoComplete="off"
                disabled={isExpiring}
              />
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('adminPayments.expireForm.confirmTextHint')}
              </p>
              {expireForm.confirmText.length > 0 && !confirmTextValid && (
                <p className="text-xs text-rose-500">
                  {t('adminPayments.expireForm.confirmTextInvalid')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="expire-reason"
                className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
              >
                {t('adminPayments.expireForm.reasonLabel')}
              </label>
              <textarea
                id="expire-reason"
                value={expireForm.reason}
                onChange={(event) => setExpireForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder={t('adminPayments.expireForm.reasonPlaceholder')}
                rows={3}
                maxLength={500}
                disabled={isExpiring}
                className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-input text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('adminPayments.expireForm.reasonHint')}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {expireForm.reason.trim().length}/500
                </p>
              </div>
              {expireForm.reason.length > 0 && !reasonValid && (
                <p className="text-xs text-rose-500">
                  {t('adminPayments.expireForm.reasonInvalid')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeExpireDialog}
              disabled={isExpiring}
              className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              <X className="w-4 h-4 mr-1" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleExpireOverdue}
              disabled={!canSubmitExpire}
              className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60"
            >
              <Clock className={`w-4 h-4 mr-1 ${isExpiring ? 'animate-spin' : ''}`} />
              {isExpiring ? t('adminPayments.expiring') : t('adminPayments.expireConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className={`max-w-3xl max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              {t('adminPayments.detail.title', { orderId: selectedPayment?.orderId || '' })}
            </DialogTitle>
            <DialogDescription>
              {t('adminPayments.detail.desc')}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="py-10">
              <ListSpinner variant="inline" />
            </div>
          ) : selectedPayment ? (
            <AdminPaymentDetailFields
              payment={selectedPayment}
              isDarkMode={isDarkMode}
              t={t}
              formatMoney={formatMoney}
              formatDate={formatDate}
              formatGatewayAmount={formatGatewayAmount}
              formatTargetType={formatTargetType}
              renderStatusBadge={renderStatusBadge}
              renderPaymentMethodBadge={renderPaymentMethodBadge}
              getPayerUserName={getPayerUserName}
              getChargedUserName={getChargedUserName}
            />
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default AdminPaymentManagement;
