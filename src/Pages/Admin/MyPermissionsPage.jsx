import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyRound,
  RefreshCw,
  Plus,
  X,
  ShieldCheck,
  Hourglass,
  CircleSlash,
  CheckCircle2,
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
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminEmptyState,
} from '@/Pages/SuperAdmin/Components/SuperAdminSurface';
import {
  getMyPermissions,
  getAdminAllowedPermissions,
  createPermissionRequest,
  getMyPermissionRequests,
  cancelPermissionRequest,
} from '@/api/ManagementSystemAPI';

function isForbiddenError(error) {
  return Number(error?.statusCode) === 403;
}

function toArrayData(response) {
  const data = response?.data ?? response ?? [];
  if (Array.isArray(data)) return data;
  if (data && typeof data[Symbol.iterator] === 'function') {
    return Array.from(data);
  }
  return [];
}

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
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
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

export default function MyPermissionsPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();

  const [myPerms, setMyPerms] = useState([]);
  const [allowedCodes, setAllowedCodes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resourceAccess, setResourceAccess] = useState({
    myPermissions: 'idle',
    requestablePermissions: 'idle',
    myRequests: 'idle',
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ permissionCode: '', reason: '', durationDays: null });
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = getLocaleTag(i18n.language);
  const durationPresets = useMemo(() => buildDurationPresets(t), [t]);

  const friendly = (err, fallback) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== 'error.unknown' ? mapped : fallback;
  };

  const myPermSet = useMemo(() => new Set(myPerms), [myPerms]);
  const selectableCodes = useMemo(
    () => allowedCodes.filter((code) => !myPermSet.has(code)),
    [allowedCodes, myPermSet],
  );

  const pendingForCode = useMemo(() => {
    const next = new Set();
    for (const request of requests) {
      if (request.status === 'PENDING') next.add(request.permissionCode);
    }
    return next;
  }, [requests]);

  const normalizedPermissionCode = form.permissionCode.trim();

  const fetchAll = async () => {
    setLoading(true);
    setDialogError('');

    try {
      const [permsRes, allowedRes, mineRes] = await Promise.allSettled([
        getMyPermissions(),
        getAdminAllowedPermissions(),
        getMyPermissionRequests(),
      ]);

      const nextAccess = {
        myPermissions: 'ready',
        requestablePermissions: 'ready',
        myRequests: 'ready',
      };
      let firstUnexpectedError = null;

      if (permsRes.status === 'fulfilled') {
        setMyPerms(toArrayData(permsRes.value));
      } else {
        setMyPerms([]);
        if (isForbiddenError(permsRes.reason)) {
          nextAccess.myPermissions = 'forbidden';
        } else {
          nextAccess.myPermissions = 'error';
          firstUnexpectedError ||= permsRes.reason;
        }
      }

      if (allowedRes.status === 'fulfilled') {
        setAllowedCodes(toArrayData(allowedRes.value));
      } else {
        setAllowedCodes([]);
        if (isForbiddenError(allowedRes.reason)) {
          nextAccess.requestablePermissions = 'forbidden';
        } else {
          nextAccess.requestablePermissions = 'error';
          firstUnexpectedError ||= allowedRes.reason;
        }
      }

      if (mineRes.status === 'fulfilled') {
        setRequests(toArrayData(mineRes.value));
      } else {
        setRequests([]);
        if (isForbiddenError(mineRes.reason)) {
          nextAccess.myRequests = 'forbidden';
        } else {
          nextAccess.myRequests = 'error';
          firstUnexpectedError ||= mineRes.reason;
        }
      }

      setResourceAccess(nextAccess);

      if (firstUnexpectedError) {
        showError(
          friendly(
            firstUnexpectedError,
            t('myPermissionsPage.loadPartialError', 'Unable to load all data'),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreateDialog = () => {
    setForm({ permissionCode: selectableCodes[0] || '', reason: '', durationDays: null });
    setDialogError('');
    setDialogOpen(true);
  };

  const canSubmit =
    !!normalizedPermissionCode &&
    form.reason.trim().length >= 10 &&
    form.reason.trim().length <= 1000 &&
    !pendingForCode.has(normalizedPermissionCode);

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setDialogError('');

    try {
      await createPermissionRequest({
        permissionCode: normalizedPermissionCode,
        reason: form.reason.trim(),
        requestedDurationDays: form.durationDays,
      });
      showSuccess(
        t(
          'myPermissionsPage.submitSuccess',
          'Permission request submitted. Waiting for Super Admin approval.',
        ),
      );
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      if (isForbiddenError(err)) {
        setDialogError(
          t(
            'myPermissionsPage.requestForbidden',
            'You cannot submit a new permission request right now. Please try again later or contact Super Admin.',
          ),
        );
      } else {
        showError(friendly(err, t('myPermissionsPage.submitError', 'Unable to create the request.')));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id) => {
    try {
      await cancelPermissionRequest(id);
      showSuccess(t('myPermissionsPage.cancelSuccess', 'Permission request cancelled.'));
      fetchAll();
    } catch (err) {
      if (isForbiddenError(err)) {
        showError(
          t(
            'myPermissionsPage.cancelForbidden',
            'You cannot cancel this request right now. Please try again later.',
          ),
        );
      } else {
        showError(friendly(err, t('myPermissionsPage.cancelError', 'Unable to cancel the request.')));
      }
    }
  };

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow={t('myPermissionsPage.eyebrow', 'Access')}
        title={t('myPermissionsPage.title', 'My permissions')}
        description={t(
          'myPermissionsPage.description',
          'Review your current permissions and request additional access from Super Admin.',
        )}
        actions={(
          <>
            <Button
              variant="outline"
              onClick={fetchAll}
              disabled={loading}
              className="h-10 rounded-2xl"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('myPermissionsPage.refresh', 'Refresh')}
            </Button>
            <Button
              onClick={openCreateDialog}
              className="h-10 rounded-2xl bg-[#0455BF] text-white hover:bg-[#03449a]"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('myPermissionsPage.newRequest', 'Request access')}
            </Button>
          </>
        )}
      />

      <SuperAdminPanel
        title={t('myPermissionsPage.currentPermissionsTitle', 'Current permissions')}
        description={t(
          'myPermissionsPage.currentPermissionsDescription',
          'Permissions already granted. Time-limited access will be revoked automatically when it expires.',
        )}
      >
        {loading ? (
          <ListSpinner variant="table" />
        ) : resourceAccess.myPermissions === 'forbidden' ? (
          <SuperAdminEmptyState
            title={t(
              'myPermissionsPage.currentPermissionsUnavailableTitle',
              'Unable to load permission list',
            )}
            description={t(
              'myPermissionsPage.currentPermissionsUnavailableDescription',
              'Your current permissions are not available right now. Please try again later.',
            )}
          />
        ) : myPerms.length === 0 ? (
          <SuperAdminEmptyState
            title={t(
              'myPermissionsPage.currentPermissionsEmptyTitle',
              'You do not have any permissions yet',
            )}
            description={t(
              'myPermissionsPage.currentPermissionsEmptyDescription',
              'Send a request to Super Admin to receive the permissions you need.',
            )}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {myPerms.map((code) => (
              <span
                key={code}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  isDarkMode
                    ? 'border-ocean-500/40 bg-ocean-500/10 text-ocean-200'
                    : 'border-ocean-200 bg-ocean-50 text-ocean-700'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {code}
              </span>
            ))}
          </div>
        )}
      </SuperAdminPanel>

      <SuperAdminPanel
        title={t('myPermissionsPage.requestsTitle', 'Permission requests')}
        description={t(
          'myPermissionsPage.requestsDescription',
          'Track your requests and their current review status.',
        )}
        contentClassName="p-0"
      >
        {loading ? (
          <div className="p-6">
            <ListSpinner variant="table" />
          </div>
        ) : resourceAccess.myRequests === 'forbidden' ? (
          <div className="p-6">
            <SuperAdminEmptyState
              title={t('myPermissionsPage.requestsUnavailableTitle', 'Unable to load your requests')}
              description={t(
                'myPermissionsPage.requestsUnavailableDescription',
                'Your request history is not available right now. Please try again later.',
              )}
            />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6">
            <SuperAdminEmptyState
              title={t('myPermissionsPage.requestsEmptyTitle', 'No permission requests yet')}
            />
          </div>
        ) : (
          <Table className="table-auto min-w-full text-left">
            <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
              <TableRow>
                <TableHead className="font-bold text-slate-500">
                  {t('myPermissionsPage.table.permission', 'Permission')}
                </TableHead>
                <TableHead className="font-bold text-slate-500">
                  {t('myPermissionsPage.table.reason', 'Reason')}
                </TableHead>
                <TableHead className="w-[130px] font-bold text-slate-500">
                  {t('myPermissionsPage.table.requestedDuration', 'Requested duration')}
                </TableHead>
                <TableHead className="w-[110px] font-bold text-slate-500">
                  {t('myPermissionsPage.table.status', 'Status')}
                </TableHead>
                <TableHead className="w-[170px] font-bold text-slate-500">
                  {t('myPermissionsPage.table.expiresAt', 'Expires at')}
                </TableHead>
                <TableHead className="w-[160px] font-bold text-slate-500">
                  {t('myPermissionsPage.table.createdAt', 'Created at')}
                </TableHead>
                <TableHead className="w-[110px] text-right font-bold text-slate-500">
                  {t('myPermissionsPage.table.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow
                  key={request.id}
                  className={isDarkMode ? 'border-slate-800' : 'border-slate-100'}
                >
                  <TableCell className="font-mono text-sm">{request.permissionCode}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="line-clamp-2 text-sm">{request.reason}</p>
                    {request.decisionNote ? (
                      <p
                        className={`mt-1 text-xs italic ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {t('myPermissionsPage.table.note', 'Note')}: {request.decisionNote}
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
                  <TableCell className="text-sm">
                    {request.status === 'APPROVED'
                      ? (request.grantedExpiresAt
                        ? formatDate(request.grantedExpiresAt, locale)
                        : t('permissionDurationPresets.permanent', 'Permanent'))
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(request.createdAt, locale)}</TableCell>
                  <TableCell className="text-right">
                    {request.status === 'PENDING' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancel(request.id)}
                        className="h-8 rounded-lg"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        {t('myPermissionsPage.cancelRequest', 'Cancel')}
                      </Button>
                    ) : (
                      <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {request.status === 'APPROVED' ? (
                          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
                        ) : null}
                        {request.status === 'REJECTED' ? (
                          <CircleSlash className="mr-1 inline h-3.5 w-3.5 text-rose-500" />
                        ) : null}
                        {request.status === 'CANCELLED' ? (
                          <Hourglass className="mr-1 inline h-3.5 w-3.5" />
                        ) : null}
                        {formatDate(request.decidedAt, locale)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SuperAdminPanel>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!submitting) setDialogOpen(open);
        }}
      >
        <DialogContent
          className={`sm:max-w-[560px] ${
            isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : ''
          }`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-ocean-500" />
              {t('myPermissionsPage.dialogTitle', 'Request new permission')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t(
                'myPermissionsPage.dialogDescription',
                'Super Admin will review the request and may grant it with an expiration date.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogError ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {dialogError}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('myPermissionsPage.permissionLabel', 'Permission code')}
              </label>
              <Input
                list={selectableCodes.length > 0 ? 'permission-code-options' : undefined}
                value={form.permissionCode}
                onChange={(event) => setForm({ ...form, permissionCode: event.target.value })}
                disabled={submitting}
                placeholder={t('myPermissionsPage.permissionPlaceholder', 'Example: user:read')}
                className={`h-10 rounded-xl ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500'
                    : ''
                }`}
              />

              {selectableCodes.length > 0 ? (
                <datalist id="permission-code-options">
                  {selectableCodes.map((code) => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
              ) : null}

              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectableCodes.length > 0
                  ? t(
                    'myPermissionsPage.permissionHintWithSuggestions',
                    'You can type a code or pick one from the suggestions.',
                  )
                  : t(
                    'myPermissionsPage.permissionHintManual',
                    'You can type a permission code manually if there are no suggestions.',
                  )}
              </p>

              {selectableCodes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectableCodes.slice(0, 8).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, permissionCode: code }))}
                      disabled={submitting}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        form.permissionCode === code
                          ? 'border-ocean-500 bg-ocean-500/10 text-ocean-700 dark:text-ocean-300'
                          : isDarkMode
                            ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('myPermissionsPage.reasonLabel', 'Reason (10-1000 characters)')}
              </label>
              <textarea
                rows={4}
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                disabled={submitting}
                maxLength={1000}
                placeholder={t(
                  'myPermissionsPage.reasonPlaceholder',
                  'Explain why you need this permission',
                )}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-100'
                    : 'border-slate-200 bg-white'
                }`}
              />
              <div className="text-right text-xs text-slate-400">{form.reason.trim().length}/1000</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                {t('myPermissionsPage.durationLabel', 'Requested duration')}
              </label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={String(preset.value)}
                    type="button"
                    onClick={() => setForm({ ...form, durationDays: preset.value })}
                    disabled={submitting}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                      form.durationDays === preset.value
                        ? 'border-ocean-500 bg-ocean-500/10 text-ocean-700 dark:text-ocean-300'
                        : isDarkMode
                          ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={
                      form.durationDays &&
                      !durationPresets.some((preset) => preset.value === form.durationDays)
                        ? form.durationDays
                        : ''
                    }
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setForm({
                        ...form,
                        durationDays: Number.isFinite(value) && value > 0 ? value : null,
                      });
                    }}
                    placeholder={t('myPermissionsPage.customDurationPlaceholder', 'Days')}
                    className="h-9 w-28 rounded-xl"
                    disabled={submitting}
                  />
                  <span className="text-xs text-slate-400">
                    {t('myPermissionsPage.customDurationOptional', 'days (optional)')}
                  </span>
                </div>
              </div>
            </div>

            {pendingForCode.has(normalizedPermissionCode) ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {t(
                  'myPermissionsPage.pendingForPermission',
                  'You already have a pending request for this permission.',
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              className="rounded-xl"
            >
              {t('myPermissionsPage.close', 'Close')}
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="rounded-xl bg-[#0455BF] text-white hover:bg-[#03449a]"
            >
              {submitting
                ? t('myPermissionsPage.submitting', 'Submitting...')
                : t('myPermissionsPage.submit', 'Submit request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
