import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
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
  Map as MapIcon,
  Edit2,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { getAiModels, getAllAiActionPolicies, updateAiActionPolicy } from '@/api/ManagementSystemAPI';
import { filterAiModelsForAction, filterSupportedAiModels } from '@/lib/aiModelCatalog';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from '@/pages/SuperAdmin/Components/SuperAdminSurface';
import AiActionPolicyEditDialog, {
  FormulaPreview,
} from './components/AiActionPolicyEditDialog';

const ACTION_META = {
  GENERATE_QUIZ: { icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40', category: 'generate', i18nKey: 'generateQuiz' },
  PREVIEW_QUIZ_STRUCTURE: { icon: Settings2, color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/40', category: 'generate', i18nKey: 'previewQuizStructure' },
  GENERATE_FLASHCARDS: { icon: Layers, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/40', category: 'generate', i18nKey: 'generateFlashcards' },
  GENERATE_MOCK_TEST: { icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/40', category: 'generate', i18nKey: 'generateMockTest' },
  GENERATE_ROADMAP: { icon: MapIcon, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40', category: 'generate', i18nKey: 'generateRoadmap' },
  GENERATE_ROADMAP_PHASES: { icon: Layers, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-950/40', category: 'generate', i18nKey: 'generateRoadmapPhases' },
  GENERATE_ROADMAP_PHASE_CONTENT: { icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/40', category: 'generate', i18nKey: 'generateRoadmapPhaseContent' },
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: { icon: MapIcon, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40', category: 'generate', i18nKey: 'generateRoadmapQuiz' },
  SUGGEST_LEARNING_RESOURCES: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40', category: 'analysis', i18nKey: 'suggestLearningResources' },
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: { icon: BrainCircuit, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/40', category: 'analysis', i18nKey: 'analyzeStudyProfileKnowledge' },
  SUGGEST_STUDY_PROFILE_FIELDS: { icon: Cpu, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950/40', category: 'analysis', i18nKey: 'suggestStudyProfileFields' },
  SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: { icon: FileText, color: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/40', category: 'analysis', i18nKey: 'suggestStudyProfileExamTemplates' },
  SUGGEST_WORKSPACE_NAME: { icon: Cpu, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950/40', category: 'analysis', i18nKey: 'suggestWorkspaceName' },
  VALIDATE_STUDY_PROFILE_CONSISTENCY: { icon: ClipboardCheck, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-950/40', category: 'analysis', i18nKey: 'validateStudyProfileConsistency' },
  COMPANION_INTERPRET: { icon: BrainCircuit, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950/40', category: 'generate', i18nKey: 'companionInterpret' },
  COMPANION_TRANSCRIBE: { icon: Headphones, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950/40', category: 'generate', i18nKey: 'companionTranscribe' },
  COMPANION_TTS: { icon: Headphones, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/40', category: 'generate', i18nKey: 'companionTts' },
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
const DIGIT_ONLY_PATTERN = /\D+/g;

function extractData(res) {
  return res?.data?.data ?? res?.data ?? res ?? null;
}

function normalizeAiModel(model) {
  const id = model?.id ?? model?.aiModelId;
  return id == null ? model : { ...model, id };
}

function sanitizeWholeNumberInput(value) {
  return String(value ?? '').replace(DIGIT_ONLY_PATTERN, '');
}

function parseWholeNumberInput(value, fallback = 0) {
  const sanitized = sanitizeWholeNumberInput(value);
  if (!sanitized) return fallback;
  return Number.parseInt(sanitized, 10);
}

function normalizeCostForm(form) {
  return {
    ...form,
    baseCreditCost: Math.max(0, parseWholeNumberInput(form.baseCreditCost, 0)),
    unitCreditCost: Math.max(0, parseWholeNumberInput(form.unitCreditCost, 0)),
    unitSize: Math.max(1, parseWholeNumberInput(form.unitSize, 1)),
  };
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

function DefaultModelCell({ policy, modelsById, isDarkMode, t }) {
  const modelId = policy?.defaultModelId;
  const model = modelId != null ? modelsById?.get(String(modelId)) : null;

  if (!model) {
    return (
      <span className={`text-xs italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        {t('aiActionPolicy.defaultModelUnset')}
      </span>
    );
  }

  return (
    <div className="min-w-0 space-y-0.5">
      <p className={`truncate text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
        {model.displayName || model.modelCode}
      </p>
      <p className={`truncate text-[11px] uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
        {model.provider}
      </p>
    </div>
  );
}

function PolicyTableSection({ title, policies, isDarkMode, canWrite, onEdit, t, modelsById }) {
  const columnWidths = canWrite
    ? {
      action: '20%',
      costMode: '11%',
      formula: '34%',
      defaultModel: '15%',
      status: '10%',
      actions: '10%',
    }
    : {
      action: '22%',
      costMode: '11%',
      formula: '42%',
      defaultModel: '15%',
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
            <col style={{ width: columnWidths.defaultModel }} />
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
                {t('aiActionPolicy.colDefaultModel')}
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
                    <DefaultModelCell policy={policy} modelsById={modelsById} isDarkMode={isDarkMode} t={t} />
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
  const [models, setModels] = useState([]);
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
      const [policiesRes, modelsRes] = await Promise.all([
        getAllAiActionPolicies(),
        getAiModels({ status: 'ACTIVE' }).catch(() => null),
      ]);
      setPolicies(extractData(policiesRes) || []);
      const modelList = (extractData(modelsRes) || []).map(normalizeAiModel);
      setModels(filterSupportedAiModels(modelList));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const modelsById = new Map(models.map((m) => [String(m.id), m]));
  const editableModels = editPolicy ? filterAiModelsForAction(editPolicy.actionKey, models) : [];

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
      baseCreditCost: String(policy.baseCreditCost ?? 0),
      unitCreditCost: String(policy.unitCreditCost ?? 0),
      unitSize: String(policy.unitSize ?? 1),
      isActive: policy.isActive ?? true,
      description: policy.description || '',
      defaultModelId: policy.defaultModelId != null ? String(policy.defaultModelId) : '',
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
      const normalizedForm = {
        ...normalizeCostForm(form),
        defaultModelId: form.defaultModelId ? Number(form.defaultModelId) : null,
      };
      const res = await updateAiActionPolicy(editPolicy.actionKey, normalizedForm);
      const updated = extractData(res);

      setPolicies((prev) => prev.map((policy) => (
        policy.actionKey === editPolicy.actionKey
          ? { ...policy, ...normalizedForm, ...(updated || {}) }
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

  const handleWholeNumberChange = (field) => (event) => {
    const nextValue = sanitizeWholeNumberInput(event.target.value);
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const previewPolicy = editPolicy ? { ...editPolicy, ...normalizeCostForm(form) } : null;
  const editLabels = editPolicy ? getActionLabels(editPolicy.actionKey, t) : null;

  return (
    <SuperAdminPage className={`${fontClass} ${dk ? 'text-white' : 'text-gray-900'}`}>
      <SuperAdminPageHeader
        title={t('aiActionPolicy.title')}
        actions={(
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPolicies}
            disabled={loading}
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('aiActionPolicy.refresh')}
          </Button>
        )}
      />

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
              modelsById={modelsById}
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
              modelsById={modelsById}
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
              modelsById={modelsById}
            />
          )}
        </div>
      )}

      <AiActionPolicyEditDialog
        open={editOpen}
        onOpenChange={closeEdit}
        editPolicy={editPolicy}
        form={form}
        setForm={setForm}
        editLabels={editLabels}
        previewPolicy={previewPolicy}
        editableModels={editableModels}
        saving={saving}
        onSave={handleSave}
        onWholeNumberChange={handleWholeNumberChange}
        costModeOptions={COST_MODE_OPTIONS}
        isDarkMode={dk}
        t={t}
      />
    </SuperAdminPage>
  );
}
