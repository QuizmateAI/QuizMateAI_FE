import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Eye, Clock, X, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { getExpireOverdueLogs, getExpireOverdueLogDetail } from '@/api/ManagementSystemAPI';
import AdminPagination from './AdminPagination';

const TARGET_TYPE_LABELS = {
  USER_PLAN: 'adminPayments.targetTypes.USER_PLAN',
  WORKSPACE_PLAN: 'adminPayments.targetTypes.WORKSPACE_PLAN',
  USER_CREDIT: 'adminPayments.targetTypes.USER_CREDIT',
  WORKSPACE_CREDIT: 'adminPayments.targetTypes.WORKSPACE_CREDIT',
  WORKSPACE_SLOT: 'adminPayments.targetTypes.WORKSPACE_SLOT',
};

const CLEANUP_LOGS_QUERY_KEY = ['admin', 'payment-cleanup-logs'];

function AdminPaymentCleanupLogs() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch Cleanup Logs list
  const {
    data: queryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...CLEANUP_LOGS_QUERY_KEY, page, size],
    queryFn: async () => {
      const res = await getExpireOverdueLogs(page, size);
      const data = res?.data ?? res ?? {};
      const content = Array.isArray(data?.content) ? data.content : [];
      return {
        logs: content,
        pageInfo: {
          page: Number(data?.page || 0),
          size: Number(data?.size || size),
          totalElements: Number(data?.totalElements || 0),
          totalPages: Number(data?.totalPages || 0),
          first: Boolean(data?.first),
          last: Boolean(data?.last),
        },
      };
    },
    placeholderData: (previous) => previous,
  });

  // Fetch cleanup details when selectedLogId changes and isDetailOpen is true
  const {
    data: detailData,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ['admin', 'payment-cleanup-logs', 'detail', selectedLogId],
    queryFn: async () => {
      if (selectedLogId == null) return null;
      const res = await getExpireOverdueLogDetail(selectedLogId);
      return res?.data ?? res ?? null;
    },
    enabled: selectedLogId !== null && isDetailOpen,
  });

  const logs = queryData?.logs ?? [];
  const pageInfo = queryData?.pageInfo ?? {
    page: 0,
    size,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= pageInfo.totalPages || nextPage === pageInfo.page) return;
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextSize) => {
    setSize(nextSize);
    setPage(0);
  };

  const handleOpenDetail = (logId) => {
    setSelectedLogId(logId);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedLogId(null);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(locale);
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(locale).format(amount);
  };

  const formatTargetType = (paymentTargetType) => {
    const key = TARGET_TYPE_LABELS[paymentTargetType];
    if (!key) return paymentTargetType || '-';
    return t(key);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error?.message || t('adminPayments.logs.errors.loadList')}
        </div>
      )}

      <Card className={`overflow-hidden rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="flex flex-col gap-3 p-5 border-b border-slate-100 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className={`flex items-center gap-2 text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <Clock className="h-5 w-5 text-[#0455BF]" />
              <span>{t('adminPayments.logs.title')}</span>
            </CardTitle>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('adminPayments.logs.desc')}
            </p>
          </div>
          <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            {t('adminPayments.summary', { count: new Intl.NumberFormat(locale).format(pageInfo.totalElements) })}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px] table-fixed">
              <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[100px] font-bold text-slate-500">{t('adminPayments.logs.table.logId')}</TableHead>
                  <TableHead className="w-[160px] font-bold text-slate-500">{t('adminPayments.logs.table.actorName')}</TableHead>
                  <TableHead className="w-[380px] font-bold text-slate-500">{t('adminPayments.logs.table.reason')}</TableHead>
                  <TableHead className="w-[160px] text-right font-bold text-slate-500">{t('adminPayments.logs.table.totalAffected')}</TableHead>
                  <TableHead className="w-[160px] font-bold text-slate-500">{t('adminPayments.logs.table.createdAt')}</TableHead>
                  <TableHead className="w-[90px] text-right font-bold text-slate-500">{t('adminPayments.detail.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-slate-400 italic">
                      {t('adminPayments.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.cleanupLogId}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="align-middle font-mono font-medium">{log.cleanupLogId}</TableCell>
                      <TableCell className="align-middle font-semibold text-slate-800 dark:text-slate-200">{log.actorName || `Admin #${log.actorId}`}</TableCell>
                      <TableCell className="align-middle max-w-[380px] truncate text-slate-600 dark:text-slate-400" title={log.reason}>
                        {log.reason}
                      </TableCell>
                      <TableCell className="text-right align-middle font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        {log.totalAffected}
                      </TableCell>
                      <TableCell className="align-middle text-slate-500 tabular-nums">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-right align-middle">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t('adminPayments.detail.action')}
                          title={t('adminPayments.detail.action')}
                          className="h-9 w-9 rounded-lg"
                          onClick={() => handleOpenDetail(log.cleanupLogId)}
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
        </CardContent>
      </Card>

      {/* Cleanup Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => (!open && handleCloseDetail())}>
        <DialogContent className={`max-w-4xl max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Clock className="w-5 h-5 text-amber-500" />
              {t('adminPayments.logs.detail.title', { id: selectedLogId })}
            </DialogTitle>
            <DialogDescription>
              {t('adminPayments.logs.detail.desc')}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="py-16 text-center">
              <ListSpinner variant="inline" />
            </div>
          ) : detailError ? (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
              {detailError?.message || t('adminPayments.logs.errors.loadDetail')}
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {/* Batch Metadata Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {t('adminPayments.logs.detail.metadata.actor')}
                  </h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {detailData.actorName || `Admin #${detailData.actorId}`}
                  </p>
                </Card>

                <Card className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {t('adminPayments.logs.detail.metadata.createdAt')}
                  </h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatDate(detailData.createdAt)}
                  </p>
                </Card>

                <Card className={`p-4 rounded-xl border md:col-span-2 ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {t('adminPayments.logs.detail.metadata.reason')}
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 break-words font-medium">
                    {detailData.reason}
                  </p>
                </Card>

                <Card className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {t('adminPayments.logs.detail.metadata.confirmText')}
                  </h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {detailData.confirmText || '-'}
                  </p>
                </Card>

                <Card className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {t('adminPayments.logs.detail.metadata.totalAffected')}
                  </h4>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {detailData.totalAffected}
                  </p>
                </Card>
              </div>

              {/* Affected Transactions List */}
              <div className="space-y-3">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  <FileSpreadsheet className="w-5 h-5 text-[#0455BF]" />
                  <span>{t('adminPayments.listTitle')}</span>
                </h3>

                <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-white'}`}>
                  <div className="overflow-x-auto max-h-[350px]">
                    <Table className="min-w-[900px] table-fixed">
                      <TableHeader className={`sticky top-0 z-10 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                        <TableRow className="border-b border-slate-100 dark:border-slate-800">
                          <TableHead className="w-[100px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.paymentId')}</TableHead>
                          <TableHead className="w-[160px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.orderId')}</TableHead>
                          <TableHead className="w-[150px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.payer')}</TableHead>
                          <TableHead className="w-[150px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.workspace')}</TableHead>
                          <TableHead className="w-[120px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.targetType')}</TableHead>
                          <TableHead className="w-[120px] text-right font-bold text-slate-500">{t('adminPayments.logs.detail.table.amount')}</TableHead>
                          <TableHead className="w-[160px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.expiresAt')}</TableHead>
                          <TableHead className="w-[160px] font-bold text-slate-500">{t('adminPayments.logs.detail.table.createdAt')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!detailData.affectedPaymentsDetail || detailData.affectedPaymentsDetail.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-slate-400 italic">
                              {t('adminPayments.logs.detail.empty')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          detailData.affectedPaymentsDetail.map((pay) => (
                            <TableRow key={pay.paymentId} className="border-b border-slate-100 dark:border-slate-800">
                              <TableCell className="align-middle font-mono text-xs">{pay.paymentId}</TableCell>
                              <TableCell className="align-middle font-mono text-xs text-blue-600 dark:text-blue-400 truncate max-w-[160px]" title={pay.orderId}>
                                {pay.orderId}
                              </TableCell>
                              <TableCell className="align-middle truncate text-slate-700 dark:text-slate-300 font-semibold" title={pay.payerUserName}>
                                {pay.payerUserName || `User #${pay.payerUserId}`}
                              </TableCell>
                              <TableCell className="align-middle truncate text-slate-600 dark:text-slate-400" title={pay.workspaceName}>
                                {pay.workspaceName || (pay.workspaceId ? `WS #${pay.workspaceId}` : '-')}
                              </TableCell>
                              <TableCell className="align-middle text-xs">
                                <Badge variant="secondary" className="whitespace-nowrap rounded-md px-2 py-0.5">
                                  {formatTargetType(pay.paymentTargetType)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right align-middle font-bold tabular-nums">
                                {formatMoney(pay.amount)}
                              </TableCell>
                              <TableCell className="align-middle text-slate-500 text-xs tabular-nums">
                                {formatDate(pay.expiresAt)}
                              </TableCell>
                              <TableCell className="align-middle text-slate-500 text-xs tabular-nums">
                                {formatDate(pay.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDetail}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPaymentCleanupLogs;
