import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlignLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  Hash,
  History,
  Link2,
  Loader2,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  ScrollText,
  Send,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  publishPolicy,
  updatePolicy,
} from '@/api/PolicyAPI';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminEmptyState,
  getSuperAdminStatusBadgeClass,
} from './Components/SuperAdminSurface';
import {
  ColorPicker,
  Field,
  IconPicker,
  SectionHeader,
} from './Components/PolicyEditDialogParts';

const POLICY_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'COMMUNITY_GUIDELINES',
  'AI_USAGE_POLICY',
  'REFUND_POLICY',
  'COPYRIGHT_POLICY',
];

// Helpers (SectionHeader, Field, IconPicker, ColorPicker) and the accent
// + icon-quick-pick lookups now live in ./Components/PolicyEditDialogParts.

const EMPTY_FORM = {
  type: '',
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

const POLICIES_QUERY_KEY = ['superAdmin', 'policies'];

export default function PoliciesManagement() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(null); // policyId or 'new' or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(null);
  const [versions, setVersions] = useState([]);
  // Cache `content` per policyId to skip refetch when re-opening the same policy
  const [contentCache, setContentCache] = useState({});

  const {
    data: policies = [],
    isLoading: loading,
    error: policiesError,
  } = useQuery({
    queryKey: POLICIES_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchAllPolicies();
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    if (policiesError) showError(getErrorMessage(t, policiesError));
  }, [policiesError, showError, t]);

  const reload = () => queryClient.invalidateQueries({ queryKey: POLICIES_QUERY_KEY });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing('new');
  };

  const openEdit = (policyId) => {
    // Open instantly with summary data from the list (everything except `content`).
    const summary = policies.find((p) => p.policyId === policyId);
    if (!summary) return;

    const cachedContent = contentCache[policyId];
    setForm({
      type: summary.type ?? 'TERMS_OF_SERVICE',
      slug: summary.slug ?? '',
      title: summary.title ?? '',
      summary: summary.summary ?? '',
      content: cachedContent ?? '',
      version: summary.version ?? '1.0',
      status: summary.status ?? 'DRAFT',
      effectiveDate: summary.effectiveDate ?? '',
      iconName: summary.iconName ?? 'FileText',
      accentColor: summary.accentColor ?? 'indigo',
      displayOrder: summary.displayOrder ?? 0,
      changelog: '',
    });
    setEditing(policyId);

    if (cachedContent != null) return; // Already have content cached → no refetch.

    setContentLoading(true);
    fetchPolicyById(policyId)
      .then((detail) => {
        if (!detail) return;
        const nextContent = detail.content ?? '';
        setContentCache((prev) => ({ ...prev, [policyId]: nextContent }));
        // Only fill in if user hasn't started typing in the textarea already.
        setForm((f) => (f.content ? f : { ...f, content: nextContent }));
      })
      .catch((err) => showError(getErrorMessage(t, err)))
      .finally(() => setContentLoading(false));
  };

  const closeDialog = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setContentLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const basePayload = {
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
        effectiveDate: form.effectiveDate || null,
      };
      if (editing === 'new') {
        await createPolicy({ ...basePayload, status: 'DRAFT', version: '1.0' });
        showSuccess(t('policiesAdmin.createSuccess', 'Policy created'));
      } else {
        const { version: _v, status: _s, ...updatePayload } = basePayload;
        await updatePolicy(editing, updatePayload);
        // Invalidate cached content for this policy — server bumped the version.
        setContentCache((prev) => {
          const next = { ...prev };
          delete next[editing];
          return next;
        });
        showSuccess(t('policiesAdmin.updateSuccess', 'Policy updated'));
      }
      closeDialog();
      reload();
    } catch (err) {
      showError(getErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (policyId) => {
    if (!window.confirm(t('policiesAdmin.archiveConfirm'))) return;
    try {
      await archivePolicy(policyId);
      showSuccess(t('policiesAdmin.archiveSuccess', 'Policy archived'));
      reload();
    } catch (err) {
      showError(getErrorMessage(t, err));
    }
  };

  const handlePublish = async (policyId) => {
    if (!window.confirm(t('policiesAdmin.publishConfirm'))) return;
    try {
      await publishPolicy(policyId);
      showSuccess(t('policiesAdmin.publishSuccess', 'Policy published'));
      reload();
    } catch (err) {
      showError(getErrorMessage(t, err));
    }
  };

  const openVersions = async (policyId) => {
    try {
      const data = await fetchPolicyVersions(policyId);
      setVersions(Array.isArray(data) ? data : []);
      setVersionsOpen(policyId);
    } catch (err) {
      showError(getErrorMessage(t, err));
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
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      {p.publishedVersion && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 dark:bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                          title={t('policiesAdmin.publishedVersionTitle')}
                        >
                          {p.publishedVersion}
                        </span>
                      )}
                      {p.hasUnpublishedChanges && p.publishedVersion && (
                        <span className="text-slate-400">→</span>
                      )}
                      {(p.hasUnpublishedChanges || !p.publishedVersion) && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 dark:bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                          title={t('policiesAdmin.draftVersionTitle')}
                        >
                          {p.version}
                        </span>
                      )}
                    </div>
                  </TableCell>
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
                      {p.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('policiesAdmin.publish')}
                          onClick={() => handlePublish(p.policyId)}
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                      )}
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
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0 border-slate-200/80 dark:border-slate-800/80">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 border-b border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-indigo-50/60 via-white to-white dark:from-indigo-950/30 dark:via-slate-950 dark:to-slate-950">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 p-2.5 ring-1 ring-indigo-500/20 dark:ring-indigo-400/20 animate-in zoom-in-50 fade-in duration-300">
                <ScrollText className="h-5 w-5 text-indigo-600 dark:text-indigo-300" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {editing === 'new'
                    ? t('policiesAdmin.createDialog')
                    : t('policiesAdmin.editDialog')}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 truncate">
                  {form.title || t('policiesAdmin.subtitle')}
                </DialogDescription>
              </div>
              {editing !== 'new' && form.type && (
                <span
                  className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900/[0.04] dark:bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-slate-900/5 dark:ring-white/10 animate-in fade-in slide-in-from-right-2 duration-300"
                  title={t('policiesAdmin.field.type')}
                >
                  <Tag className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                  <span className="font-mono tracking-tight">{form.type}</span>
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-7 overflow-y-auto max-h-[calc(92vh-9rem-4rem)]">
            {/* Section 1 — Identity */}
            <section
              className="animate-in fade-in slide-in-from-bottom-1 duration-500"
              style={{ animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
              <SectionHeader
                icon={<Tag className="h-3.5 w-3.5" />}
                tone="indigo"
                title={t('policiesAdmin.section.identity')}
              />
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing === 'new' && (
                  <Field icon={<TypeIcon className="h-3.5 w-3.5" />} label={t('policiesAdmin.field.type')}>
                    <Input
                      list="policy-type-suggestions"
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          type: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9_]/g, '_')
                            .replace(/_+/g, '_'),
                        }))
                      }
                      placeholder="TERMS_OF_SERVICE"
                      className="font-mono"
                    />
                    <datalist id="policy-type-suggestions">
                      {POLICY_TYPES.map((pt) => (
                        <option key={pt} value={pt} />
                      ))}
                    </datalist>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {t('policiesAdmin.typeHint')}
                    </p>
                  </Field>
                )}
                <Field icon={<Link2 className="h-3.5 w-3.5" />} label={t('policiesAdmin.field.slug')}>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="terms-of-service"
                    className="font-mono"
                  />
                </Field>
                {editing !== 'new' && (
                  <Field icon={<Tag className="h-3.5 w-3.5" />} label={t('policiesAdmin.field.type')}>
                    <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 px-3">
                      <Tag className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300 shrink-0" />
                      <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {form.type}
                      </span>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t('policiesAdmin.locked')}
                      </span>
                    </div>
                  </Field>
                )}
              </div>
            </section>

            {/* Section 2 — Display */}
            <section
              className="animate-in fade-in slide-in-from-bottom-1 duration-500"
              style={{
                animationDelay: '60ms',
                animationFillMode: 'both',
                animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <SectionHeader
                icon={<Sparkles className="h-3.5 w-3.5" />}
                tone="emerald"
                title={t('policiesAdmin.section.display')}
              />
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  icon={<TypeIcon className="h-3.5 w-3.5" />}
                  label={t('policiesAdmin.field.title')}
                  className="md:col-span-2"
                >
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Điều khoản sử dụng"
                  />
                </Field>
                <Field
                  icon={<AlignLeft className="h-3.5 w-3.5" />}
                  label={t('policiesAdmin.field.summary')}
                  className="md:col-span-2"
                >
                  <Input
                    value={form.summary}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                    placeholder="Tóm tắt 1-2 câu hiển thị trên trang công khai"
                  />
                </Field>
                <Field
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label={t('policiesAdmin.field.iconName')}
                  className="md:col-span-2"
                >
                  <IconPicker
                    value={form.iconName}
                    onChange={(name) => setForm((f) => ({ ...f, iconName: name }))}
                    accent={form.accentColor || 'indigo'}
                    typeHint={t('policiesAdmin.iconHint')}
                  />
                </Field>
                <Field
                  icon={<Palette className="h-3.5 w-3.5" />}
                  label={t('policiesAdmin.field.accentColor')}
                  className="md:col-span-2"
                >
                  <ColorPicker
                    value={form.accentColor}
                    onChange={(c) => setForm((f) => ({ ...f, accentColor: c }))}
                  />
                </Field>
              </div>
            </section>

            {/* Section 3 — Schedule */}
            <section
              className="animate-in fade-in slide-in-from-bottom-1 duration-500"
              style={{
                animationDelay: '120ms',
                animationFillMode: 'both',
                animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <SectionHeader
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                tone="amber"
                title={t('policiesAdmin.section.schedule')}
              />
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field icon={<CalendarDays className="h-3.5 w-3.5" />} label={t('policiesAdmin.field.effectiveDate')}>
                  <Input
                    type="date"
                    value={form.effectiveDate || ''}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  />
                </Field>
                <Field icon={<Hash className="h-3.5 w-3.5" />} label={t('policiesAdmin.field.displayOrder')}>
                  <Input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  />
                </Field>
              </div>
            </section>

            {/* Section 4 — Content */}
            <section
              className="animate-in fade-in slide-in-from-bottom-1 duration-500"
              style={{
                animationDelay: '180ms',
                animationFillMode: 'both',
                animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <SectionHeader
                icon={<FileText className="h-3.5 w-3.5" />}
                tone="violet"
                title={t('policiesAdmin.section.content')}
              />
              <div className="mt-3 space-y-4">
                <Field
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label={t('policiesAdmin.field.content')}
                  badge={
                    contentLoading && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-500 dark:text-indigo-300" />
                        {t('policiesAdmin.contentLoading')}
                      </span>
                    )
                  }
                >
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={14}
                    disabled={contentLoading}
                    className="w-full px-3.5 py-3 rounded-md border border-input bg-transparent text-sm font-mono leading-relaxed shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-wait resize-y"
                    placeholder={contentLoading ? t('policiesAdmin.contentLoading') : '# Heading\n\nParagraph...'}
                  />
                </Field>
                <Field icon={<StickyNote className="h-3.5 w-3.5" />} label={t('policiesAdmin.field.changelog')}>
                  <Input
                    value={form.changelog}
                    onChange={(e) => setForm((f) => ({ ...f, changelog: e.target.value }))}
                    placeholder="Cập nhật mục 6 về xử phạt"
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              {t('policiesAdmin.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[120px] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.015] active:scale-[0.985]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('policiesAdmin.saving', 'Đang lưu...')}
                </>
              ) : (
                t('policiesAdmin.save')
              )}
            </Button>
          </div>
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
