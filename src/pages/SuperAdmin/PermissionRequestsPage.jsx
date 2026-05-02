import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck, CircleSlash, Infinity as InfinityIcon, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import AdminPagination from '@/pages/Admin/components/AdminPagination';
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

const STATUS_TABS = [
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'APPROVED', label: 'Đã duyệt' },
  { id: 'REJECTED', label: 'Từ chối' },
  { id: 'CANCELLED', label: 'Đã huỷ' },
  { id: 'ALL', label: 'Tất cả' },
];

const DURATION_PRESETS = [
  { value: null, label: 'Vĩnh viễn' },
  { value: 1, label: '1 ngày' },
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
];

function statusClass(status) {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'APPROVED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'REJECTED': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'CANCELLED': return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

const PERMISSION_REQUESTS_QUERY_KEY = ['superAdmin', 'permissionRequests'];

export default function PermissionRequestsPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const friendly = (err, fallback) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== 'error.unknown' ? mapped : fallback;
  };

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: [...PERMISSION_REQUESTS_QUERY_KEY, tab, page, size],
    queryFn: async () => {
      const res = await listPermissionRequests({
        status: tab === 'ALL' ? undefined : tab,
        page,
        size,
      });
      const responseData = res?.data || {};
      return {
        rows: responseData.content || [],
        page: responseData.page ?? 0,
        size: responseData.size ?? size,
        totalPages: responseData.totalPages ?? 0,
        totalElements: responseData.totalElements ?? 0,
      };
    },
    placeholderData: (previous) => previous,
  });

  const rows = data?.rows ?? [];
  const pagination = {
    page: data?.page ?? page,
    size: data?.size ?? size,
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
  };

  useEffect(() => {
    if (queryError) {
      showError(friendly(queryError, 'Không thể tải danh sách yêu cầu'));
    }
  }, [queryError]);

  const invalidateRequests = () =>
    queryClient.invalidateQueries({ queryKey: PERMISSION_REQUESTS_QUERY_KEY });

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow="Access Control"
        title="Yêu cầu cấp quyền"
        description="Duyệt hoặc từ chối yêu cầu xin quyền từ admin. Có thể cấp kèm thời hạn, hệ thống sẽ tự động thu hồi khi hết hạn."
        actions={(
          <Button
            variant="outline"
            onClick={invalidateRequests}
            disabled={isFetching}
            className="h-10 rounded-2xl"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        )}
      />

      <SuperAdminTabs tabs={STATUS_TABS} active={tab} onChange={setTab} />

      <SuperAdminPanel contentClassName="p-0">
        {loading ? (
          <div className="p-6"><ListSpinner variant="table" /></div>
        ) : rows.length === 0 ? (
          <div className="p-6"><SuperAdminEmptyState title="Không có yêu cầu nào" /></div>
        ) : (
          <Table className="table-auto min-w-full text-left">
            <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
              <TableRow>
                <TableHead className="font-bold text-slate-500 w-[220px]">Người yêu cầu</TableHead>
                <TableHead className="font-bold text-slate-500 w-[160px]">Quyền</TableHead>
                <TableHead className="font-bold text-slate-500">Lý do</TableHead>
                <TableHead className="font-bold text-slate-500 w-[110px]">Thời hạn xin</TableHead>
                <TableHead className="font-bold text-slate-500 w-[110px]">Trạng thái</TableHead>
                <TableHead className="font-bold text-slate-500 w-[160px]">Tạo lúc</TableHead>
                <TableHead className="font-bold text-slate-500 w-[220px] text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={isDarkMode ? 'border-slate-800' : 'border-slate-100'}>
                  <TableCell>
                    <div className="font-semibold text-sm">{r.requesterEmail}</div>
                    <div className="text-xs text-slate-400">@{r.requesterUsername}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.permissionCode}</TableCell>
                  <TableCell className="max-w-[380px]">
                    <p className="line-clamp-3 text-sm">{r.reason}</p>
                    {r.decisionNote && (
                      <p className={`mt-1 text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Ghi chú: {r.decisionNote}
                      </p>
                    )}
                    {r.status === 'APPROVED' && (
                      <p className="mt-1 text-xs text-emerald-600">
                        Hết hạn: {r.grantedExpiresAt ? formatDate(r.grantedExpiresAt) : 'Vĩnh viễn'}
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
                  <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => setApproving(r)}
                          className="rounded-lg h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejecting(r)}
                          className="rounded-lg h-8 border-rose-300 text-rose-600 hover:bg-rose-50"
                        >
                          <CircleSlash className="mr-1 h-3.5 w-3.5" /> Từ chối
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {r.decidedByEmail ? `Bởi ${r.decidedByEmail}` : ''} {r.decidedAt ? `• ${formatDate(r.decidedAt)}` : ''}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {rows.length > 0 && (
          <AdminPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalElements={pagination.totalElements}
            pageSize={pagination.size}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setSize(s); setPage(0); }}
            isDarkMode={isDarkMode}
          />
        )}
      </SuperAdminPanel>

      <ApproveDialog
        request={approving}
        onClose={() => setApproving(null)}
        onDone={() => { setApproving(null); invalidateRequests(); }}
        isDarkMode={isDarkMode}
        showError={showError}
        showSuccess={showSuccess}
        friendly={friendly}
      />

      <RejectDialog
        request={rejecting}
        onClose={() => setRejecting(null)}
        onDone={() => { setRejecting(null); invalidateRequests(); }}
        isDarkMode={isDarkMode}
        showError={showError}
        showSuccess={showSuccess}
        friendly={friendly}
      />
    </SuperAdminPage>
  );
}

function ApproveDialog({ request, onClose, onDone, isDarkMode, showError, showSuccess, friendly }) {
  const [durationDays, setDurationDays] = useState(null);
  const [customDateTime, setCustomDateTime] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (request) {
      setDurationDays(request.requestedDurationDays ?? null);
      setCustomDateTime('');
      setNote('');
    }
  }, [request]);

  const useCustomDate = customDateTime.trim().length > 0;
  const expiresAtPreview = useMemo(() => {
    if (useCustomDate) return customDateTime;
    if (durationDays) {
      // eslint-disable-next-line react-hooks/purity -- preview only, intentional non-pure
      const d = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      return d.toLocaleString('vi-VN');
    }
    return 'Vĩnh viễn';
  }, [useCustomDate, customDateTime, durationDays]);

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }) => approvePermissionRequest(id, payload),
    onSuccess: () => {
      showSuccess('Đã duyệt yêu cầu');
      onDone();
    },
    onError: (err) => {
      showError(friendly(err, 'Không thể duyệt yêu cầu'));
    },
  });
  const submitting = approveMutation.isPending;

  const submit = () => {
    if (!request) return;
    const payload = useCustomDate
      ? { expiresAt: customDateTime, note: note.trim() || undefined }
      : { durationDays: durationDays ?? undefined, note: note.trim() || undefined };
    approveMutation.mutate({ id: request.id, payload });
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => { if (!submitting && !o) onClose(); }}>
      <DialogContent className={`sm:max-w-[560px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="h-5 w-5" /> Duyệt yêu cầu
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Cấp quyền cho admin. Có thể set thời hạn — khi hết hạn hệ thống sẽ tự động thu hồi.
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
              <div><span className="font-semibold">Admin:</span> {request.requesterEmail}</div>
              <div className="flex items-center gap-2 mt-1">
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-xs">{request.permissionCode}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 whitespace-pre-wrap">{request.reason}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Thời hạn cấp</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={String(p.value)}
                    type="button"
                    onClick={() => { setDurationDays(p.value); setCustomDateTime(''); }}
                    disabled={submitting}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                      !useCustomDate && durationDays === p.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : isDarkMode
                          ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.value === null && <InfinityIcon className="inline h-3.5 w-3.5 mr-1" />}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Hoặc chọn thời điểm hết hạn tuỳ ý</label>
              <Input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                disabled={submitting}
                className="h-10 rounded-xl"
              />
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Nếu nhập, preset sẽ bị bỏ qua. Để trống để dùng preset.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <span className="font-semibold">Sẽ hết hạn lúc:</span> {expiresAtPreview}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Ghi chú (tuỳ chọn)</label>
              <textarea
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl">Đóng</Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? 'Đang duyệt…' : 'Duyệt & Cấp quyền'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ request, onClose, onDone, isDarkMode, showError, showSuccess, friendly }) {
  const [note, setNote] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset textarea when dialog reopens
    if (request) setNote('');
  }, [request]);

  const canSubmit = note.trim().length >= 5;

  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }) => rejectPermissionRequest(id, payload),
    onSuccess: () => {
      showSuccess('Đã từ chối yêu cầu');
      onDone();
    },
    onError: (err) => {
      showError(friendly(err, 'Không thể từ chối yêu cầu'));
    },
  });
  const submitting = rejectMutation.isPending;

  const submit = () => {
    if (!request || !canSubmit) return;
    rejectMutation.mutate({ id: request.id, payload: { note: note.trim() } });
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => { if (!submitting && !o) onClose(); }}>
      <DialogContent className={`sm:max-w-[500px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <CircleSlash className="h-5 w-5" /> Từ chối yêu cầu
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Ghi lý do để admin biết và điều chỉnh. Lý do sẽ được lưu vào audit log.
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
              <div><span className="font-semibold">Admin:</span> {request.requesterEmail}</div>
              <div className="font-mono text-xs mt-1">{request.permissionCode}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Lý do từ chối (5–1000 ký tự)</label>
              <textarea
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
                placeholder="Ví dụ: quyền này không phù hợp với scope công việc hiện tại…"
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
              />
              <div className="text-xs text-slate-400 text-right">{note.trim().length}/1000</div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl">Đóng</Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
          >
            {submitting ? 'Đang gửi…' : 'Xác nhận từ chối'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
