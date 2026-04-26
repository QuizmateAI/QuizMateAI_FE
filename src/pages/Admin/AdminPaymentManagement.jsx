import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Eye, Banknote, Clock, X } from 'lucide-react';
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
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const TARGET_TYPE_LABELS = {
  USER_PLAN: 'adminPayments.targetTypes.USER_PLAN',
  WORKSPACE_PLAN: 'adminPayments.targetTypes.WORKSPACE_PLAN',
  USER_CREDIT: 'adminPayments.targetTypes.USER_CREDIT',
  WORKSPACE_CREDIT: 'adminPayments.targetTypes.WORKSPACE_CREDIT',
  WORKSPACE_SLOT: 'adminPayments.targetTypes.WORKSPACE_SLOT',
};

function AdminPaymentManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const canRead = !permLoading && permissions.has('payment:read');
  const canWrite = !permLoading && permissions.has('payment:write');

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [payments, setPayments] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isExpireOpen, setIsExpireOpen] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);
  const [expireForm, setExpireForm] = useState({ confirmText: '', reason: '' });

  const confirmTextValid = expireForm.confirmText === 'EXPIRE-OVERDUE';
  const reasonValid = expireForm.reason.trim().length >= 10 && expireForm.reason.trim().length <= 500;
  const canSubmitExpire = confirmTextValid && reasonValid && !isExpiring;

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

  const formatTargetType = (paymentTargetType) => {
    const key = TARGET_TYPE_LABELS[paymentTargetType];
    if (!key) return paymentTargetType || '-';
    return t(key);
  };

  const normalizeNumericFilter = (value, label) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return undefined;
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(t('adminPayments.validation.positiveInteger', { field: label }));
    }
    return Number(trimmed);
  };

  const loadPayments = async (nextPage = 0, overrideFilters = filters) => {
    setIsLoading(true);
    setError('');
    try {
      const orderId = overrideFilters.orderId.trim();
      if (orderId) {
        const detailRes = await getAdminPaymentByOrderId(orderId);
        const detailData = detailRes?.data ?? detailRes;
        setPayments(detailData ? [detailData] : []);
        setPageInfo({
          page: 0,
          size: 1,
          totalElements: detailData ? 1 : 0,
          totalPages: detailData ? 1 : 0,
          first: true,
          last: true,
        });
        return;
      }

      const userId = normalizeNumericFilter(overrideFilters.userId, t('adminPayments.fields.userId'));
      const workspaceId = normalizeNumericFilter(overrideFilters.workspaceId, t('adminPayments.fields.workspaceId'));
      const res = await getAdminPayments({
        page: nextPage,
        size: pageInfo.size,
        userId,
        workspaceId,
        status: overrideFilters.status || undefined,
      });
      const data = res?.data ?? res ?? {};
      const content = Array.isArray(data?.content) ? data.content : [];
      setPayments(content);
      setPageInfo({
        page: Number(data?.page || 0),
        size: Number(data?.size || pageInfo.size || 10),
        totalElements: Number(data?.totalElements || 0),
        totalPages: Number(data?.totalPages || 0),
        first: Boolean(data?.first),
        last: Boolean(data?.last),
      });
    } catch (err) {
      const msg = getFriendlyError(err, t('adminPayments.errors.loadList'));
      setPayments([]);
      setPageInfo({
        page: 0,
        size: pageInfo.size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
      });
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (permLoading || !canRead) return;
    loadPayments(0, INITIAL_FILTERS);
  }, [permLoading, canRead]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    await loadPayments(0, filters);
  };

  const handleReset = async () => {
    setFilters(INITIAL_FILTERS);
    await loadPayments(0, INITIAL_FILTERS);
  };

  const handleOpenDetail = async (payment) => {
    if (!payment?.orderId) return;
    setSelectedPayment(payment);
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const res = await getAdminPaymentByOrderId(payment.orderId);
      setSelectedPayment(res?.data ?? res ?? payment);
    } catch (err) {
      const msg = getFriendlyError(err, t('adminPayments.errors.loadDetail'));
      setError(msg);
      showError(msg);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleExpireOverdue = async () => {
    if (!canSubmitExpire) return;
    setIsExpiring(true);
    try {
      const res = await expireOverduePayments({
        confirmText: expireForm.confirmText,
        reason: expireForm.reason.trim(),
      });
      const count = res?.data?.data ?? res?.data ?? 0;
      showSuccess(t('adminPayments.expireSuccess', { count }));
      setIsExpireOpen(false);
      setExpireForm({ confirmText: '', reason: '' });
      await loadPayments(pageInfo.page, filters);
    } catch (err) {
      showError(getFriendlyError(err, t('adminPayments.errors.expireFailed')));
    } finally {
      setIsExpiring(false);
    }
  };

  const renderStatusBadge = (status) => (
    <Badge className={STATUS_META[status] || STATUS_META.CANCELLED}>
      {status ? t(`adminPayments.status.${status}`, { defaultValue: status }) : '-'}
    </Badge>
  );

  const renderTargetSummary = (payment) => {
    const targetSubject = payment.workspaceId != null
      ? `${t('adminPayments.detail.fields.workspace')} #${payment.workspaceId}`
      : payment.chargedUserId != null
        ? `${t('adminPayments.detail.fields.chargedUser')} #${payment.chargedUserId}`
        : payment.groupSubscriptionId != null
          ? `${t('adminPayments.detail.fields.groupSubscription')} #${payment.groupSubscriptionId}`
          : payment.userSubscriptionId != null
            ? `${t('adminPayments.detail.fields.userSubscription')} #${payment.userSubscriptionId}`
            : null;

    return (
      <div className="min-w-[220px] space-y-1">
        <div className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          {formatTargetType(payment.paymentTargetType)}
        </div>
        {targetSubject && (
          <div
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {targetSubject}
          </div>
        )}
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

      <Card className={`border shadow-sm rounded-[24px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className={`text-xl flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <Banknote className="w-5 h-5 text-emerald-500" />
            {t('adminPayments.filterTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <Input
              value={filters.orderId}
              onChange={(event) => handleFilterChange('orderId', event.target.value)}
              placeholder={t('adminPayments.placeholders.orderId')}
            />
            <Input
              value={filters.userId}
              onChange={(event) => handleFilterChange('userId', event.target.value)}
              placeholder={t('adminPayments.placeholders.userId')}
            />
            <Input
              value={filters.workspaceId}
              onChange={(event) => handleFilterChange('workspaceId', event.target.value)}
              placeholder={t('adminPayments.placeholders.workspaceId')}
            />
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className={`h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm ${
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
              <Button type="submit" className="rounded-xl flex-1">
                <Search className="w-4 h-4 mr-2" />
                {t('adminPayments.search')}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} className="rounded-xl">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={`border shadow-sm overflow-hidden rounded-[24px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className={`text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('adminPayments.listTitle')}
          </CardTitle>
          <div className="flex items-center gap-3">
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={openExpireDialog}
                className={`rounded-xl gap-2 ${isDarkMode ? 'border-amber-700 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
              >
                <Clock className="w-4 h-4" />
                {t('adminPayments.expireOverdue')}
              </Button>
            )}
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('adminPayments.summary', { count: new Intl.NumberFormat(locale).format(pageInfo.totalElements) })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.orderId')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.user')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.target')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.amount')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.method')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.status')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminPayments.table.time')}</TableHead>
                  <TableHead className="text-right font-bold text-slate-500">{t('adminPayments.table.actions')}</TableHead>
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
                      <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">
                        {payment.orderId}
                      </TableCell>
                      <TableCell>#{payment.userId ?? '-'}</TableCell>
                      <TableCell>{renderTargetSummary(payment)}</TableCell>
                      <TableCell>{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.paymentMethod || '-'}</TableCell>
                      <TableCell>{renderStatusBadge(payment.paymentStatus)}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDate(payment.paidAt || payment.createdAt || payment.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => handleOpenDetail(payment)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t('adminPayments.detail.action')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!filters.orderId.trim() && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('adminPayments.pagination.page', {
                  current: pageInfo.totalPages === 0 ? 0 : pageInfo.page + 1,
                  total: pageInfo.totalPages || 0,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || pageInfo.first}
                  onClick={() => loadPayments(Math.max(pageInfo.page - 1, 0))}
                  className="rounded-lg"
                >
                  {t('adminPayments.pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || pageInfo.last || pageInfo.totalPages === 0}
                  onClick={() => loadPayments(pageInfo.page + 1)}
                  className="rounded-lg"
                >
                  {t('adminPayments.pagination.next')}
                </Button>
              </div>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.paymentId')}</div>
                <div className="font-medium">{selectedPayment.paymentId ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.orderId')}</div>
                <div className="font-mono text-sm">{selectedPayment.orderId || '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.payerUser')}</div>
                <div className="font-medium">#{selectedPayment.userId ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.chargedUser')}</div>
                <div className="font-medium">#{selectedPayment.chargedUserId ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.workspace')}</div>
                <div className="font-medium">#{selectedPayment.workspaceId ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.targetType')}</div>
                <div className="font-medium">{formatTargetType(selectedPayment.paymentTargetType)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.userSubscription')}</div>
                <div className="font-medium">#{selectedPayment.userSubscriptionId ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.groupSubscription')}</div>
                <div className="font-medium">#{selectedPayment.groupSubscriptionId ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.amount')}</div>
                <div className="font-medium">{formatMoney(selectedPayment.amount)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.method')}</div>
                <div className="font-medium">{selectedPayment.paymentMethod || '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.status')}</div>
                <div>{renderStatusBadge(selectedPayment.paymentStatus)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.gatewayTransactionId')}</div>
                <div className="font-mono text-sm break-all">{selectedPayment.gatewayTransactionId || '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.gatewayAmount')}</div>
                <div className="font-medium">{formatGatewayAmount(selectedPayment)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.gatewayCurrency')}</div>
                <div className="font-medium">{selectedPayment.gatewayCurrency || '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.gatewayVerifiedAt')}</div>
                <div className="font-medium">{formatDate(selectedPayment.gatewayVerifiedAt)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.createdAt')}</div>
                <div className="font-medium">{formatDate(selectedPayment.createdAt)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.paidAt')}</div>
                <div className="font-medium">{formatDate(selectedPayment.paidAt)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.expiresAt')}</div>
                <div className="font-medium">{formatDate(selectedPayment.expiresAt)}</div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('adminPayments.detail.fields.payUrl')}</div>
                {selectedPayment.payUrl ? (
                  <a
                    href={selectedPayment.payUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 break-all underline"
                  >
                    {selectedPayment.payUrl}
                  </a>
                ) : (
                  <div className="font-medium">-</div>
                )}
              </div>
            </div>
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
