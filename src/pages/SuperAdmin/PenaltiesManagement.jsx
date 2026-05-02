import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel, Search, X } from 'lucide-react';
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
  fetchPenaltiesForUser,
  issuePenalty,
  revokePenalty,
} from '@/api/PolicyAPI';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminEmptyState,
  getSuperAdminStatusBadgeClass,
} from './Components/SuperAdminSurface';

const PENALTY_TYPES = ['WARNING', 'FEATURE_RESTRICTION', 'TEMPORARY_BAN', 'PERMANENT_BAN'];

const TYPE_TONE = {
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  FEATURE_RESTRICTION: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  TEMPORARY_BAN: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  PERMANENT_BAN: 'bg-rose-200 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
};

const EMPTY_ISSUE_FORM = {
  type: 'WARNING',
  reason: '',
  details: '',
  durationHours: 24,
  relatedViolationId: '',
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

function needsDuration(type) {
  return type === 'TEMPORARY_BAN' || type === 'FEATURE_RESTRICTION';
}

export default function PenaltiesManagement() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showToast } = useToast();

  const [userIdInput, setUserIdInput] = useState('');
  const [activeUserId, setActiveUserId] = useState(null);
  const [page, setPage] = useState({ content: [], totalElements: 0, number: 0, size: 20 });
  const [loading, setLoading] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE_FORM);
  const [revokeOpen, setRevokeOpen] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchPenaltiesForUser(userId);
      setPage({
        content: data?.content ?? [],
        totalElements: data?.totalElements ?? 0,
        number: data?.number ?? 0,
        size: data?.size ?? 20,
      });
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e) => {
    e?.preventDefault?.();
    const id = Number(userIdInput);
    if (!id || Number.isNaN(id)) {
      showToast(t('penaltiesAdmin.userId') + '?', 'error');
      return;
    }
    setActiveUserId(id);
    reload(id);
  };

  const openIssue = () => {
    if (!activeUserId) return;
    setIssueForm(EMPTY_ISSUE_FORM);
    setIssueOpen(true);
  };

  const handleIssue = async () => {
    if (!activeUserId) return;
    setSaving(true);
    try {
      const payload = {
        userId: activeUserId,
        type: issueForm.type,
        reason: issueForm.reason,
        details: issueForm.details,
        relatedViolationId: issueForm.relatedViolationId
          ? Number(issueForm.relatedViolationId)
          : null,
        durationHours: needsDuration(issueForm.type)
          ? Number(issueForm.durationHours)
          : null,
      };
      await issuePenalty(payload);
      showToast(t('penaltiesAdmin.issueSuccess'), 'success');
      setIssueOpen(false);
      reload(activeUserId);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeOpen) return;
    if (!revokeReason.trim()) {
      showToast(t('penaltiesAdmin.field.revokeReason') + '?', 'error');
      return;
    }
    setSaving(true);
    try {
      await revokePenalty(revokeOpen.penaltyId, { revokeReason });
      showToast(t('penaltiesAdmin.revokeSuccess'), 'success');
      setRevokeOpen(null);
      setRevokeReason('');
      reload(activeUserId);
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
        title={t('penaltiesAdmin.title')}
        description={t('penaltiesAdmin.subtitle')}
        actions={
          activeUserId ? (
            <Button onClick={openIssue} className="h-10 rounded-2xl">
              <Gavel className="w-4 h-4 mr-2" />
              {t('penaltiesAdmin.issue')}
            </Button>
          ) : null
        }
      />

      <SuperAdminPanel
        title={t('penaltiesAdmin.lookupTitle')}
        description={t('penaltiesAdmin.lookupHint')}
      >
        <form onSubmit={handleLookup} className="flex items-center gap-3 max-w-md">
          <Input
            placeholder={t('penaltiesAdmin.userId')}
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            type="number"
          />
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />
            {t('penaltiesAdmin.lookup')}
          </Button>
        </form>
      </SuperAdminPanel>

      {activeUserId && (
        <SuperAdminPanel>
          {loading ? (
            <ListSpinner />
          ) : page.content.length === 0 ? (
            <SuperAdminEmptyState title={t('penaltiesAdmin.empty')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('penaltiesAdmin.colType')}</TableHead>
                  <TableHead>{t('penaltiesAdmin.colReason')}</TableHead>
                  <TableHead>{t('penaltiesAdmin.colStatus')}</TableHead>
                  <TableHead>{t('penaltiesAdmin.colStartAt')}</TableHead>
                  <TableHead>{t('penaltiesAdmin.colExpireAt')}</TableHead>
                  <TableHead>{t('penaltiesAdmin.colIssuedBy')}</TableHead>
                  <TableHead className="text-right">{t('penaltiesAdmin.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.content.map((p) => (
                  <TableRow key={p.penaltyId}>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_TONE[p.type] || ''}`}>
                        {t(`penaltiesAdmin.type.${p.type}`, p.type)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{p.reason}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getSuperAdminStatusBadgeClass(p.status, isDarkMode)}`}>
                        {t(`penaltiesAdmin.status.${p.status}`, p.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(p.startAt)}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {p.expireAt ? formatDate(p.expireAt) : t('penaltiesAdmin.permanent')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{p.issuedByName || '—'}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setRevokeOpen(p); setRevokeReason(''); }}
                          className="text-rose-500 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          {t('penaltiesAdmin.revoke')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SuperAdminPanel>
      )}

      {/* Issue dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('penaltiesAdmin.issueDialog')}</DialogTitle>
            <DialogDescription>User ID: {activeUserId}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>{t('penaltiesAdmin.field.type')}</Label>
              <select
                value={issueForm.type}
                onChange={(e) => setIssueForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {PENALTY_TYPES.map((p) => (
                  <option key={p} value={p}>{t(`penaltiesAdmin.type.${p}`, p)}</option>
                ))}
              </select>
            </div>
            {needsDuration(issueForm.type) && (
              <div>
                <Label>{t('penaltiesAdmin.field.durationHours')}</Label>
                <Input
                  type="number"
                  value={issueForm.durationHours}
                  onChange={(e) => setIssueForm((f) => ({ ...f, durationHours: e.target.value }))}
                  min={1}
                />
              </div>
            )}
            <div>
              <Label>{t('penaltiesAdmin.field.reason')}</Label>
              <Input
                value={issueForm.reason}
                onChange={(e) => setIssueForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('penaltiesAdmin.field.details')}</Label>
              <textarea
                value={issueForm.details}
                onChange={(e) => setIssueForm((f) => ({ ...f, details: e.target.value }))}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <Label>{t('penaltiesAdmin.field.relatedViolationId')}</Label>
              <Input
                type="number"
                value={issueForm.relatedViolationId}
                onChange={(e) => setIssueForm((f) => ({ ...f, relatedViolationId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)} disabled={saving}>
              {t('policiesAdmin.cancel')}
            </Button>
            <Button onClick={handleIssue} disabled={saving}>
              {t('penaltiesAdmin.issue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={revokeOpen !== null} onOpenChange={(open) => !open && setRevokeOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('penaltiesAdmin.revokeDialog')}</DialogTitle>
            <DialogDescription>{t('penaltiesAdmin.revokeConfirm')}</DialogDescription>
          </DialogHeader>
          <Label>{t('penaltiesAdmin.field.revokeReason')}</Label>
          <textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(null)} disabled={saving}>
              {t('policiesAdmin.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={saving}>
              {t('penaltiesAdmin.revoke')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
