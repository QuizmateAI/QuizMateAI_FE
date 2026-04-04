import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  Save,
  X,
  Cpu,
  FileText,
  Image,
  Type,
  FileSpreadsheet,
  Presentation,
  Headphones,
  Video,
  BrainCircuit,
  Layers,
  ClipboardCheck,
  Map,
  Edit2,
  Settings2,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { getAllAiActionPolicies, updateAiActionPolicy } from '@/api/ManagementSystemAPI';

const ACTION_META = {
  GENERATE_QUIZ: { icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40', category: 'generate', i18nKey: 'generateQuiz' },
  PREVIEW_QUIZ_STRUCTURE: { icon: Settings2, color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/40', category: 'generate', i18nKey: 'previewQuizStructure' },
  GENERATE_FLASHCARDS: { icon: Layers, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/40', category: 'generate', i18nKey: 'generateFlashcards' },
  GENERATE_MOCK_TEST: { icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/40', category: 'generate', i18nKey: 'generateMockTest' },
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: { icon: Map, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40', category: 'generate', i18nKey: 'generateRoadmapQuiz' },
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: { icon: BrainCircuit, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/40', category: 'analysis', i18nKey: 'analyzeStudyProfileKnowledge' },
  SUGGEST_STUDY_PROFILE_FIELDS: { icon: Cpu, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950/40', category: 'analysis', i18nKey: 'suggestStudyProfileFields' },
  SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: { icon: FileText, color: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/40', category: 'analysis', i18nKey: 'suggestStudyProfileExamTemplates' },
  VALIDATE_STUDY_PROFILE_CONSISTENCY: { icon: ClipboardCheck, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-950/40', category: 'analysis', i18nKey: 'validateStudyProfileConsistency' },
  PROCESS_PDF: { icon: FileText, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-950/40', category: 'process', i18nKey: 'processPdf' },
  PROCESS_IMAGE: { icon: Image, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-950/40', category: 'process', i18nKey: 'processImage' },
  PROCESS_TEXT: { icon: Type, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', category: 'process', i18nKey: 'processText' },
  PROCESS_DOCX: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/40', category: 'process', i18nKey: 'processDocx' },
  PROCESS_XLSX: { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950/40', category: 'process', i18nKey: 'processXlsx' },
  PROCESS_PPTX: { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-950/40', category: 'process', i18nKey: 'processPptx' },
  PROCESS_AUDIO: { icon: Headphones, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950/40', category: 'process', i18nKey: 'processAudio' },
  PROCESS_VIDEO: { icon: Video, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/40', category: 'process', i18nKey: 'processVideo' },
};

const COST_MODE_OPTIONS = ['FIXED', 'PER_QUESTION', 'PER_ITEM', 'PER_PAGE', 'PER_WORD', 'PER_CELL', 'PER_SECOND'];

function extractData(res) {
  return res?.data?.data ?? res?.data ?? res ?? null;
}

function getActionLabels(actionKey, t) {
  const meta = ACTION_META[actionKey];
  const key = meta?.i18nKey || actionKey;
  const prefix = `aiActionPolicy.actions.${key}`;
  return {
    title: t(`${prefix}.title`, ''),
    baseCostLabel: t(`${prefix}.baseCost`, t('aiActionPolicy.baseCost')),
    unitCostLabel: t(`${prefix}.unitCost`, t('aiActionPolicy.unitCost')),
    unitSizeLabel: t(`${prefix}.unitSize`, t('aiActionPolicy.unitSize')),
    metricLabel: t(`${prefix}.metric`, ''),
  };
}

function normalizePolicyTitle(title) {
  return String(title || '').replace(/^(Process|Xử lý)\s+/i, '').trim();
}

function getPolicyTitle(policy, t) {
  const labels = getActionLabels(policy.actionKey, t);
  const normalizedDisplayName = normalizePolicyTitle(policy.displayName);
  const normalizedLabelTitle = normalizePolicyTitle(labels.title || policy.actionKey);

  if (
    policy.actionKey === 'GENERATE_ROADMAP_KNOWLEDGE_QUIZ' &&
    (!normalizedDisplayName || /^generate roadmap( knowledge)? quiz$/i.test(normalizedDisplayName))
  ) {
    return normalizedLabelTitle;
  }

  return normalizedDisplayName || normalizedLabelTitle;
}

function getCategoryLabel(actionKey, t) {
  const category = ACTION_META[actionKey]?.category;
  if (category === 'generate') return t('aiActionPolicy.categoryGenerate');
  if (category === 'analysis') return t('aiActionPolicy.categoryAnalysis');
  if (category === 'process') return t('aiActionPolicy.categoryProcess');
  return '-';
}

function getCategoryBadgeClass(category, isDarkMode) {
  if (category === 'generate') {
    return isDarkMode ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' : 'bg-sky-50 text-sky-700 border-sky-200';
  }

  if (category === 'analysis') {
    return isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }

  if (category === 'process') {
    return isDarkMode ? 'bg-violet-500/10 text-violet-300 border-violet-500/30' : 'bg-violet-50 text-violet-700 border-violet-200';
  }

  return isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200';
}

function CostModeBadge({ costMode, isDarkMode, t }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
    >
      {t(`aiActionPolicy.costMode.${costMode}`, costMode)}
    </span>
  );
}

function FormulaPreview({ policy, isDarkMode, t, compact = false }) {
  const isFixed = policy.costMode === 'FIXED';
  const unitLabel = t(`aiActionPolicy.costModeUnit.${policy.costMode}`, policy.costMode);
  const formulaLine = isFixed
    ? `${policy.baseCreditCost ?? 0} QMC`
    : `${policy.baseCreditCost ?? 0} + ${policy.unitCreditCost ?? 0} x ceil(${unitLabel} / ${policy.unitSize ?? 1}) QMC`;

  const summary = isFixed
    ? t('aiActionPolicy.formulaFixedNote')
    : t('aiActionPolicy.formulaSummary', {
      base: policy.baseCreditCost ?? 0,
      unit: policy.unitCreditCost ?? 0,
      size: policy.unitSize ?? 1,
      mode: unitLabel,
    });

  if (compact) {
    return (
      <div className="min-w-[320px] space-y-1">
        <p className={`font-mono text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
          {formulaLine}
        </p>
        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {summary}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-gray-200 bg-gray-50'}`}>
      <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        {t('aiActionPolicy.formula')}
      </p>
      <p className={`font-mono text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {formulaLine}
      </p>
      <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        {summary}
      </p>
    </div>
  );
}

function PolicyTableSection({ title, policies, isDarkMode, canWrite, onEdit, t }) {
  const columnWidths = canWrite
    ? {
      action: '24%',
      costMode: '12%',
      formula: '44%',
      status: '10%',
      actions: '10%',
    }
    : {
      action: '26%',
      costMode: '12%',
      formula: '52%',
      status: '10%',
    };

  return (
    <section className="space-y-3">
      <div>
        <h2 className={`text-sm font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
          {title}
        </h2>
      </div>

      <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <Table className="table-fixed">
          <colgroup>
            <col style={{ width: columnWidths.action }} />
            <col style={{ width: columnWidths.costMode }} />
            <col style={{ width: columnWidths.formula }} />
            <col style={{ width: columnWidths.status }} />
            {canWrite && <col style={{ width: columnWidths.actions }} />}
          </colgroup>
          <TableHeader>
            <TableRow className={isDarkMode ? 'border-slate-800 bg-slate-800/60' : 'bg-gray-50'}>
              <TableHead className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('aiActionPolicy.colAction')}
              </TableHead>
              <TableHead className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('aiActionPolicy.colCostMode')}
              </TableHead>
              <TableHead className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('aiActionPolicy.colFormula')}
              </TableHead>
              <TableHead className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('aiActionPolicy.colStatus')}
              </TableHead>
              {canWrite && (
                <TableHead className={`w-[120px] text-center font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('aiActionPolicy.colActions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => {
              const meta = ACTION_META[policy.actionKey] || {
                icon: Cpu,
                color: 'text-gray-500',
                bg: 'bg-gray-100 dark:bg-gray-800',
                category: 'other',
              };
              const Icon = meta.icon;
              return (
                <TableRow
                  key={policy.actionKey}
                  className={`align-top transition-colors ${
                    isDarkMode ? 'border-slate-800 hover:bg-slate-800/40' : 'hover:bg-gray-50'
                  } ${policy.isActive ? '' : 'opacity-70'}`}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {getPolicyTitle(policy, t)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <CostModeBadge costMode={policy.costMode} isDarkMode={isDarkMode} t={t} />
                  </TableCell>
                  <TableCell className="py-4">
                    <FormulaPreview policy={policy} isDarkMode={isDarkMode} t={t} compact />
                  </TableCell>
                  <TableCell className="py-4">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                        policy.isActive
                          ? isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {policy.isActive ? t('aiActionPolicy.statusActive') : t('aiActionPolicy.statusInactive')}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(policy)}
                        aria-label={t('aiActionPolicy.edit')}
                        title={t('aiActionPolicy.edit')}
                        className={`mx-auto h-9 w-9 p-0 ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'hover:bg-gray-100'}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default function AiActionPolicyManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const dk = isDarkMode;
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const canWrite = !permLoading && permissions.has('system-settings:write');

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllAiActionPolicies();
      setPolicies(extractData(res) || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const sortPolicies = (list) => [...list].sort((left, right) => {
    const categoryPriority = { generate: 0, analysis: 1, process: 2 };
    const leftCategory = categoryPriority[ACTION_META[left.actionKey]?.category] ?? 99;
    const rightCategory = categoryPriority[ACTION_META[right.actionKey]?.category] ?? 99;
    if (leftCategory !== rightCategory) return leftCategory - rightCategory;
    return getPolicyTitle(left, t).localeCompare(getPolicyTitle(right, t), i18n.language);
  });

  const aiFunctionPolicies = sortPolicies(
    policies.filter((policy) => ACTION_META[policy.actionKey]?.category === 'generate')
  );

  const analysisPolicies = sortPolicies(
    policies.filter((policy) => ACTION_META[policy.actionKey]?.category === 'analysis')
  );

  const documentPolicies = sortPolicies(
    policies.filter((policy) => ACTION_META[policy.actionKey]?.category === 'process')
  );

  const openEdit = (policy) => {
    setEditPolicy(policy);
    setForm({
      displayName: policy.displayName || '',
      costMode: policy.costMode || 'FIXED',
      baseCreditCost: policy.baseCreditCost ?? 0,
      unitCreditCost: policy.unitCreditCost ?? 0,
      unitSize: policy.unitSize ?? 1,
      isActive: policy.isActive ?? true,
      description: policy.description || '',
    });
    setEditOpen(true);
  };

  const closeEdit = (open) => {
    setEditOpen(open);
    if (!open) {
      setEditPolicy(null);
      setForm({});
    }
  };

  const handleSave = async () => {
    if (!editPolicy) return;

    setSaving(true);
    try {
      const res = await updateAiActionPolicy(editPolicy.actionKey, form);
      const updated = extractData(res);

      setPolicies((prev) => prev.map((policy) => (
        policy.actionKey === editPolicy.actionKey
          ? { ...policy, ...form, ...(updated || {}) }
          : policy
      )));

      showSuccess(t('aiActionPolicy.updateSuccess'));
      closeEdit(false);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const previewPolicy = editPolicy ? { ...editPolicy, ...form } : null;
  const editLabels = editPolicy ? getActionLabels(editPolicy.actionKey, t) : null;

  return (
    <div className={`min-h-screen p-6 ${fontClass} ${dk ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${dk ? 'bg-cyan-500/10' : 'bg-cyan-50'}`}>
            <Settings2 className={`h-6 w-6 ${dk ? 'text-cyan-300' : 'text-cyan-700'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {t('aiActionPolicy.title')}
            </h1>
            <p className={`mt-0.5 text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('aiActionPolicy.subtitle')}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPolicies}
          disabled={loading}
          className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('aiActionPolicy.refresh')}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className={`overflow-hidden rounded-xl border ${dk ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
          <div className="flex justify-center py-16">
            <ListSpinner />
          </div>
        </div>
      ) : policies.length === 0 ? (
        <div className={`overflow-hidden rounded-xl border ${dk ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
          <div className={`py-16 text-center ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('aiActionPolicy.empty')}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {aiFunctionPolicies.length > 0 && (
            <PolicyTableSection
              title={t('aiActionPolicy.sectionAiFunctions')}
              policies={aiFunctionPolicies}
              isDarkMode={dk}
              canWrite={canWrite}
              onEdit={openEdit}
              t={t}
            />
          )}

          {analysisPolicies.length > 0 && (
            <PolicyTableSection
              title={t('aiActionPolicy.sectionAnalysis')}
              policies={analysisPolicies}
              isDarkMode={dk}
              canWrite={canWrite}
              onEdit={openEdit}
              t={t}
            />
          )}

          {documentPolicies.length > 0 && (
            <PolicyTableSection
              title={t('aiActionPolicy.sectionDocuments')}
              policies={documentPolicies}
              isDarkMode={dk}
              canWrite={canWrite}
              onEdit={openEdit}
              t={t}
            />
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={closeEdit}>
        <DialogContent className={dk ? 'border-slate-800 bg-slate-900 text-white sm:max-w-3xl' : 'sm:max-w-3xl'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              {t('aiActionPolicy.editTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('aiActionPolicy.editDescription')}
            </DialogDescription>
          </DialogHeader>

          {editPolicy && (
            <div className="space-y-5 py-2">
              <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
                <div className="space-y-1.5">
                  <Label className={dk ? 'text-slate-300' : ''}>{t('aiActionPolicy.actionKey')}</Label>
                  <code className={`block rounded-lg px-3 py-2 text-sm ${dk ? 'bg-slate-800 text-cyan-300' : 'bg-gray-100 text-cyan-700'}`}>
                    {editPolicy.actionKey}
                  </code>
                </div>

                <div className="space-y-1.5">
                  <Label className={dk ? 'text-slate-300' : ''}>{t('aiActionPolicy.active')}</Label>
                  <div className={`flex h-10 items-center justify-between rounded-lg border px-3 ${dk ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
                    <span className={`text-sm ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                      {form.isActive ? t('aiActionPolicy.statusActive') : t('aiActionPolicy.statusInactive')}
                    </span>
                    <Switch
                      checked={Boolean(form.isActive)}
                      onCheckedChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={dk ? 'text-slate-300' : ''}>{t('aiActionPolicy.displayName')}</Label>
                <Input
                  value={form.displayName ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  className={dk ? 'border-slate-700 bg-slate-800 text-white' : ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={dk ? 'text-slate-300' : ''}>{t('aiActionPolicy.description')}</Label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className={`w-full resize-none rounded-lg border px-3 py-2 text-sm ${
                    dk ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                  placeholder={t('aiActionPolicy.descriptionPlaceholder')}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                <div className="space-y-1.5">
                  <Label className={dk ? 'text-slate-300' : ''}>{t('aiActionPolicy.costMode.label')}</Label>
                  <select
                    value={form.costMode ?? 'FIXED'}
                    onChange={(event) => setForm((prev) => ({ ...prev, costMode: event.target.value }))}
                    className={`h-10 w-full rounded-lg border px-3 text-sm ${
                      dk ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-white text-gray-900'
                    }`}
                  >
                    {COST_MODE_OPTIONS.map((mode) => (
                      <option key={mode} value={mode}>
                        {t(`aiActionPolicy.costMode.${mode}`, mode)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className={dk ? 'text-slate-300' : ''}>{editLabels?.baseCostLabel || t('aiActionPolicy.baseCost')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.baseCreditCost ?? 0}
                    onChange={(event) => setForm((prev) => ({ ...prev, baseCreditCost: Math.max(0, Number(event.target.value) || 0) }))}
                    className={dk ? 'border-slate-700 bg-slate-800 text-white' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className={dk ? 'text-slate-300' : ''}>{editLabels?.unitCostLabel || t('aiActionPolicy.unitCost')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.unitCreditCost ?? 0}
                    onChange={(event) => setForm((prev) => ({ ...prev, unitCreditCost: Math.max(0, Number(event.target.value) || 0) }))}
                    disabled={form.costMode === 'FIXED'}
                    className={dk ? 'border-slate-700 bg-slate-800 text-white disabled:bg-slate-900 disabled:text-slate-500' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className={dk ? 'text-slate-300' : ''}>{editLabels?.unitSizeLabel || t('aiActionPolicy.unitSize')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.unitSize ?? 1}
                    onChange={(event) => setForm((prev) => ({ ...prev, unitSize: Math.max(1, Number(event.target.value) || 1) }))}
                    disabled={form.costMode === 'FIXED'}
                    className={dk ? 'border-slate-700 bg-slate-800 text-white disabled:bg-slate-900 disabled:text-slate-500' : ''}
                  />
                </div>
              </div>

              {previewPolicy && (
                <FormulaPreview policy={previewPolicy} isDarkMode={dk} t={t} />
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => closeEdit(false)}
              disabled={saving}
              className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              <X className="mr-1 h-4 w-4" />
              {t('aiActionPolicy.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !editPolicy}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? t('aiActionPolicy.saving') : t('aiActionPolicy.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
