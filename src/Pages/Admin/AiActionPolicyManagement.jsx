import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Save, X, Cpu,
  FileText, Image, Type, FileSpreadsheet, Presentation, Headphones, Video,
  BrainCircuit, Layers, ClipboardCheck, Map,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { getAllAiActionPolicies, updateAiActionPolicy } from '@/api/ManagementSystemAPI';

const ACTION_META = {
  GENERATE_QUIZ:                   { icon: ClipboardCheck, color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-950/40',     category: 'generate', i18nKey: 'generateQuiz' },
  GENERATE_FLASHCARDS:             { icon: Layers,         color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-950/40',   category: 'generate', i18nKey: 'generateFlashcards' },
  GENERATE_MOCK_TEST:              { icon: BrainCircuit,   color: 'text-purple-500',  bg: 'bg-purple-100 dark:bg-purple-950/40', category: 'generate', i18nKey: 'generateMockTest' },
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: { icon: Map,            color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40', category: 'generate', i18nKey: 'generateRoadmapQuiz' },
  PROCESS_PDF:                     { icon: FileText,       color: 'text-red-500',     bg: 'bg-red-100 dark:bg-red-950/40',       category: 'process', i18nKey: 'processPdf' },
  PROCESS_IMAGE:                   { icon: Image,          color: 'text-pink-500',    bg: 'bg-pink-100 dark:bg-pink-950/40',     category: 'process', i18nKey: 'processImage' },
  PROCESS_TEXT:                    { icon: Type,            color: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800',        category: 'process', i18nKey: 'processText' },
  PROCESS_DOCX:                    { icon: FileText,       color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-950/40',     category: 'process', i18nKey: 'processDocx' },
  PROCESS_XLSX:                    { icon: FileSpreadsheet, color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-950/40',   category: 'process', i18nKey: 'processXlsx' },
  PROCESS_PPTX:                    { icon: Presentation,   color: 'text-orange-500',  bg: 'bg-orange-100 dark:bg-orange-950/40', category: 'process', i18nKey: 'processPptx' },
  PROCESS_AUDIO:                   { icon: Headphones,     color: 'text-violet-500',  bg: 'bg-violet-100 dark:bg-violet-950/40', category: 'process', i18nKey: 'processAudio' },
  PROCESS_VIDEO:                   { icon: Video,          color: 'text-cyan-500',    bg: 'bg-cyan-100 dark:bg-cyan-950/40',     category: 'process', i18nKey: 'processVideo' },
};

function getActionLabels(actionKey, t) {
  const meta = ACTION_META[actionKey];
  const key = meta?.i18nKey || actionKey;
  const prefix = `aiActionPolicy.actions.${key}`;
  return {
    title: t(`${prefix}.title`, ''),
    description: t(`${prefix}.description`, ''),
    baseCostLabel: t(`${prefix}.baseCost`, t('aiActionPolicy.baseCost')),
    unitCostLabel: t(`${prefix}.unitCost`, t('aiActionPolicy.unitCost')),
    unitSizeLabel: t(`${prefix}.unitSize`, t('aiActionPolicy.unitSize')),
  };
}

const COST_MODE_OPTIONS = ['FIXED', 'PER_QUESTION', 'PER_ITEM', 'PER_PAGE', 'PER_WORD', 'PER_CELL', 'PER_SECOND'];

function extractData(res) {
  return res?.data?.data ?? res?.data ?? res ?? null;
}

function CostModeLabel({ costMode, t }) {
  const key = `aiActionPolicy.costMode.${costMode}`;
  return <span>{t(key, costMode)}</span>;
}

function CostFormulaDisplay({ policy, isDarkMode, t, labels }) {
  const dk = isDarkMode;
  const isFixed = policy.costMode === 'FIXED';
  const unitLabel = t(`aiActionPolicy.costModeUnit.${policy.costMode}`, policy.costMode);

  if (isFixed) {
    return (
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{t('aiActionPolicy.formulaResult')}</span>
        <span className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{policy.baseCreditCost}</span>
        <span className={`text-sm font-semibold ${dk ? 'text-amber-400' : 'text-amber-600'}`}>QMC</span>
        <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>({t('aiActionPolicy.formulaFixedNote')})</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Formula line */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{t('aiActionPolicy.formulaResult')}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-sm ${dk ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'}`}>
          {policy.baseCreditCost}
        </span>
        <span className={`text-sm font-bold ${dk ? 'text-slate-400' : 'text-gray-400'}`}>+</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-sm ${dk ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
          {policy.unitCreditCost}
        </span>
        <span className={`text-sm font-bold ${dk ? 'text-slate-400' : 'text-gray-400'}`}>&times;</span>
        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>⌈</span>
        <span className={`text-sm italic ${dk ? 'text-blue-400' : 'text-blue-600'}`}>{unitLabel}</span>
        <span className={`text-sm font-bold ${dk ? 'text-slate-400' : 'text-gray-400'}`}>/</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-sm ${dk ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
          {policy.unitSize}
        </span>
        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>⌉</span>
        <span className={`text-sm font-semibold ${dk ? 'text-amber-400' : 'text-amber-600'}`}>QMC</span>
      </div>

      {/* Human-readable summary */}
      <p className={`text-xs leading-relaxed ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
        {t('aiActionPolicy.formulaSummary', {
          base: policy.baseCreditCost,
          unit: policy.unitCreditCost,
          size: policy.unitSize,
          mode: unitLabel,
        })}
      </p>
    </div>
  );
}

function PolicyCard({ policy, isDarkMode, canWrite, onSave, t }) {
  const meta = ACTION_META[policy.actionKey] || { icon: Cpu, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
  const Icon = meta.icon;
  const labels = getActionLabels(policy.actionKey, t);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const startEdit = () => {
    setForm({
      displayName: policy.displayName || '',
      costMode: policy.costMode || 'FIXED',
      baseCreditCost: policy.baseCreditCost ?? 0,
      unitCreditCost: policy.unitCreditCost ?? 0,
      unitSize: policy.unitSize ?? 1,
      isActive: policy.isActive ?? true,
      description: policy.description || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(policy.actionKey, form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const isFixed = editing ? form.costMode === 'FIXED' : policy.costMode === 'FIXED';

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      isDarkMode ? 'bg-slate-900/60 border-slate-700/50 hover:border-slate-600' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
    } ${!policy.isActive && !editing ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${meta.bg}`}>
            <Icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div>
            {editing ? (
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className={`h-8 text-sm font-bold ${isDarkMode ? 'bg-slate-800 text-white' : ''}`}
              />
            ) : (
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {labels.title || policy.displayName}
              </h3>
            )}
            <p className={`text-xs font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {policy.actionKey}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-2">
              <Label className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('aiActionPolicy.active')}
              </Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          ) : (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              policy.isActive
                ? isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                : isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
            }`}>
              {policy.isActive ? t('aiActionPolicy.statusActive') : t('aiActionPolicy.statusInactive')}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {editing ? (
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className={`w-full text-xs rounded-lg border px-3 py-2 mb-4 resize-none ${
            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}
          placeholder={t('aiActionPolicy.descriptionPlaceholder')}
        />
      ) : (
        (labels.description || policy.description) && (
          <p className={`text-xs mb-4 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {labels.description || policy.description}
          </p>
        )
      )}

      {/* Cost formula */}
      <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
        {editing ? (
          <div className="space-y-4">
            <div>
              <Label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('aiActionPolicy.costMode.label')}
              </Label>
              <select
                value={form.costMode}
                onChange={(e) => setForm({ ...form, costMode: e.target.value })}
                className={`w-full h-9 text-sm rounded-lg border px-3 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200'
                }`}
              >
                {COST_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>{t(`aiActionPolicy.costMode.${mode}`, mode)}</option>
                ))}
              </select>
            </div>

            {/* Formula builder */}
            <div className={`rounded-lg border p-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('aiActionPolicy.formula')}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex flex-col items-center">
                  <Input
                    type="number" min={0}
                    value={form.baseCreditCost}
                    onChange={(e) => setForm({ ...form, baseCreditCost: Number(e.target.value) })}
                    className={`h-9 w-24 text-sm text-center font-bold ${isDarkMode ? 'bg-slate-800 text-white' : ''}`}
                  />
                  <span className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>QMC</span>
                </div>

                {form.costMode !== 'FIXED' && (
                  <>
                    <span className={`text-lg font-bold ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>+</span>
                    <div className="flex flex-col items-center">
                      <Input
                        type="number" min={0}
                        value={form.unitCreditCost}
                        onChange={(e) => setForm({ ...form, unitCreditCost: Number(e.target.value) })}
                        className={`h-9 w-24 text-sm text-center font-bold ${isDarkMode ? 'bg-slate-800 text-white' : ''}`}
                      />
                      <span className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>QMC</span>
                    </div>
                    <span className={`text-lg font-bold ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>&times;</span>
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('aiActionPolicy.formulaCeil')}</span>
                    <span className={`text-lg font-bold ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>(</span>
                    <span className={`text-sm italic ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {t(`aiActionPolicy.costModeUnit.${form.costMode}`, form.costMode)}
                    </span>
                    <span className={`text-lg font-bold ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>/</span>
                    <div className="flex flex-col items-center">
                      <Input
                        type="number" min={1}
                        value={form.unitSize}
                        onChange={(e) => setForm({ ...form, unitSize: Number(e.target.value) })}
                        className={`h-9 w-20 text-sm text-center font-bold ${isDarkMode ? 'bg-slate-800 text-white' : ''}`}
                      />
                    </div>
                    <span className={`text-lg font-bold ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>)</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <CostFormulaDisplay policy={policy} isDarkMode={isDarkMode} t={t} labels={labels} />
        )}
      </div>

      {/* Actions */}
      {canWrite && (
        <div className="flex justify-end gap-2 mt-4">
          {editing ? (
            <>
              <Button
                variant="ghost" size="sm"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-1" />
                {t('aiActionPolicy.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? t('aiActionPolicy.saving') : t('aiActionPolicy.save')}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}>
              {t('aiActionPolicy.edit')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiActionPolicyManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const dk = isDarkMode;

  const canWrite = !permLoading && permissions.has('system-settings:write');

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await getAllAiActionPolicies();
      setPolicies(extractData(res) || []);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleSave = async (actionKey, form) => {
    try {
      const res = await updateAiActionPolicy(actionKey, form);
      const updated = extractData(res);
      setPolicies((prev) => prev.map((p) => p.actionKey === actionKey ? { ...p, ...updated } : p));
      showSuccess(t('aiActionPolicy.updateSuccess'));
    } catch (err) {
      showError(getErrorMessage(err));
      throw err;
    }
  };

  const generatePolicies = policies.filter((p) => (ACTION_META[p.actionKey]?.category === 'generate'));
  const processPolicies = policies.filter((p) => (ACTION_META[p.actionKey]?.category === 'process'));

  return (
    <div className="px-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
            {t('aiActionPolicy.title')}
          </h1>
          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('aiActionPolicy.subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPolicies} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {t('aiActionPolicy.refresh')}
        </Button>
      </div>

      {loading ? (
        <ListSpinner />
      ) : (
        <>
          {/* AI Generation */}
          {generatePolicies.length > 0 && (
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('aiActionPolicy.categoryGenerate')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {generatePolicies.map((policy) => (
                  <PolicyCard
                    key={policy.actionKey}
                    policy={policy}
                    isDarkMode={dk}
                    canWrite={canWrite}
                    onSave={handleSave}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* File Processing */}
          {processPolicies.length > 0 && (
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('aiActionPolicy.categoryProcess')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {processPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.actionKey}
                    policy={policy}
                    isDarkMode={dk}
                    canWrite={canWrite}
                    onSave={handleSave}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
