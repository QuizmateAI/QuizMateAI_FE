import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  ShieldCheck,
  CircleSlash,
  Infinity as InfinityIcon,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/Components/ui/dialog';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import AdminPagination from '@/Pages/Admin/components/AdminPagination';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminTabs,
  SuperAdminEmptyState,
} from './Components/SuperAdminSurface';
import {
  listPermissionRequests,
  approvePermissionRequest,
  rejectPermissionRequest,
} from '@/api/ManagementSystemAPI';

function statusClass(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'REJECTED':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'CANCELLED':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getLocaleTag(language) {
  return language === 'vi' ? 'vi-VN' : 'en-US';
}

function formatDate(value, locale) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
}

function buildDurationPresets(t) {
  return [
    { value: null, label: t('permissionDurationPresets.permanent', 'Permanent') },
    { value: 1, label: t('permissionDurationPresets.oneDay', '1 day') },
    { value: 7, label: t('permissionDurationPresets.sevenDays', '7 days') },
    { value: 30, label: t('permissionDurationPresets.thirtyDays', '30 days') },
    { value: 90, label: t('permissionDurationPresets.ninetyDays', '90 days') },
  ];
}

function formatPermissionDuration(days, t) {
  if (!days) return t('permissionDurationPresets.permanent', 'Permanent');
  if (days === 1) return t('permissionDurationPresets.oneDay', '1 day');
  if (days === 7) return t('permissionDurationPresets.sevenDays', '7 days');
  if (days === 30) return t('permissionDurationPresets.thirtyDays', '30 days');
  if (days === 90) return t('permissionDurationPresets.ninetyDays', '90 days');
  return t('permissionDurationPresets.customDays', {
    count: days,
    defaultValue: `${days} days`,
  });
}

function getPermissionRequestStatusLabel(t, status) {
  return t(`permissionRequestStatus.${status}`, status);
}

export default function PermissionRequestsPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();

  const [tab, setTab] = useState('PENDING');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
  });

  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = getLocaleTag(i18n.language);
  const statusTabs = useMemo(
    () => [
      { id: 'PENDING', label: t('permissionRequestsPage.tabs.PENDING', 'Pending') },
      { id: 'APPROVED', label: t('permissionRequestsPage.tabs.APPROVED', 'Approved') },
      { id: 'REJECTED', label: t('permissionRequestsPage.tabs.REJECTED', 'Rejected') },
      { id: 'CANCELLED', label: t('permissionRequestsPage.tabs.CANCELLED', 'Cancelled') },
      { id: 'ALL', label: t('permissionRequestsPage.tabs.ALL', 'All') },
    ],
    [t],
  );

  const friendly = (err, fallback) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== 'error.unknown' ? mapped : fallback;
  };

  const fetchData = useCallback(
    async (page = 0, size = pagination.size) => {
      setLoading(true);
      try {
        const response = await listPermissionRequests({
          status: tab === 'ALL' ? undefined : tab,
          page,
          size,
        });
        const data = response?.data || {};
        setRows(data.content || []);
        setPagination({
          page: data.page ?? 0,
          size: data.size ?? size,
          totalPages: data.totalPages ?? 0,
          totalElements: data.totalElements ?? 0,
        });
      } catch (err) {
        showError(friendly(err, t('permissionRequestsPage.loadError', 'Unable to load requests.')));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.size, showError, t, tab],
  );

  useEffect(() => {
    fetchData(0, pagination.size);
  }, [fetchData, pagination.size, tab]);

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow={t('permissionRequestsPage.eyebrow', 'Access control')}
        title={t('permissionRequestsPage.title', 'Permission requests')}
        description={t(
          'permissionRequestsPage.description',
          'Approve or reject admin access requests. You can grant temporary access and the system will revoke it automatically when it expires.',
        )}
        actions={(
          <Button
            variant="outline"
            onClick={() => fetchData(pagination.page, pagination.size)}
            disabled={loading}
            className="h-10 rounded-2xl"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('permissionRequestsPage.refresh', 'Refresh')}
          </Button>
        )}
      />

      <SuperAdminTabs tabs={statusTabs} active={tab} onChange={setTab} />

      <SuperAdminPanel contentClassName="p-0">
        {loading ? (
          <div className="p-6">
            <ListSpinner variant="table" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <SuperAdminEmptyState
              title={t('permissionRequestsPage.emptyTitle', 'No requests found')}
            />
          </div>
        ) : (
          <Table className="table-auto min-w-full text-left">
            <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
              <TableRow>
                <TableHead className="w-[220px] font-bold text-slate-500">
                  {t('permissionRequestsPage.table.requester', 'Requester')}
                </TableHead>
                <TableHead className="w-[160px] font-bold text-slate-500">
                  {t('permissionRequestsPage.table.permission', 'Permission')}
                </TableHead>
                <TableHead className="font-bold text-slate-500">
                  {t('permissionRequestsPage.table.reason', 'Reason')}
                </TableHead>
                <TableHead className="w-[110px] font-bold text-slate-500">
                  {t('permissionRequestsPage.table.requestedDuration', 'Requested duration')}
                </TableHead>
                <TableHead className="w-[110px] font-bold text-slate-500">
                  {t('permissionRequestsPage.table.status', 'Status')}
                </TableHead>
                <TableHead className="w-[160px] font-bold text-slate-500">
                  {t('permissionRequestsPage.table.createdAt', 'Created at')}
                </TableHead>
                <TableHead className="w-[220px] text-right font-bold text-slate-500">
                  {t('permissionRequestsPage.table.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((request) => {
                const decidedMeta = [
                  request.decidedByEmail
                    ? t('permissionRequestsPage.decidedBy', {
                      email: request.decidedByEmail,
                      defaultValue: `By ${request.decidedByEmail}`,
                    })
                    : '',
                  request.decidedAt ? formatDate(request.decidedAt, locale) : '',
                ]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <TableRow
                    key={request.id}
                    className={isDarkMode ? 'border-slate-800' : 'border-slate-100'}
                  >
                    <TableCell>
                      <div className="text-sm font-semibold">{request.requesterEmail}</div>
                      <div className="text-xs text-slate-400">@{request.requesterUsername}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{request.permissionCode}</TableCell>
                    <TableCell className="max-w-[380px]">
                      <p className="line-clamp-3 text-sm">{request.reason}</p>
                      {request.decisionNote ? (
                        <p
                          className={`mt-1 text-xs italic ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {t('permissionRequestsPage.table.note', 'Note')}: {request.decisionNote}
                        </p>
                      ) : null}
                      {request.status === 'APPROVED' ? (
                        <p className="mt-1 text-xs text-emerald-600">
                          {t('permissionRequestsPage.table.expiresAt', 'Expires at')}: {' '}
                          {request.grantedExpiresAt
                            ? formatDate(request.grantedExpiresAt, locale)
                            : t('permissionDurationPresets.permanent', 'Permanent')}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatPermissionDuration(request.requestedDurationDays, t)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg border-none px-2.5 py-0.5 ${statusClass(request.status)}`}>
                        {getPermissionRequestStatusLabel(t, request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(request.createdAt, locale)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => setApproving(request)}
                            className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            {t('permissionRequestsPage.approve', 'Approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejecting(request)}
                            className="h-8 rounded-lg border-rose-300 text-rose-600 hover:bg-rose-50"
                          >
                            <CircleSlash className="mr-1 h-3.5 w-3.5" />
                            {t('permissionRequestsPage.reject', 'Reject')}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{decidedMeta}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {rows.length > 0 ? (
          <AdminPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalElements={pagination.totalElements}
            pageSize={pagination.size}
            onPageChange={(page) => fetchData(page, pagination.size)}
            onPageSizeChange={(size) => fetchData(0, size)}
            isDarkMode={isDarkMode}
          />
        ) : null}
      </SuperAdminPanel>

      <ApproveDialog
        request={approving}
        onClose={() => setApproving(null)}
        onDone={() => {
          setApproving(null);
          fetchData(pagination.page, pagination.size);
        }}
        isDarkMode={isDarkMode}
        showError={showError}
        showSuccess={showSuccess}
        friendly={friendly}
      />

      <RejectDialog
        request={rejecting}
        onClose={() => setRejecting(null)}
        onDone={() => {
          setRejecting(null);
          fetchData(pagination.page, pagination.size);
        }}
        isDarkMode={isDarkMode}
        showError={showError}
        showSuccess={showSuccess}
        friendly={friendly}
      />
    </SuperAdminPage>
  );
}

function ApproveDialog({ request, onClose, onDone, isDarkMode, showError, showSuccess, friendly }) {
  const { t, i18n } = useTranslation();
  const [durationDays, setDurationDays] = useState(null);
  const [customDateTime, setCustomDateTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const locale = getLocaleTag(i18n.language);
  const durationPresets = useMemo(() => buildDurationPresets(t), [t]);

  useEffect(() => {
    if (request) {
      setDurationDays(request.requestedDurationDays ?? null);
      setCustomDateTime('');
      setNote('');
    }
  }, [request]);

  const useCustomDate = customDateTime.trim().length > 0;
  const expiresAtPreview = useMemo(() => {
    if (useCustomDate) return formatDate(customDateTime, locale);
    if (durationDays) {
      const date = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
    }
    return t('permissionDurationPresets.permanent', 'Permanent');
  }, [customDateTime, durationDays, locale, t, useCustomDate]);

  const submit = async () => {
    if (!request) return;

    setSubmitting(true);
    try {
      const payload = useCustomDate
        ? { expiresAt: customDateTime, note: note.trim() || undefined }
        : { durationDays: durationDays ?? undefined, note: note.trim() || undefined };
      await approvePermissionRequest(request.id, payload);
      showSuccess(t('permissionRequestsPage.approveSuccess', 'Request approved.'));
      onDone();
    } catch (err) {
      showError(friendly(err, t('permissionRequestsPage.approveError', 'Unable to approve the request.')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!submitting && !open) onClose();
      }}
    >
      <DialogContent
        className={`sm:max-w-[560px] ${
          isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : ''
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
            {t('permissionRequestsPage.approveDialogTitle', 'Approve request')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t(
              'permissionRequestsPage.approveDialogDescription',
              'Grant the permission to this admin. You can set an expiration and the system will revoke it automatically once it expires.',
            )}
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-3 text-sm ${
                isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div>
                <span className="font-semibold">{t('permissionRequestsPage.adminLabel', 'Admin')}:</span>{' '}
                {request.requesterEmail}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-xs">{request.permissionCode}</span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{request.reason}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('permissionRequestsPage.grantDurationLabel', 'Granted duration')}
              </label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={String(preset.value)}
                    type="button"
                    onClick={() => {
                      setDurationDays(preset.value);
                      setCustomDateTime('');
                    }}
                    disabled={submitting}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                      !useCustomDate && durationDays === preset.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : isDarkMode
                          ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {preset.value === null ? <InfinityIcon className="mr-1 inline h-3.5 w-3.5" /> : null}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('permissionRequestsPage.customExpiryLabel', 'Or set a custom expiration date')}
              </label>
              <Input
                type="datetime-local"
                value={customDateTime}
                onChange={(event) => setCustomDateTime(event.target.value)}
                disabled={submitting}
                className="h-10 rounded-xl"
              />
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t(
                  'permissionRequestsPage.customExpiryHint',
                  'If you enter a date, it will override the preset. Leave it empty to use the selected preset.',
                )}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <span className="font-semibold">
                {t('permissionRequestsPage.expiresAtPreviewLabel', 'Expires at')}:
              </span>{' '}
              {expiresAtPreview}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('permissionRequestsPage.noteLabel', 'Note (optional)')}
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={submitting}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                }`}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl"
          >
            {t('permissionRequestsPage.close', 'Close')}
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting
              ? t('permissionRequestsPage.approving', 'Approving...')
              : t('permissionRequestsPage.approveSubmit', 'Approve and grant permission')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ request, onClose, onDone, isDarkMode, showError, showSuccess, friendly }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (request) setNote('');
  }, [request]);

  const canSubmit = note.trim().length >= 5;

  const submit = async () => {
    if (!request || !canSubmit) return;

    setSubmitting(true);
    try {
      await rejectPermissionRequest(request.id, { note: note.trim() });
      showSuccess(t('permissionRequestsPage.rejectSuccess', 'Request rejected.'));
      onDone();
    } catch (err) {
      showError(friendly(err, t('permissionRequestsPage.rejectError', 'Unable to reject the request.')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!submitting && !open) onClose();
      }}
    >
      <DialogContent
        className={`sm:max-w-[500px] ${
          isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : ''
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <CircleSlash className="h-5 w-5" />
            {t('permissionRequestsPage.rejectDialogTitle', 'Reject request')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t(
              'permissionRequestsPage.rejectDialogDescription',
              'Provide a reason so the admin understands what to adjust. The reason will be saved to the audit log.',
            )}
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-3 text-sm ${
                isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div>
                <span className="font-semibold">{t('permissionRequestsPage.adminLabel', 'Admin')}:</span>{' '}
                {request.requesterEmail}
              </div>
              <div className="mt-1 font-mono text-xs">{request.permissionCode}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('permissionRequestsPage.rejectReasonLabel', 'Rejection reason (5-1000 characters)')}
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={submitting}
                placeholder={t(
                  'permissionRequestsPage.rejectReasonPlaceholder',
                  'Example: this permission does not match the current scope of work.',
                )}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                }`}
              />
              <div className="text-right text-xs text-slate-400">{note.trim().length}/1000</div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl"
          >
            {t('permissionRequestsPage.close', 'Close')}
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
          >
            {submitting
              ? t('permissionRequestsPage.rejecting', 'Submitting...')
              : t('permissionRequestsPage.rejectSubmit', 'Confirm rejection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
