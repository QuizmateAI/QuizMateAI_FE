import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, RefreshCw, Plus, X, ShieldCheck, Hourglass, CircleSlash, CheckCircle2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
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

const DURATION_PRESETS = [
  { value: null, label: 'Vĩnh viễn' },
  { value: 1, label: '1 ngày' },
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
];

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
    case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'APPROVED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'REJECTED': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'CANCELLED': return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
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

  const friendly = (err, fallback) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== 'error.unknown' ? mapped : fallback;
  };

  const myPermSet = useMemo(() => new Set(myPerms), [myPerms]);
  const selectableCodes = useMemo(
    () => allowedCodes.filter((c) => !myPermSet.has(c)),
    [allowedCodes, myPermSet],
  );

  const pendingForCode = useMemo(() => {
    const set = new Set();
    for (const r of requests) if (r.status === 'PENDING') set.add(r.permissionCode);
    return set;
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
        showError(friendly(firstUnexpectedError, 'Không thể tải đầy đủ dữ liệu'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

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
      showSuccess('Đã gửi yêu cầu, chờ super-admin duyệt');
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      if (isForbiddenError(err)) {
        setDialogError('Hiện tại bạn chưa thể gửi yêu cầu quyền mới. Vui lòng thử lại sau hoặc liên hệ Super Admin.');
      } else {
        showError(friendly(err, 'Không thể tạo yêu cầu'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id) => {
    try {
      await cancelPermissionRequest(id);
      showSuccess('Đã huỷ yêu cầu');
      fetchAll();
    } catch (err) {
      if (isForbiddenError(err)) {
        showError('Hiện tại bạn chưa thể huỷ yêu cầu này. Vui lòng thử lại sau.');
      } else {
        showError(friendly(err, 'Không thể huỷ yêu cầu'));
      }
    }
  };

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow="Access"
        title="Quyền của tôi"
        description="Xem quyền bạn đang có và gửi yêu cầu xin thêm quyền tới Super Admin."
        actions={(
          <>
            <Button
              variant="outline"
              onClick={fetchAll}
              disabled={loading}
              className="h-10 rounded-2xl"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              onClick={openCreateDialog}
              className="h-10 rounded-2xl bg-[#0455BF] text-white hover:bg-[#03449a]"
            >
              <Plus className="mr-2 h-4 w-4" /> Yêu cầu quyền mới
            </Button>
          </>
        )}
      />

      <SuperAdminPanel
        title="Quyền hiện có"
        description="Các quyền đã được cấp. Quyền có thời hạn sẽ tự động bị thu hồi khi hết hạn."
      >
        {loading ? (
          <ListSpinner variant="table" />
        ) : resourceAccess.myPermissions === 'forbidden' ? (
          <SuperAdminEmptyState
            title="Chưa thể tải danh sách quyền"
            description="Thông tin quyền hiện có chưa sẵn sàng lúc này. Vui lòng thử lại sau."
          />
        ) : myPerms.length === 0 ? (
          <SuperAdminEmptyState
            title="Bạn chưa có quyền nào"
            description="Hãy gửi yêu cầu tới Super Admin để được cấp quyền write cần thiết."
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
        title="Yêu cầu cấp quyền"
        description="Các yêu cầu của bạn và trạng thái xử lý."
        contentClassName="p-0"
      >
        {loading ? (
          <div className="p-6"><ListSpinner variant="table" /></div>
        ) : resourceAccess.myRequests === 'forbidden' ? (
          <div className="p-6">
            <SuperAdminEmptyState
              title="Chưa thể tải yêu cầu cấp quyền"
              description="Danh sách yêu cầu của bạn chưa sẵn sàng lúc này. Vui lòng thử lại sau."
            />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6">
            <SuperAdminEmptyState title="Chưa có yêu cầu nào" />
          </div>
        ) : (
          <Table className="table-auto min-w-full text-left">
            <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
              <TableRow>
                <TableHead className="font-bold text-slate-500">Quyền</TableHead>
                <TableHead className="font-bold text-slate-500">Lý do</TableHead>
                <TableHead className="font-bold text-slate-500 w-[130px]">Thời hạn xin</TableHead>
                <TableHead className="font-bold text-slate-500 w-[110px]">Trạng thái</TableHead>
                <TableHead className="font-bold text-slate-500 w-[170px]">Hết hạn</TableHead>
                <TableHead className="font-bold text-slate-500 w-[160px]">Tạo lúc</TableHead>
                <TableHead className="font-bold text-slate-500 w-[110px] text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} className={isDarkMode ? 'border-slate-800' : 'border-slate-100'}>
                  <TableCell className="font-mono text-sm">{r.permissionCode}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="line-clamp-2 text-sm">{r.reason}</p>
                    {r.decisionNote && (
                      <p className={`mt-1 text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Ghi chú: {r.decisionNote}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.requestedDurationDays ? `${r.requestedDurationDays} ngày` : 'Vĩnh viễn'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`rounded-lg px-2.5 py-0.5 border-none ${statusClass(r.status)}`}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.status === 'APPROVED' ? (r.grantedExpiresAt ? formatDate(r.grantedExpiresAt) : 'Vĩnh viễn') : '-'}</TableCell>
                  <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === 'PENDING' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancel(r.id)}
                        className="rounded-lg h-8"
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Huỷ
                      </Button>
                    ) : (
                      <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {r.status === 'APPROVED' && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-emerald-500" />}
                        {r.status === 'REJECTED' && <CircleSlash className="inline h-3.5 w-3.5 mr-1 text-rose-500" />}
                        {r.status === 'CANCELLED' && <Hourglass className="inline h-3.5 w-3.5 mr-1" />}
                        {formatDate(r.decidedAt)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SuperAdminPanel>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!submitting) setDialogOpen(o); }}>
        <DialogContent className={`sm:max-w-[560px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-ocean-500" />
              Yêu cầu quyền mới
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Super Admin sẽ duyệt và có thể cấp kèm thời hạn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogError ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {dialogError}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Quyền muốn xin</label>
              <Input
                list={selectableCodes.length > 0 ? 'permission-code-options' : undefined}
                value={form.permissionCode}
                onChange={(e) => setForm({ ...form, permissionCode: e.target.value })}
                disabled={submitting}
                placeholder="Ví dụ: user:read"
                className={`h-10 rounded-xl ${
                  isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500' : ''
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
                  ? 'Bạn có thể nhập hoặc chọn nhanh từ danh sách gợi ý.'
                  : 'Bạn có thể nhập mã quyền thủ công nếu chưa có danh sách gợi ý.'}
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
              <label className="text-sm font-semibold">Lý do (10–1000 ký tự)</label>
              <textarea
                rows={4}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                disabled={submitting}
                maxLength={1000}
                placeholder="Giải thích vì sao bạn cần quyền này"
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                }`}
              />
              <div className="text-xs text-slate-400 text-right">{form.reason.trim().length}/1000</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Thời hạn mong muốn</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={String(p.value)}
                    type="button"
                    onClick={() => setForm({ ...form, durationDays: p.value })}
                    disabled={submitting}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                      form.durationDays === p.value
                        ? 'border-ocean-500 bg-ocean-500/10 text-ocean-700 dark:text-ocean-300'
                        : isDarkMode
                          ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={form.durationDays && !DURATION_PRESETS.some((p) => p.value === form.durationDays)
                      ? form.durationDays
                      : ''}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setForm({ ...form, durationDays: Number.isFinite(n) && n > 0 ? n : null });
                    }}
                    placeholder="Số ngày"
                    className="h-9 w-28 rounded-xl"
                    disabled={submitting}
                  />
                  <span className="text-xs text-slate-400">ngày (tuỳ chọn)</span>
                </div>
              </div>
            </div>

            {pendingForCode.has(normalizedPermissionCode) && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Bạn đã có yêu cầu PENDING cho quyền này.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="rounded-xl">
              Đóng
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="rounded-xl bg-[#0455BF] text-white hover:bg-[#03449a]"
            >
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
