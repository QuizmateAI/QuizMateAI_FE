import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  createViolation,
  fetchViolations,
  updateViolationStatus,
} from '@/api/PolicyAPI';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminEmptyState,
  getSuperAdminStatusBadgeClass,
} from './Components/SuperAdminSurface';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['PENDING', 'REVIEWING', 'CONFIRMED', 'DISMISSED'];

const SEVERITY_TONE = {
  LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
};

const EMPTY_FORM = {
  offenderId: '',
  policyId: '',
  severity: 'LOW',
  summary: '',
  details: '',
  evidenceUrl: '',
  occurredAt: '',
};

const EMPTY_STATUS_FORM = {
  status: 'REVIEWING',
  severity: 'LOW',
  resolutionNote: '',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

const VIOLATIONS_QUERY_KEY = (statusFilter) => ['superAdmin', 'violations', statusFilter || 'all'];
const PAGE_SIZE = 20;

export default function ViolationsManagement() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [statusOpen, setStatusOpen] = useState(null);
  const [statusForm, setStatusForm] = useState(EMPTY_STATUS_FORM);
  const [saving, setSaving] = useState(false);

  const {
    data: page = { content: [], totalElements: 0, number: 0, size: PAGE_SIZE },
    isLoading: loading,
    error: violationsError,
  } = useQuery({
    queryKey: VIOLATIONS_QUERY_KEY(statusFilter),
    queryFn: async () => {
      const data = await fetchViolations({
        status: statusFilter || undefined,
        page: 0,
        size: PAGE_SIZE,
      });
      return {
        content: data?.content ?? [],
        totalElements: data?.totalElements ?? 0,
        number: data?.number ?? 0,
        size: data?.size ?? PAGE_SIZE,
      };
    },
  });

  useEffect(() => {
    if (violationsError) showToast(getErrorMessage(violationsError), 'error');
  }, [violationsError, showToast]);

  const reload = () => queryClient.invalidateQueries({ queryKey: VIOLATIONS_QUERY_KEY(statusFilter) });

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createViolation({
        ...createForm,
        offenderId: Number(createForm.offenderId),
        policyId: createForm.policyId ? Number(createForm.policyId) : null,
        occurredAt: createForm.occurredAt || null,
      });
      showToast(t('violationsAdmin.createSuccess'), 'success');
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openStatusDialog = (violation) => {
    setStatusForm({
      status: violation.status,
      severity: violation.severity,
      resolutionNote: violation.resolutionNote || '',
    });
    setStatusOpen(violation);
  };

  const handleStatusUpdate = async () => {
    if (!statusOpen) return;
    setSaving(true);
    try {
      await updateViolationStatus(statusOpen.violationId, statusForm);
      showToast(t('violationsAdmin.updateSuccess'), 'success');
      setStatusOpen(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminPage>
      <SuperAdminPageHeader
        eyebrow={t('sidebarSections.trustSafety', 'Trust & Safety')}
        title={t('violationsAdmin.title')}
        description={t('violationsAdmin.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => reload()} className="h-10 rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('policiesAdmin.refresh')}
            </Button>
            <Button onClick={() => { setCreateForm(EMPTY_FORM); setCreateOpen(true); }} className="h-10 rounded-2xl">
              <Plus className="w-4 h-4 mr-2" />
              {t('violationsAdmin.newViolation')}
            </Button>
          </>
        }
      />

      <SuperAdminPanel>
        <div className="mb-4 flex items-center gap-3">
          <Label className="text-sm">{t('violationsAdmin.filterStatus')}</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">{t('violationsAdmin.filterAll')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`violationsAdmin.status.${s}`, s)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <ListSpinner />
        ) : page.content.length === 0 ? (
          <SuperAdminEmptyState title={t('violationsAdmin.empty')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('violationsAdmin.colId')}</TableHead>
                <TableHead>{t('violationsAdmin.colOffender')}</TableHead>
                <TableHead>{t('violationsAdmin.colSummary')}</TableHead>
                <TableHead>{t('violationsAdmin.colSeverity')}</TableHead>
                <TableHead>{t('violationsAdmin.colStatus')}</TableHead>
                <TableHead>{t('violationsAdmin.colReportedAt')}</TableHead>
                <TableHead className="text-right">{t('violationsAdmin.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.content.map((v) => (
                <TableRow key={v.violationId}>
                  <TableCell className="font-mono text-xs">#{v.violationId}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{v.offenderName ?? `User ${v.offenderId}`}</span>
                      <span className="text-xs text-slate-500">{v.offenderEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{v.summary}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_TONE[v.severity]}`}>
                      {t(`violationsAdmin.severity.${v.severity}`, v.severity)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getSuperAdminStatusBadgeClass(v.status, isDarkMode)}`}>
                      {t(`violationsAdmin.status.${v.status}`, v.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(v.reportedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openStatusDialog(v)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {t('violationsAdmin.review')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SuperAdminPanel>

      {/* Create violation dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('violationsAdmin.createDialog')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('violationsAdmin.field.offenderId')}</Label>
              <Input
                type="number"
                value={createForm.offenderId}
                onChange={(e) => setCreateForm((f) => ({ ...f, offenderId: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('violationsAdmin.field.policyId')}</Label>
              <Input
                type="number"
                value={createForm.policyId}
                onChange={(e) => setCreateForm((f) => ({ ...f, policyId: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('violationsAdmin.field.severity')}</Label>
              <select
                value={createForm.severity}
                onChange={(e) => setCreateForm((f) => ({ ...f, severity: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{t(`violationsAdmin.severity.${s}`, s)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('violationsAdmin.field.occurredAt')}</Label>
              <Input
                type="datetime-local"
                value={createForm.occurredAt}
                onChange={(e) => setCreateForm((f) => ({ ...f, occurredAt: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t('violationsAdmin.field.summary')}</Label>
              <Input
                value={createForm.summary}
                onChange={(e) => setCreateForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t('violationsAdmin.field.details')}</Label>
              <textarea
                value={createForm.details}
                onChange={(e) => setCreateForm((f) => ({ ...f, details: e.target.value }))}
                rows={4}
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t('violationsAdmin.field.evidenceUrl')}</Label>
              <Input
                value={createForm.evidenceUrl}
                onChange={(e) => setCreateForm((f) => ({ ...f, evidenceUrl: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('policiesAdmin.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {t('policiesAdmin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review/status dialog */}
      <Dialog open={statusOpen !== null} onOpenChange={(open) => !open && setStatusOpen(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>#{statusOpen?.violationId} — {statusOpen?.summary}</DialogTitle>
            <DialogDescription>
              {statusOpen?.offenderName} ({statusOpen?.offenderEmail})
            </DialogDescription>
          </DialogHeader>
          {statusOpen?.details && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {statusOpen.details}
            </p>
          )}
          {statusOpen?.evidenceUrl && (
            <a
              href={statusOpen.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
            >
              {statusOpen.evidenceUrl}
            </a>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('violationsAdmin.field.newStatus')}</Label>
              <select
                value={statusForm.status}
                onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`violationsAdmin.status.${s}`, s)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('violationsAdmin.field.severity')}</Label>
              <select
                value={statusForm.severity}
                onChange={(e) => setStatusForm((f) => ({ ...f, severity: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{t(`violationsAdmin.severity.${s}`, s)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label>{t('violationsAdmin.field.resolutionNote')}</Label>
              <textarea
                value={statusForm.resolutionNote}
                onChange={(e) => setStatusForm((f) => ({ ...f, resolutionNote: e.target.value }))}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(null)} disabled={saving}>
              {t('policiesAdmin.cancel')}
            </Button>
            <Button onClick={handleStatusUpdate} disabled={saving}>
              {t('policiesAdmin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
