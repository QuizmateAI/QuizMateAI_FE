import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  deletePlanAiModelOverride,
  getAiModels,
  getAllAiActionPolicies,
  getPlanAiModelOverrides,
  getPlansLite,
  upsertPlanAiModelOverride,
} from '@/api/ManagementSystemAPI';
import {
  AI_ACTION_OPTIONS,
  filterModelsForAction,
  filterSupportedAiModels,
  getAiActionLabel,
  getAiModelGroupLabel,
  getModelGroupsForAction,
} from '@/lib/aiModelCatalog';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from './Components/SuperAdminSurface';

const EMPTY_ADD_FORM = {
  actionKey: '',
  modelGroup: '',
  modelId: '',
};
const PLAN_OVERRIDE_READ_ONLY = true;

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function makeOverrideKey(actionKey, modelGroup) {
  return `${actionKey ?? ''}::${modelGroup ?? ''}`;
}

function buildPlanLabel(plan) {
  if (!plan) return '';
  const name = plan.displayName || plan.code || `#${plan.id}`;
  return plan.code && plan.code !== name ? `${name} (${plan.code})` : name;
}

function normalizePlan(plan) {
  const id = plan?.id ?? plan?.planCatalogId;
  return id == null ? plan : { ...plan, id };
}

function normalizeModel(model) {
  const id = model?.id ?? model?.aiModelId;
  return id == null ? model : { ...model, id };
}

export default function AiModelPlanOverrides() {
  const { t } = useTranslation();
  const { isDarkMode: dk } = useDarkMode();
  const { showSuccess, showError } = useToast();

  const [plans, setPlans] = useState([]);
  const [models, setModels] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [overrides, setOverrides] = useState([]);

  const [bootLoading, setBootLoading] = useState(true);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [error, setError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [saving, setSaving] = useState(false);

  const fetchBoot = async () => {
    setBootLoading(true);
    setError('');
    try {
      const [plansRes, modelsRes, policiesRes] = await Promise.all([
        getPlansLite(),
        getAiModels({ status: 'ACTIVE' }),
        getAllAiActionPolicies(),
      ]);
      const planList = (extractData(plansRes) || []).map(normalizePlan);
      const modelList = (extractData(modelsRes) || []).map(normalizeModel);
      setPlans(planList);
      setModels(filterSupportedAiModels(modelList));
      setPolicies(extractData(policiesRes) || []);
      if (planList.length > 0 && !selectedPlanId) {
        setSelectedPlanId(String(planList[0].id));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBootLoading(false);
    }
  };

  const fetchOverrides = async (planId) => {
    if (!planId) return;
    setOverrideLoading(true);
    setError('');
    try {
      const res = await getPlanAiModelOverrides(planId);
      setOverrides(extractData(res) || []);
    } catch (err) {
      setError(getErrorMessage(err));
      setOverrides([]);
    } finally {
      setOverrideLoading(false);
    }
  };

  useEffect(() => {
    fetchBoot();
  }, []);

  useEffect(() => {
    fetchOverrides(selectedPlanId);
  }, [selectedPlanId]);

  const modelsById = useMemo(
    () => new Map(models.map((m) => [String(m.id), m])),
    [models],
  );

  const policiesByAction = useMemo(
    () => new Map(policies.map((p) => [p.actionKey, p])),
    [policies],
  );

  const overrideKeys = useMemo(
    () => new Set(overrides.map((o) => makeOverrideKey(o.actionKey, o.modelGroup))),
    [overrides],
  );

  const groupChoices = useMemo(() => {
    return addForm.actionKey ? getModelGroupsForAction(addForm.actionKey) : [];
  }, [addForm.actionKey]);

  const modelChoices = useMemo(() => {
    if (!addForm.actionKey || !addForm.modelGroup) return [];
    return filterModelsForAction(models, addForm.actionKey, addForm.modelGroup);
  }, [addForm.actionKey, addForm.modelGroup, models]);

  const duplicateKey = addForm.actionKey && addForm.modelGroup
    ? makeOverrideKey(addForm.actionKey, addForm.modelGroup)
    : null;
  const isDuplicateOverride = Boolean(duplicateKey && overrideKeys.has(duplicateKey));

  const canSubmitAdd = Boolean(addForm.actionKey && addForm.modelGroup && addForm.modelId) && !isDuplicateOverride;

  const openAdd = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddOpen(true);
  };

  const closeAdd = (open) => {
    setAddOpen(open);
    if (!open) setAddForm(EMPTY_ADD_FORM);
  };

  const onPickAction = (actionKey) => {
    const groups = getModelGroupsForAction(actionKey);
    setAddForm((prev) => ({
      ...prev,
      actionKey,
      modelGroup: groups.length === 1 ? groups[0] : '',
      modelId: '',
    }));
  };

  const onPickGroup = (modelGroup) => {
    setAddForm((prev) => ({ ...prev, modelGroup, modelId: '' }));
  };

  const handleAddSubmit = async () => {
    if (!selectedPlanId || !canSubmitAdd) return;
    setSaving(true);
    try {
      await upsertPlanAiModelOverride(selectedPlanId, {
        actionKey: addForm.actionKey,
        modelGroup: addForm.modelGroup,
        modelId: Number(addForm.modelId),
      });
      showSuccess(t('aiPlanOverride.addSuccess'));
      closeAdd(false);
      await fetchOverrides(selectedPlanId);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (override) => {
    if (!selectedPlanId) return;
    try {
      await deletePlanAiModelOverride(selectedPlanId, override.actionKey, override.modelGroup);
      showSuccess(t('aiPlanOverride.resetSuccess'));
      await fetchOverrides(selectedPlanId);
    } catch (err) {
      showError(getErrorMessage(err));
    }
  };

  const selectedPlan = plans.find((p) => String(p.id) === selectedPlanId) || null;

  return (
    <SuperAdminPage className={dk ? 'text-white' : 'text-gray-900'}>
      <SuperAdminPageHeader
        title={t('aiPlanOverride.title')}
        description={t('aiPlanOverride.subtitle')}
        actions={(
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOverrides(selectedPlanId)}
            disabled={!selectedPlanId || overrideLoading}
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${overrideLoading ? 'animate-spin' : ''}`} />
            {t('aiPlanOverride.refresh')}
          </Button>
        )}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        dk ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}>
        {t(
          'aiPlanOverride.readOnlyNotice',
          'AI model configuration has moved into the plan create/edit wizard. This screen is read-only for legacy override review.'
        )}
      </div>

      <div className={`rounded-xl border p-4 ${dk ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <Label className={`text-xs font-semibold uppercase tracking-wide ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('aiPlanOverride.selectPlan')}
        </Label>
        <select
          value={selectedPlanId}
          onChange={(event) => setSelectedPlanId(event.target.value)}
          disabled={bootLoading}
          className={`mt-2 h-10 w-full max-w-md rounded-lg border px-3 text-sm ${
            dk ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-white text-gray-900'
          }`}
        >
          {plans.length === 0 && (
            <option value="">{t('aiPlanOverride.noPlans')}</option>
          )}
          {plans.map((plan) => (
            <option key={plan.id} value={String(plan.id)}>
              {buildPlanLabel(plan)}
            </option>
          ))}
        </select>
      </div>

      <div className={`mt-4 overflow-hidden rounded-xl border ${dk ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${dk ? 'border-slate-800' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-sm font-semibold ${dk ? 'text-slate-200' : 'text-gray-800'}`}>
              {t('aiPlanOverride.tableTitle')}
            </h2>
            {selectedPlan && (
              <p className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-500'}`}>
                {t('aiPlanOverride.tableSubtitle', { plan: buildPlanLabel(selectedPlan) })}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={openAdd}
            disabled={PLAN_OVERRIDE_READ_ONLY || !selectedPlanId || bootLoading}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('aiPlanOverride.addOverride')}
          </Button>
        </div>

        {bootLoading || overrideLoading ? (
          <div className="flex justify-center py-16">
            <ListSpinner />
          </div>
        ) : !selectedPlanId ? (
          <div className={`py-16 text-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('aiPlanOverride.noPlanSelected')}
          </div>
        ) : overrides.length === 0 ? (
          <div className={`py-16 text-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('aiPlanOverride.empty')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={dk ? 'border-slate-800 bg-slate-800/60' : 'bg-gray-50'}>
                <TableHead className={dk ? 'text-slate-300' : 'text-gray-700'}>
                  {t('aiPlanOverride.colAction')}
                </TableHead>
                <TableHead className={dk ? 'text-slate-300' : 'text-gray-700'}>
                  {t('aiPlanOverride.colModelGroup')}
                </TableHead>
                <TableHead className={dk ? 'text-slate-300' : 'text-gray-700'}>
                  {t('aiPlanOverride.colModel')}
                </TableHead>
                <TableHead className={dk ? 'text-slate-300' : 'text-gray-700'}>
                  {t('aiPlanOverride.colDefaultFallback')}
                </TableHead>
                <TableHead className="w-[120px] text-center">
                  {t('aiPlanOverride.colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((override) => {
                const overrideModel = modelsById.get(String(override.modelId));
                const policy = override.actionKey ? policiesByAction.get(override.actionKey) : null;
                const fallbackModel = policy?.defaultModelId != null
                  ? modelsById.get(String(policy.defaultModelId))
                  : null;
                return (
                  <TableRow
                    key={makeOverrideKey(override.actionKey, override.modelGroup)}
                    className={dk ? 'border-slate-800' : ''}
                  >
                    <TableCell className="py-3">
                      <p className={`text-sm font-medium ${dk ? 'text-slate-100' : 'text-gray-900'}`}>
                        {getAiActionLabel(override.actionKey, t)}
                      </p>
                      <code className={`text-[11px] ${dk ? 'text-slate-500' : 'text-gray-500'}`}>
                        {override.actionKey}
                      </code>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {getAiModelGroupLabel(override.modelGroup, t)}
                    </TableCell>
                    <TableCell className="py-3">
                      {overrideModel ? (
                        <div>
                          <p className={`text-sm font-medium ${dk ? 'text-slate-100' : 'text-gray-900'}`}>
                            {overrideModel.displayName || overrideModel.modelCode}
                          </p>
                          <p className={`text-[11px] ${dk ? 'text-slate-500' : 'text-gray-500'}`}>
                            {overrideModel.provider}
                          </p>
                        </div>
                      ) : (
                        <span className={`text-xs italic ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                          {t('aiPlanOverride.modelMissing', { id: override.modelId })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {fallbackModel ? (
                        <span className={dk ? 'text-slate-300' : 'text-gray-600'}>
                          {fallbackModel.displayName || fallbackModel.modelCode}
                        </span>
                      ) : (
                        <span className={`italic ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                          {t('aiPlanOverride.noFallback')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(override)}
                        disabled={PLAN_OVERRIDE_READ_ONLY}
                        title={t('aiPlanOverride.reset')}
                        className={dk ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t('aiPlanOverride.reset')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={closeAdd}>
        <DialogContent className={dk ? 'border-slate-800 bg-slate-900 text-white sm:max-w-lg' : 'sm:max-w-lg'}>
          <DialogHeader>
            <DialogTitle>{t('aiPlanOverride.addDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('aiPlanOverride.addDialogDescription', { plan: buildPlanLabel(selectedPlan) })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className={dk ? 'text-slate-300' : ''}>
                {t('aiPlanOverride.formAction')}
              </Label>
              <select
                value={addForm.actionKey}
                onChange={(event) => onPickAction(event.target.value)}
                className={`h-10 w-full rounded-lg border px-3 text-sm ${
                  dk ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <option value="">{t('aiPlanOverride.formActionPlaceholder')}</option>
                {AI_ACTION_OPTIONS.map((actionKey) => (
                  <option key={actionKey} value={actionKey}>
                    {getAiActionLabel(actionKey, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={dk ? 'text-slate-300' : ''}>
                {t('aiPlanOverride.formModelGroup')}
              </Label>
              <select
                value={addForm.modelGroup}
                onChange={(event) => onPickGroup(event.target.value)}
                disabled={!addForm.actionKey}
                className={`h-10 w-full rounded-lg border px-3 text-sm ${
                  dk ? 'border-slate-700 bg-slate-800 text-white disabled:bg-slate-900' : 'border-gray-200 bg-white text-gray-900 disabled:bg-gray-50'
                }`}
              >
                <option value="">{t('aiPlanOverride.formModelGroupPlaceholder')}</option>
                {groupChoices.map((group) => (
                  <option key={group} value={group}>
                    {getAiModelGroupLabel(group, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={dk ? 'text-slate-300' : ''}>
                {t('aiPlanOverride.formModel')}
              </Label>
              <select
                value={addForm.modelId}
                onChange={(event) => setAddForm((prev) => ({ ...prev, modelId: event.target.value }))}
                disabled={!addForm.modelGroup || modelChoices.length === 0}
                className={`h-10 w-full rounded-lg border px-3 text-sm ${
                  dk ? 'border-slate-700 bg-slate-800 text-white disabled:bg-slate-900' : 'border-gray-200 bg-white text-gray-900 disabled:bg-gray-50'
                }`}
              >
                <option value="">
                  {modelChoices.length === 0 && addForm.modelGroup
                    ? t('aiPlanOverride.formModelEmpty')
                    : t('aiPlanOverride.formModelPlaceholder')}
                </option>
                {modelChoices.map((model) => (
                  <option key={model.id} value={String(model.id)}>
                    {`${model.displayName || model.modelCode} (${model.provider})`}
                  </option>
                ))}
              </select>
            </div>

            {isDuplicateOverride && (
              <p className="text-xs text-rose-500">
                {t('aiPlanOverride.duplicate')}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => closeAdd(false)}
              disabled={saving}
              className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              <X className="mr-1 h-4 w-4" />
              {t('aiPlanOverride.cancel')}
            </Button>
            <Button onClick={handleAddSubmit} disabled={saving || !canSubmitAdd}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? t('aiPlanOverride.saving') : t('aiPlanOverride.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
