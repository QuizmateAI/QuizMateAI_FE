import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Save, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/context/ToastContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { cn } from '@/lib/utils';
import {
  getAiModels,
  getAllSystemSettings,
  updateSystemSetting,
} from '@/api/ManagementSystemAPI';

const SETTING_KEY = 'system.analysis.ai_model_id';
const AI_MODELS_QUERY_KEY = ['superadmin', 'ai-models', 'openai-active'];
const SYSTEM_SETTINGS_QUERY_KEY = ['admin', 'systemSettings'];

const AFFECTED_ACTIONS = [
  'ANALYZE_STUDY_PROFILE_KNOWLEDGE',
  'SUGGEST_STUDY_PROFILE_FIELDS',
  'VALIDATE_STUDY_PROFILE_CONSISTENCY',
  'SUGGEST_WORKSPACE_NAME',
];

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

export default function SystemAnalysisModelPanel({ isDarkMode }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const queryClient = useQueryClient();
  const dk = isDarkMode;
  const canWrite = !permLoading && permissions.has('system-settings:write');

  const modelsQuery = useQuery({
    queryKey: AI_MODELS_QUERY_KEY,
    queryFn: async () => {
      const response = await getAiModels({ provider: 'OPENAI', status: 'ACTIVE' });
      const list = extractData(response);
      return Array.isArray(list) ? list : [];
    },
    staleTime: 30_000,
  });

  const settingsQuery = useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await getAllSystemSettings();
      const list = extractData(response);
      return Array.isArray(list) ? list : [];
    },
  });

  const persistedSetting = useMemo(() => {
    if (!Array.isArray(settingsQuery.data)) return null;
    return settingsQuery.data.find((item) => item?.key === SETTING_KEY) || null;
  }, [settingsQuery.data]);

  const persistedModelId = persistedSetting?.value ? String(persistedSetting.value) : '0';

  const [draftModelId, setDraftModelId] = useState(persistedModelId);

  useEffect(() => {
    setDraftModelId(persistedModelId);
  }, [persistedModelId]);

  const models = Array.isArray(modelsQuery.data) ? modelsQuery.data : [];

  const persistedModel = useMemo(() => {
    if (persistedModelId === '0') return null;
    return models.find((model) => String(model.aiModelId) === persistedModelId) || null;
  }, [models, persistedModelId]);

  const updateMutation = useMutation({
    mutationFn: (modelId) => updateSystemSetting(SETTING_KEY, { value: String(modelId) }),
    onSuccess: () => {
      showSuccess(t('aiModels.systemAnalysis.updateSuccess', 'Cập nhật model phân tích hệ thống thành công.'));
      queryClient.invalidateQueries({ queryKey: SYSTEM_SETTINGS_QUERY_KEY });
    },
    onError: (error) => {
      showError(getErrorMessage(t, error));
    },
  });

  const isDirty = draftModelId !== persistedModelId;
  const saving = updateMutation.isPending;
  const loading = modelsQuery.isLoading || settingsQuery.isLoading;

  const panelClass = dk
    ? 'border-slate-800 bg-slate-900/95'
    : 'border-slate-200 bg-white shadow-sm';
  const subtleClass = dk
    ? 'border-slate-800 bg-slate-950/70 text-slate-300'
    : 'border-slate-200 bg-slate-50/80 text-slate-700';
  const fieldClass = dk
    ? 'border-slate-700 bg-slate-950 text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const mutedClass = dk ? 'text-slate-400' : 'text-slate-500';
  const strongClass = dk ? 'text-white' : 'text-slate-900';

  return (
    <section className={cn('overflow-hidden rounded-2xl border', panelClass)}>
      <div className={cn('flex flex-wrap items-start gap-4 border-b px-5 py-5', dk ? 'border-slate-800' : 'border-slate-200')}>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', dk ? 'border border-violet-500/20 bg-violet-500/10 text-violet-300' : 'bg-violet-100 text-violet-700')}>
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className={cn('text-lg font-bold', strongClass)}>
            {t('aiModels.systemAnalysis.title', 'Model AI cho phân tích hệ thống')}
          </h3>
          <p className={cn('text-sm leading-6', mutedClass)}>
            {t(
              'aiModels.systemAnalysis.subtitle',
              'Chọn 1 model OpenAI dùng chung cho các tính năng phân tích nội bộ. Đổi model sẽ áp dụng tức thì cho toàn hệ thống.'
            )}
          </p>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className={cn('rounded-xl border px-4 py-4', subtleClass)}>
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedClass)}>
            {t('aiModels.systemAnalysis.affectedActions', 'Áp dụng cho các tính năng')}
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {AFFECTED_ACTIONS.map((action) => (
              <li key={action} className="flex items-start gap-2">
                <span className={cn('mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full', dk ? 'bg-violet-400' : 'bg-violet-500')} />
                <span>{t(`aiModels.systemAnalysis.actions.${action}`, action)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label className={cn('text-sm font-semibold', strongClass)}>
              {t('aiModels.systemAnalysis.modelLabel', 'Model OpenAI áp dụng')}
            </Label>
            <select
              value={draftModelId}
              disabled={!canWrite || loading || saving}
              onChange={(event) => setDraftModelId(event.target.value)}
              className={cn(
                'h-11 w-full rounded-lg border px-3 text-sm focus:outline-none disabled:opacity-50',
                fieldClass
              )}
            >
              <option value="0">
                {t('aiModels.systemAnalysis.notConfigured', '— Chưa cấu hình (fallback theo plan) —')}
              </option>
              {models.map((model) => (
                <option key={model.aiModelId} value={String(model.aiModelId)}>
                  {model.displayName} ({model.modelCode})
                </option>
              ))}
            </select>
            {modelsQuery.error && (
              <p className="text-xs text-rose-500">{getErrorMessage(t, modelsQuery.error)}</p>
            )}
            {!loading && models.length === 0 && (
              <p className={cn('text-xs', mutedClass)}>
                {t('aiModels.systemAnalysis.noOpenAiActive', 'Không có model OpenAI nào đang ACTIVE. Thêm hoặc kích hoạt model trước.')}
              </p>
            )}
          </div>

          <div className={cn('rounded-xl border px-4 py-4', subtleClass)}>
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedClass)}>
              {t('aiModels.systemAnalysis.currentLabel', 'Model đang dùng')}
            </p>
            {persistedModel ? (
              <div className="mt-2 space-y-1">
                <p className={cn('text-sm font-semibold', strongClass)}>{persistedModel.displayName}</p>
                <p className={cn('font-mono text-xs', mutedClass)}>
                  {persistedModel.provider} / {persistedModel.modelCode}
                </p>
              </div>
            ) : (
              <div className="mt-2 flex items-start gap-2 text-sm">
                <ShieldAlert className={cn('mt-0.5 h-4 w-4 shrink-0', dk ? 'text-amber-400' : 'text-amber-600')} />
                <span className={mutedClass}>
                  {t('aiModels.systemAnalysis.fallbackNotice', 'Chưa cấu hình – hệ thống đang resolve theo plan của user.')}
                </span>
              </div>
            )}
          </div>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDraftModelId(persistedModelId)}
              disabled={!isDirty || saving}
              className={cn(
                'rounded-lg',
                dk ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
              )}
            >
              {t('aiModels.systemAnalysis.reset', 'Đặt lại')}
            </Button>
            <Button
              onClick={() => updateMutation.mutate(draftModelId)}
              disabled={!isDirty || saving || loading}
              className="rounded-lg bg-[#0455BF] text-white hover:bg-[#03449a]"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? t('aiModels.systemAnalysis.saving', 'Đang lưu...')
                : t('aiModels.systemAnalysis.save', 'Lưu cấu hình')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
