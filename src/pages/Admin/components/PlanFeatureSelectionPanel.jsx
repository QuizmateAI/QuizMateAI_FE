import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  getAiActionLabel,
  normalizeAiFeatureCatalog,
} from '@/lib/aiModelCatalog';

const ROADMAP_ENTITLEMENT_KEY = 'canCreateRoadMap';

const MATERIAL_ENTITLEMENT_KEYS = new Set([
  'canProcessText',
  'canProcessPdf',
  'canProcessWord',
  'canProcessSlide',
  'canProcessExcel',
  'canProcessImage',
  'canProcessAudio',
  'canProcessVideo',
]);

function isInherited(entitlementKey, hasGroupInheritance, highestActiveUserPlanEntitlement) {
  return Boolean(hasGroupInheritance && highestActiveUserPlanEntitlement?.[entitlementKey] === true);
}

function PlanFeatureSelectionPanel({
  aiFeatureCatalog,
  enabledFeatures,
  entitlement,
  entitlementToggles,
  hasGroupInheritance,
  highestActiveUserPlanEntitlement,
  isDarkMode,
  mutedCls,
  setEntitlement,
  t,
}) {
  const catalog = normalizeAiFeatureCatalog(aiFeatureCatalog);
  const coreFeatures = catalog.filter((item) => item.category === 'CORE');
  const advancedFeatureGroups = catalog
    .filter((item) => item.category === 'ADVANCED' && item.entitlementKey)
    .reduce((acc, item) => {
      if (!acc[item.entitlementKey]) acc[item.entitlementKey] = [];
      acc[item.entitlementKey].push(item);
      return acc;
    }, {});
  const advancedFeatureEntries = Object.entries(advancedFeatureGroups);
  const aiFeatureEntries = advancedFeatureEntries
    .filter(([key]) => !MATERIAL_ENTITLEMENT_KEYS.has(key));
  const materialFeatureEntries = advancedFeatureEntries
    .filter(([key]) => MATERIAL_ENTITLEMENT_KEYS.has(key));
  const aiEntitlementKeys = new Set(Object.keys(advancedFeatureGroups));
  const systemFeatureEntries = Object.entries(entitlementToggles)
    .filter(([key]) => !aiEntitlementKeys.has(key));

  const setAllFeatures = (value) => {
    setEntitlement((prev) => {
      const next = { ...prev };
      Object.keys(entitlementToggles).forEach((key) => {
        if (!value && isInherited(key, hasGroupInheritance, highestActiveUserPlanEntitlement)) return;
        next[key] = value;
      });
      return next;
    });
  };

  const renderToggle = (key, meta, description) => {
    const checked = Boolean(entitlement[key]);
    const inheritedFromUser = isInherited(key, hasGroupInheritance, highestActiveUserPlanEntitlement);
    const Icon = meta?.icon ?? ShieldCheck;
    const label = t(meta?.labelKey, meta?.defaultLabel ?? key);

    return (
      <label
        key={key}
        className={cn(
          'flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors',
          inheritedFromUser ? 'cursor-not-allowed' : 'cursor-pointer',
          checked
            ? isDarkMode
              ? 'border-blue-400/20 bg-blue-500/10'
              : 'border-blue-200 bg-blue-50'
            : isDarkMode
              ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
              : 'border-slate-200 bg-white hover:bg-slate-50'
        )}
      >
        <Switch
          aria-label={label}
          checked={checked}
          disabled={inheritedFromUser}
          onCheckedChange={(value) => setEntitlement((prev) => ({ ...prev, [key]: value }))}
        />
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            checked
              ? isDarkMode
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-blue-100 text-blue-600'
              : isDarkMode
                ? 'bg-slate-900/70 text-slate-500'
                : 'bg-slate-100 text-slate-500'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('text-sm font-semibold', checked ? (isDarkMode ? 'text-white' : 'text-slate-900') : mutedCls)}>
              {label}
            </p>
            {inheritedFromUser ? (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700')}>
                {t('subscription.wizard.features.inherited', 'Inherited')}
              </span>
            ) : null}
          </div>
          <p className={cn('mt-1 text-xs leading-5', checked ? (isDarkMode ? 'text-blue-100/80' : 'text-blue-700/80') : mutedCls)}>
            {description ?? (checked
              ? t('subscription.wizard.entitlement.enabledState', 'Enabled for this plan.')
              : t('subscription.wizard.entitlement.disabledState', 'Disabled.'))}
          </p>
        </div>
      </label>
    );
  };

  const getFeatureGroupDescription = (key, actions) => {
    if (key === ROADMAP_ENTITLEMENT_KEY) {
      return t('subscription.wizard.features.descriptions.createRoadmap', 'Create roadmap');
    }
    return actions.map((item) => getAiActionLabel(item.actionKey, t)).join(', ');
  };

  const renderFeatureGroupToggle = ([key, actions]) => {
    const meta = entitlementToggles[key] ?? { defaultLabel: key };
    return renderToggle(key, meta, getFeatureGroupDescription(key, actions));
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {t('subscription.wizard.features.title', 'Features')}
          </p>
          <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
            {enabledFeatures.length > 0
              ? t('subscription.wizard.entitlement.enabledCount', {
                count: enabledFeatures.length,
                defaultValue: '{{count}} features enabled.',
              })
              : t('subscription.wizard.entitlement.noneEnabled', 'No capabilities enabled for this plan yet.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllFeatures(true)}
            className={cn('rounded-full cursor-pointer', isDarkMode ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50')}
          >
            {t('subscription.wizard.entitlement.enableAll', 'Enable all')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllFeatures(false)}
            className={cn('rounded-full cursor-pointer', isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/[0.05]' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            {t('subscription.wizard.entitlement.disableAll', 'Disable all')}
          </Button>
        </div>
      </div>

      {hasGroupInheritance ? (
        <div className={cn('rounded-2xl border px-4 py-3 text-sm', isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
          Gói group tự động kế thừa toàn bộ quyền lợi từ gói cá nhân cao nhất đang active. Các feature kế thừa không thể tắt.
        </div>
      ) : null}

      <div className={cn('rounded-2xl border p-4', isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50')}>
        <div className="flex items-center gap-2">
          <Lock className={cn('h-4 w-4', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {t('subscription.wizard.features.coreTitle', 'Core AI')}
          </p>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700')}>
            {t('subscription.wizard.features.lockedOn', 'Locked on')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {coreFeatures.map((feature) => (
            <span key={feature.actionKey} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700')}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {getAiActionLabel(feature.actionKey, t)}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className={cn('mb-3 text-xs font-semibold uppercase tracking-[0.08em]', mutedCls)}>
          {t('subscription.wizard.features.advancedTitle', 'Advanced AI')}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {aiFeatureEntries.map(renderFeatureGroupToggle)}
        </div>
      </div>

      {materialFeatureEntries.length > 0 ? (
        <div>
          <p className={cn('mb-3 text-xs font-semibold uppercase tracking-[0.08em]', mutedCls)}>
            {t('subscription.wizard.features.materialTitle', 'Material')}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {materialFeatureEntries.map(renderFeatureGroupToggle)}
          </div>
        </div>
      ) : null}

      {systemFeatureEntries.length > 0 ? (
        <div>
          <p className={cn('mb-3 text-xs font-semibold uppercase tracking-[0.08em]', mutedCls)}>
            {t('subscription.wizard.features.systemTitle', 'System features')}
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {systemFeatureEntries.map(([key, meta]) => renderToggle(key, meta))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PlanFeatureSelectionPanel;
