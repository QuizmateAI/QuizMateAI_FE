import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, History, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
  archivePolicy,
  createPolicy,
  fetchAllPolicies,
  fetchPolicyById,
  fetchPolicyVersions,
  updatePolicy,
} from '@/api/PolicyAPI';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminEmptyState,
  getSuperAdminStatusBadgeClass,
} from './Components/SuperAdminSurface';

const POLICY_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'COMMUNITY_GUIDELINES',
  'AI_USAGE_POLICY',
  'REFUND_POLICY',
  'COPYRIGHT_POLICY',
];

const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const ACCENT_COLORS = ['indigo', 'emerald', 'amber', 'violet', 'rose', 'sky'];

const EMPTY_FORM = {
  type: 'TERMS_OF_SERVICE',
  slug: '',
  title: '',
  summary: '',
  content: '',
  version: '1.0',
  status: 'DRAFT',
  effectiveDate: '',
  iconName: 'FileText',
  accentColor: 'indigo',
  displayOrder: 0,
  changelog: '',
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

export default function PoliciesManagement() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showToast } = useToast();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // policyId or 'new' or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(null);
  const [versions, setVersions] = useState([]);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPolicies();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing('new');
  };

  const openEdit = async (policyId) => {
    try {
      const detail = await fetchPolicyById(policyId);
      if (!detail) return;
      setForm({
        type: detail.type ?? 'TERMS_OF_SERVICE',
        slug: detail.slug ?? '',
        title: detail.title ?? '',
        summary: detail.summary ?? '',
        content: detail.content ?? '',
        version: detail.version ?? '1.0',
        status: detail.status ?? 'DRAFT',
        effectiveDate: detail.effectiveDate ?? '',
        iconName: detail.iconName ?? 'FileText',
        accentColor: detail.accentColor ?? 'indigo',
        displayOrder: detail.displayOrder ?? 0,
        changelog: '',
      });
      setEditing(policyId);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const closeDialog = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
        effectiveDate: form.effectiveDate || null,
      };
      if (editing === 'new') {
        await createPolicy(payload);
        showToast(t('policiesAdmin.createSuccess', 'Policy created'), 'success');
      } else {
        await updatePolicy(editing, payload);
        showToast(t('policiesAdmin.updateSuccess', 'Policy updated'), 'success');
      }
      closeDialog();
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (policyId) => {
    if (!window.confirm(t('policiesAdmin.archiveConfirm'))) return;
    try {
      await archivePolicy(policyId);
      showToast(t('policiesAdmin.archiveSuccess', 'Policy archived'), 'success');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const openVersions = async (policyId) => {
    try {
      const data = await fetchPolicyVersions(policyId);
      setVersions(Array.isArray(data) ? data : []);
      setVersionsOpen(policyId);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <SuperAdminPage>
      <SuperAdminPageHeader
        eyebrow={t('sidebarSections.trustSafety', 'Trust & Safety')}
        title={t('policiesAdmin.title')}
        description={t('policiesAdmin.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={reload} className="h-10 rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('policiesAdmin.refresh')}
            </Button>
            <Button onClick={openCreate} className="h-10 rounded-2xl">
              <Plus className="w-4 h-4 mr-2" />
              {t('policiesAdmin.newPolicy')}
            </Button>
          </>
        }
      />

      <SuperAdminPanel>
        {loading ? (
          <ListSpinner />
        ) : policies.length === 0 ? (
          <SuperAdminEmptyState title={t('policiesAdmin.empty')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('policiesAdmin.colTitle')}</TableHead>
                <TableHead>{t('policiesAdmin.colType')}</TableHead>
                <TableHead>{t('policiesAdmin.colVersion')}</TableHead>
                <TableHead>{t('policiesAdmin.colStatus')}</TableHead>
                <TableHead>{t('policiesAdmin.colDisplayOrder')}</TableHead>
                <TableHead>{t('policiesAdmin.colUpdatedAt')}</TableHead>
                <TableHead className="text-right">{t('policiesAdmin.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.policyId}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{p.title}</span>
                      <span className="text-xs text-slate-500">/{p.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{p.type}</TableCell>
                  <TableCell>{p.version}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getSuperAdminStatusBadgeClass(p.status, isDarkMode)}`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell>{p.displayOrder}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(p.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('policiesAdmin.preview')}
                        onClick={() => window.open(`/policies/${p.slug}`, '_blank')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('policiesAdmin.versions')}
                        onClick={() => openVersions(p.policyId)}
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('policiesAdmin.edit')}
                        onClick={() => openEdit(p.policyId)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {p.status !== 'ARCHIVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('policiesAdmin.archive')}
                          onClick={() => handleArchive(p.policyId)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SuperAdminPanel>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing === 'new'
                ? t('policiesAdmin.createDialog')
                : t('policiesAdmin.editDialog')}
            </DialogTitle>
            <DialogDescription>{form.title}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('policiesAdmin.field.type')}</Label>
              <select
                disabled={editing !== 'new'}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {POLICY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('policiesAdmin.field.slug')}</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="terms-of-service"
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t('policiesAdmin.field.title')}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t('policiesAdmin.field.summary')}</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('policiesAdmin.field.version')}</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('policiesAdmin.field.status')}</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('policiesAdmin.field.effectiveDate')}</Label>
              <Input
                type="date"
                value={form.effectiveDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('policiesAdmin.field.displayOrder')}</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('policiesAdmin.field.iconName')}</Label>
              <Input
                value={form.iconName}
                onChange={(e) => setForm((f) => ({ ...f, iconName: e.target.value }))}
                placeholder="Shield, FileText, ..."
              />
            </div>
            <div>
              <Label>{t('policiesAdmin.field.accentColor')}</Label>
              <select
                value={form.accentColor}
                onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {ACCENT_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>{t('policiesAdmin.field.content')}</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={16}
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono leading-relaxed"
                placeholder="# Heading&#10;&#10;Paragraph..."
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t('policiesAdmin.field.changelog')}</Label>
              <Input
                value={form.changelog}
                onChange={(e) => setForm((f) => ({ ...f, changelog: e.target.value }))}
                placeholder="Cập nhật mục 6 về xử phạt"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              {t('policiesAdmin.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {t('policiesAdmin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionsOpen !== null} onOpenChange={(open) => !open && setVersionsOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('policiesAdmin.versionsDialog')}</DialogTitle>
          </DialogHeader>
          {versions.length === 0 ? (
            <SuperAdminEmptyState title={t('policiesAdmin.empty')} />
          ) : (
            <ul className="space-y-3">
              {versions.map((v) => (
                <li
                  key={v.versionId}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">v{v.version}</span>
                    <span className="text-xs text-slate-500">{formatDate(v.publishedAt)}</span>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{v.title}</div>
                  {v.changelog && (
                    <div className="mt-2 text-xs text-slate-500 italic">{v.changelog}</div>
                  )}
                  {v.authorName && (
                    <div className="mt-1 text-xs text-slate-400">— {v.authorName}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
