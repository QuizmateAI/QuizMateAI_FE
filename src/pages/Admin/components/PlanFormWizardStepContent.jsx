import {
  Banknote,
  Bot,
  CheckCircle2,
  ChevronRight,
  Coins,
  Layers3,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

function PlanFormWizardStepContent({
  activeStepId,
  AI_MODEL_GROUP_OPTIONS,
  PLAN_LEVEL_OPTIONS,
  assignedModels,
  assignedOverrideCount,
  availableAiModels,
  aiModelAssignments,
  currentCreditPrice,
  currentBasePrice,
  effectiveTotalPrice,
  enabledFeatures,
  entitlement,
  entitlementToggles,
  editingPlan,
  formData,
  getModelById,
  getScopeLabel,
  formatCurrency,
  handleIncludedCreditsChange,
  handleCreditPriceChange,
  handleBasePriceChange,
  hasCustomCreditPrice,
  hasGroupInheritance,
  hasLevelLadderInheritance,
  lowerLevelFloor,
  numericPlanLevel,
  highestActiveUserPlanEntitlement,
  includedCredits,
  inputCls,
  isDarkMode,
  isDefaultPlanLevel,
  isWorkspace,
  locale,
  minPrice,
  mutedCls,
  requireIndividualPlanLimits,
  resolvedPlanLevel,
  sectionCls,
  selectCls,
  selectStyle,
  setAiModelAssignments,
  setEntitlement,
  setFormData,
  showPlanLevel,
  t,
  textareaCls,
  willAutoRaiseCredit,
}) {
  const renderStepHeader = (Icon, title, description, accentClass) => (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg',
          accentClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</h3>
        <p className={cn('mt-1 text-sm leading-6', mutedCls)}>{description}</p>
      </div>
    </div>
  );

  const renderBasicStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          Layers3,
          t('subscription.wizard.basic.title', 'Set up the plan'),
          t('subscription.wizard.basic.description', 'Start by defining the plan identity and scope.'),
          'from-cyan-500 to-blue-600'
        )}

        {editingPlan ? (
          <div
            className={cn(
              'mt-5 rounded-[22px] border px-4 py-3 text-sm',
              isDarkMode ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'
            )}
          >
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t(
                  'subscription.wizard.basic.editingLocked',
                  'Code and scope stay locked while editing to avoid drifting from the active catalog.'
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            {
              value: 'USER',
              title: t('subscription.scope.userPlan', 'User plan'),
              description: t('subscription.scope.userPlanDescription', 'For individual accounts, onboarding, and solo learning flows.'),
              icon: User,
            },
            {
              value: 'WORKSPACE',
              title: t('subscription.scope.workspacePlan', 'Group workspace plan'),
              description: t('subscription.scope.workspacePlanDescription', 'For team workspaces, collaboration, and shared resources.'),
              icon: Users,
            },
          ].map((scopeOption) => {
            const Icon = scopeOption.icon;
            const active = formData.planScope === scopeOption.value;
            return (
              <button
                key={scopeOption.value}
                type="button"
                disabled={Boolean(editingPlan)}
                onClick={() => setFormData((prev) => ({
                  ...prev,
                  planScope: scopeOption.value,
                  planLevel: PLAN_LEVEL_OPTIONS.includes(String(prev.planLevel ?? ''))
                    ? String(prev.planLevel ?? '')
                    : (PLAN_LEVEL_OPTIONS[0] ?? ''),
                }))}
                className={cn(
                  'rounded-[24px] border p-4 text-left transition-all',
                  Boolean(editingPlan) && 'cursor-not-allowed opacity-70',
                  active
                    ? isDarkMode
                      ? 'border-transparent bg-gradient-to-br from-cyan-500/80 to-blue-600 text-white shadow-lg shadow-cyan-950/25'
                      : 'border-transparent bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-200/80'
                    : isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30 hover:bg-white/[0.06]'
                      : 'border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/70'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl',
                        active
                          ? 'bg-white/15 text-white'
                          : isDarkMode
                            ? 'bg-slate-900/70 text-cyan-300'
                            : 'bg-white text-cyan-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{scopeOption.title}</p>
                      <p className={cn('mt-1 text-xs leading-5', active ? 'text-white/85' : mutedCls)}>
                        {scopeOption.description}
                      </p>
                    </div>
                  </div>
                  {active ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ChevronRight className={cn('h-4 w-4 shrink-0', mutedCls)} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {t('subscription.wizard.fields.code', 'Plan code')} *
            </Label>
            <Input
              required
              disabled={Boolean(editingPlan)}
              value={formData.code}
              onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="BASIC, PRO, TEAM..."
              className={inputCls}
            />
          </div>
          <div>
            <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {t('subscription.wizard.fields.displayName', 'Display name')} *
            </Label>
            <Input
              required
              value={formData.displayName}
              onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder={t('subscription.wizard.fields.displayNamePlaceholder', 'Example: Individual Pro, Team Growth...')}
              className={inputCls}
            />
          </div>
          {showPlanLevel ? (
            <div>
              <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>Level</Label>
              <select
                disabled={Boolean(editingPlan)}
                value={resolvedPlanLevel}
                onChange={(event) => setFormData((prev) => ({ ...prev, planLevel: event.target.value }))}
                className={selectCls}
                style={selectStyle}
              >
                {PLAN_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {!editingPlan ? (
                <p className={cn('mt-2 text-xs leading-5', mutedCls)}>
                  {t('subscription.wizard.fields.levelHint', 'A level can contain multiple plans, so choose the level that best fits this plan.'
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {t('subscription.wizard.fields.description', 'Description')}
          </Label>
          <textarea
            value={formData.description}
            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={t(
              'subscription.wizard.fields.descriptionPlaceholder',
              'Briefly describe who this plan is for and its main value.'
            )}
            className={textareaCls}
          />
        </div>
      </section>
    </div>
  );

  const renderEntitlementStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          ShieldCheck,
          t('subscription.wizard.entitlement.title', 'Entitlements and limits'),
          t(
            'subscription.wizard.entitlement.description',
            'Keep this part compact: quantities first, then the capability toggles.'
          ),
          'from-emerald-500 to-teal-600'
        )}

        {hasLevelLadderInheritance ? (
          <div
            className={cn(
              'mt-5 rounded-[22px] border px-4 py-3 text-sm',
              isDarkMode ? 'border-glitter-400/25 bg-glitter-500/10 text-glitter-100' : 'border-ocean-200 bg-ocean-50 text-ocean-800'
            )}
          >
            <p className="font-semibold">
              {t('subscription.wizard.entitlement.levelLadderTitle', {
                defaultValue: 'Level {{level}} kế thừa từ level thấp hơn',
                level: numericPlanLevel,
              })}
            </p>
            <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-glitter-100/80' : 'text-ocean-700/85')}>
              {t('subscription.wizard.entitlement.levelLadderBody', {
                defaultValue: 'Mọi quyền lợi và giới hạn ở các plan {{sources}} đều phải có ở level này — các giá trị thấp hơn đã được tự nâng và các quyền đã có không thể tắt.',
                sources: lowerLevelFloor.sourceLabels.join(', '),
              })}
            </p>
          </div>
        ) : null}

        <div className={cn('mt-6 grid gap-4', isWorkspace ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
          {(() => {
            // USER scope: 3 input (maxIndividualWorkspace + maxMaterialInWorkspace + planIncludedCredits)
            // WORKSPACE scope: 2 input (maxMaterialInWorkspace + planIncludedCredits)
            //   — bỏ maxIndividualWorkspace vì group workspace không có sub-workspace.
            //   — vẫn giữ material count vì BE validate field này cho mọi scope (xem
            //     PlanCatalogService.validateCreateEntitlementLimits).
            const fields = [];
            if (!isWorkspace) {
              fields.push({
                key: 'maxIndividualWorkspace',
                label: `${t('subscription.detail.maxIndividualWorkspace', 'Max individual workspace')} *`,
                hint: t('subscription.wizard.entitlement.maxIndividualWorkspaceHint', 'Maximum number of individual workspaces allowed by this plan.'),
              });
            }
            fields.push({
              key: 'maxMaterialInWorkspace',
              label: `${t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace')} *`,
              hint: t('subscription.wizard.entitlement.maxMaterialInWorkspaceHint', 'Material limit inside each workspace.'),
            });
            fields.push({
              key: 'planIncludedCredits',
              label: `${t('subscription.detail.planIncludedCredits', 'Included credits')} *`,
              hint: t('subscription.wizard.entitlement.planIncludedCreditsHint', 'Credits preloaded in the plan.'),
            });
            return fields;
          })().map((field) => {
            const floorValue = lowerLevelFloor ? Number(lowerLevelFloor[field.key]) || 0 : 0;
            const currentValue = Number(entitlement[field.key]) || 0;
            const belowFloor = floorValue > 0 && currentValue < floorValue;
            const baseMin = field.key === 'planIncludedCredits' && isDefaultPlanLevel ? 0 : 1;
            const effectiveMin = Math.max(baseMin, floorValue);
            return (
              <div
                key={field.key}
                className={cn(
                  'rounded-[24px] border p-4 transition-colors',
                  belowFloor
                    ? isDarkMode
                      ? 'border-amber-400/40 bg-amber-500/10'
                      : 'border-amber-300 bg-amber-50/70'
                    : isDarkMode
                      ? 'border-white/10 bg-slate-950/60'
                      : 'border-slate-200 bg-slate-50/80'
                )}
              >
                <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>{field.label}</Label>
                <Input
                  type="number"
                  min={String(effectiveMin)}
                  disabled={field.key === 'planIncludedCredits' && isDefaultPlanLevel}
                  required={requireIndividualPlanLimits}
                  value={entitlement[field.key] ?? ''}
                  onChange={field.key === 'planIncludedCredits'
                    ? handleIncludedCreditsChange
                    : (event) => setEntitlement((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className={cn(inputCls, 'h-10')}
                />
                <p className={cn('mt-2 text-xs leading-5', mutedCls)}>{field.hint}</p>
                {floorValue > 0 ? (
                  <p
                    className={cn(
                      'mt-1.5 text-[11px] font-semibold tabular-nums',
                      belowFloor
                        ? isDarkMode ? 'text-amber-300' : 'text-amber-700'
                        : isDarkMode ? 'text-glitter-300' : 'text-ocean-700'
                    )}
                  >
                    {t('subscription.wizard.entitlement.lowerLevelFloorHint', {
                      defaultValue: 'Tối thiểu (kế thừa level thấp): {{floor}}',
                      floor: floorValue.toLocaleString(locale),
                    })}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {(() => {
          const creditUnitPrice = includedCredits > 0 ? minPrice / includedCredits : 0;
          const creditPremium = hasCustomCreditPrice ? Math.max(0, currentCreditPrice - minPrice) : 0;
          const creditPriceNumeric = Number(formData.creditPrice) || 0;
          const basePriceNumeric = Number(formData.basePrice) || 0;
          const ladderCreditFloor = Number(lowerLevelFloor?.creditPriceVnd) || 0;
          const ladderBaseFloor = Number(lowerLevelFloor?.basePriceVnd) || 0;
          const creditBelowLadder = ladderCreditFloor > 0 && creditPriceNumeric < ladderCreditFloor;
          const baseBelowLadder = ladderBaseFloor > 0 && basePriceNumeric < ladderBaseFloor;
          const strongTextCls = isDarkMode ? 'text-white' : 'text-slate-900';
          const dividerCls = isDarkMode ? 'border-white/10' : 'border-ocean-200/60';
          const accentTextCls = isDarkMode ? 'text-glitter-300' : 'text-ocean-700';
          const suffixTextCls = isDarkMode ? 'text-glitter-300/80' : 'text-ocean-600';
          const ladderWarnCls = isDarkMode ? 'text-amber-300' : 'text-amber-700';
          const moneyInputCls = cn(
            inputCls,
            'mt-1.5 h-11 pr-14 tabular-nums text-base font-semibold',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
          );
          const previewBadgeCls = cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
            isDarkMode ? 'bg-glitter-500/15 text-glitter-200' : 'bg-ocean-100 text-ocean-700'
          );
          return (
            <div
              className={cn(
                'relative mt-4 overflow-hidden rounded-[24px] border p-5 transition-shadow',
                isDarkMode
                  ? 'border-glitter-400/20 bg-gradient-to-br from-glitter-500/10 via-ocean-700/10 to-slate-950/60 shadow-[0_24px_60px_-32px_rgba(2,132,199,0.45)]'
                  : 'border-ocean-200/70 bg-gradient-to-br from-glitter-50 via-ocean-50/60 to-white shadow-[0_24px_60px_-32px_rgba(31,119,168,0.18)]'
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-glitter-sheen bg-[length:200%_100%] animate-glitter-sheen"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ocean-cta text-white shadow-lg shadow-ocean-500/30">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn('text-xs font-semibold uppercase tracking-wide', accentTextCls)}>
                      {t('subscription.wizard.entitlement.pricingBlockTitle', { defaultValue: 'Giá bán' })}
                    </p>
                    <p className={cn('text-[11px] mt-0.5', mutedCls)}>
                      {t('subscription.wizard.entitlement.totalListPrice', { defaultValue: 'Tổng niêm yết (VND)' })}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    'text-2xl font-extrabold tabular-nums bg-clip-text text-transparent bg-gradient-to-r',
                    isDarkMode ? 'from-glitter-200 via-glitter-300 to-ocean-200' : 'from-ocean-700 via-ocean-500 to-glitter-500'
                  )}
                >
                  {formatCurrency(effectiveTotalPrice, t, locale)}
                </p>
              </div>

              <div className={cn('mt-5 grid gap-4 md:grid-cols-2 border-t pt-5', dividerCls)}>
                <div>
                  <Label className={cn('flex items-center gap-1.5 text-xs font-semibold', strongTextCls)}>
                    <Coins className={cn('h-3.5 w-3.5', isDarkMode ? 'text-glitter-300' : 'text-ocean-600')} />
                    {t('subscription.wizard.entitlement.creditPriceLabel', { defaultValue: 'Phần credit' })}
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', accentTextCls)}>· VND</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      disabled={isDefaultPlanLevel}
                      required={requireIndividualPlanLimits}
                      value={formData.creditPrice}
                      onChange={handleCreditPriceChange}
                      placeholder={String(minPrice)}
                      className={moneyInputCls}
                    />
                    <span
                      className={cn(
                        'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold tracking-wider',
                        suffixTextCls
                      )}
                    >
                      VND
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <p className={cn('text-[11px] tabular-nums', mutedCls)}>
                      {creditPremium > 0
                        ? t('subscription.wizard.entitlement.creditPriceAboveFloor', {
                            defaultValue: '≥ sàn {{floor}} (+{{premium}} so với sàn)',
                            floor: formatCurrency(minPrice, t, locale),
                            premium: formatCurrency(creditPremium, t, locale),
                          })
                        : t('subscription.wizard.entitlement.creditPriceAtFloor', {
                            defaultValue: 'Đúng sàn theo {{count}} credit đi kèm',
                            count: includedCredits.toLocaleString(locale),
                          })}
                    </p>
                    {creditPriceNumeric > 0 ? (
                      <span className={previewBadgeCls}>≈ {formatCurrency(creditPriceNumeric, t, locale)}</span>
                    ) : null}
                  </div>
                  {ladderCreditFloor > 0 ? (
                    <p className={cn('mt-1 text-[11px] font-semibold tabular-nums', creditBelowLadder ? ladderWarnCls : accentTextCls)}>
                      {t('subscription.wizard.entitlement.lowerLevelPriceFloor', {
                        defaultValue: 'Tối thiểu (kế thừa level thấp): {{floor}}',
                        floor: formatCurrency(ladderCreditFloor, t, locale),
                      })}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className={cn('flex items-center gap-1.5 text-xs font-semibold', strongTextCls)}>
                    <Banknote className={cn('h-3.5 w-3.5', isDarkMode ? 'text-glitter-300' : 'text-ocean-600')} />
                    {t('subscription.wizard.entitlement.basePriceLabel', { defaultValue: 'Giá gốc' })}
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', accentTextCls)}>· VND</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      disabled={isDefaultPlanLevel}
                      required={requireIndividualPlanLimits}
                      value={formData.basePrice}
                      onChange={handleBasePriceChange}
                      placeholder="0"
                      className={moneyInputCls}
                    />
                    <span
                      className={cn(
                        'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold tracking-wider',
                        suffixTextCls
                      )}
                    >
                      VND
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <p className={cn('text-[11px]', mutedCls)}>
                      {t(
                        'subscription.wizard.entitlement.basePriceHint',
                        'Phí nền tảng cộng thêm vào tổng — không quy đổi credit.'
                      )}
                    </p>
                    {basePriceNumeric > 0 ? (
                      <span className={previewBadgeCls}>≈ {formatCurrency(basePriceNumeric, t, locale)}</span>
                    ) : null}
                  </div>
                  {ladderBaseFloor > 0 ? (
                    <p className={cn('mt-1 text-[11px] font-semibold tabular-nums', baseBelowLadder ? ladderWarnCls : accentTextCls)}>
                      {t('subscription.wizard.entitlement.lowerLevelPriceFloor', {
                        defaultValue: 'Tối thiểu (kế thừa level thấp): {{floor}}',
                        floor: formatCurrency(ladderBaseFloor, t, locale),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>

              {includedCredits > 0 ? (
                <div
                  className={cn(
                    'mt-4 rounded-[18px] border px-4 py-2.5',
                    isDarkMode ? 'border-glitter-400/15 bg-glitter-500/[0.06]' : 'border-ocean-200/60 bg-white/70'
                  )}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] tabular-nums">
                    <span className={cn('font-semibold uppercase tracking-wide text-[10px]', accentTextCls)}>
                      {t('subscription.wizard.entitlement.floorFormulaLabel', { defaultValue: 'Sàn credit' })}
                    </span>
                    <span className={mutedCls}>
                      {t('subscription.wizard.entitlement.floorFormulaBody', {
                        defaultValue: '{{credits}} credit × {{unit}}/credit',
                        credits: includedCredits.toLocaleString(locale),
                        unit: formatCurrency(creditUnitPrice, t, locale),
                      })}
                    </span>
                    <span className={cn('ml-auto font-bold', accentTextCls)}>
                      = {formatCurrency(minPrice, t, locale)}
                    </span>
                  </div>
                </div>
              ) : null}

              {willAutoRaiseCredit ? (
                <p className="mt-3 text-[12px] font-semibold text-amber-500">
                  {t(
                    'subscription.wizard.entitlement.creditAutoRaiseHint',
                    'Phần credit hiện thấp hơn sàn mới và sẽ được nâng tự động khi lưu.'
                  )}
                </p>
              ) : null}
            </div>
          );
        })()}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('subscription.wizard.entitlement.featureToggle', 'Feature toggle')}
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
              onClick={() => {
                const nextEntitlement = { ...entitlement };
                Object.keys(entitlementToggles).forEach((key) => {
                  nextEntitlement[key] = true;
                });
                setEntitlement(nextEntitlement);
              }}
              className={cn(
                'rounded-full cursor-pointer',
                isDarkMode ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              )}
            >
              {t('subscription.wizard.entitlement.enableAll', 'Enable all')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextEntitlement = { ...entitlement };
                Object.keys(entitlementToggles).forEach((key) => {
                  nextEntitlement[key] = false;
                });
                setEntitlement(nextEntitlement);
              }}
              className={cn(
                'rounded-full cursor-pointer',
                isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/[0.05]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {t('subscription.wizard.entitlement.disableAll', 'Disable all')}
            </Button>
          </div>
        </div>

        {hasGroupInheritance ? (
          <div
            className={cn(
              'mt-4 rounded-[22px] border px-4 py-3 text-sm',
              isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            )}
          >
            Gói group tự động kế thừa toàn bộ quyền lợi từ gói cá nhân cao nhất đang active. Các feature kế thừa không thể tắt.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(entitlementToggles).map(([key, meta]) => {
            const checked = Boolean(entitlement[key]);
            const Icon = meta.icon;
            const inheritedFromUser = hasGroupInheritance && highestActiveUserPlanEntitlement?.[key] === true;
            const inheritedFromLowerLevel = Boolean(lowerLevelFloor?.features?.[key]);
            const locked = inheritedFromUser || inheritedFromLowerLevel;

            return (
              <label
                key={key}
                className={cn(
                  'flex items-center gap-3 rounded-[22px] border px-4 py-3 transition-all',
                  locked ? 'cursor-not-allowed' : 'cursor-pointer',
                  checked
                    ? isDarkMode
                      ? 'border-blue-400/20 bg-blue-500/10 shadow-[0_18px_40px_-28px_rgba(59,130,246,0.7)]'
                      : 'border-blue-200 bg-blue-50/80 shadow-[0_18px_40px_-30px_rgba(59,130,246,0.25)]'
                    : isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                )}
              >
                <Switch
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(value) => setEntitlement((prev) => ({ ...prev, [key]: value }))}
                />
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl',
                    checked
                      ? isDarkMode
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-blue-100 text-blue-600'
                      : isDarkMode
                        ? 'bg-slate-900/70 text-slate-500'
                        : 'bg-white text-slate-400'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={cn('text-sm font-semibold', checked ? (isDarkMode ? 'text-white' : 'text-slate-900') : mutedCls)}>
                      {t(meta.labelKey, meta.defaultLabel)}
                    </p>
                    {inheritedFromLowerLevel ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          isDarkMode ? 'bg-glitter-500/20 text-glitter-200' : 'bg-ocean-100 text-ocean-700'
                        )}
                      >
                        {t('subscription.wizard.entitlement.lockedByLowerLevel', { defaultValue: 'Lv↓' })}
                      </span>
                    ) : null}
                  </div>
                  <p className={cn('mt-1 text-xs', checked ? (isDarkMode ? 'text-blue-100/80' : 'text-blue-700/80') : mutedCls)}>
                    {inheritedFromLowerLevel
                      ? t('subscription.wizard.entitlement.lockedByLowerLevelHint', {
                          defaultValue: 'Đã có ở level thấp hơn — không thể tắt.',
                        })
                      : checked
                        ? 'Đang mở cho plan này.'
                        : 'Đang tắt.'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderModelsStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          Bot,
          t('subscription.wizard.models.title', 'Default models by capability'),
          t(
            'subscription.wizard.models.description',
            'Each capability group should have a default model to reduce manual tuning at the end.'
          ),
          'from-violet-500 to-fuchsia-600'
        )}

        <div
          className={cn(
            'mt-5 rounded-[22px] border px-4 py-3 text-sm',
            isDarkMode ? 'border-violet-400/20 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-800'
          )}
        >
          {t(
            'subscription.wizard.models.inactiveHint',
            'Models outside the ACTIVE state still appear for historical review, but cannot be newly selected.'
          )}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {AI_MODEL_GROUP_OPTIONS.map((group) => {
            const groupModels = availableAiModels.filter((model) => model.modelGroup === group.value);
            const selectedModelId = aiModelAssignments[group.value] ?? '';
            const selectedModel = getModelById(availableAiModels, selectedModelId);

            return (
              <div
                key={group.value}
                className={cn(
                  'rounded-[24px] border p-4',
                  isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t(group.labelKey)}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
                      {t('subscription.aiModels.groupHint')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700'
                    )}
                  >
                    {t('subscription.wizard.models.groupCount', {
                      count: groupModels.length,
                      defaultValue: '{{count}} model',
                    })}
                  </span>
                </div>

                <select
                  value={selectedModelId}
                  onChange={(event) => setAiModelAssignments((prev) => ({ ...prev, [group.value]: event.target.value }))}
                  className={selectCls}
                  style={selectStyle}
                >
                  <option value="">{t('subscription.aiModels.noAssignment')}</option>
                  {groupModels.map((model) => (
                    <option
                      key={model.aiModelId}
                      value={model.aiModelId}
                      disabled={model.status !== 'ACTIVE' && String(model.aiModelId) !== String(selectedModelId)}
                    >
                      {model.displayName} ({model.provider} / {model.modelCode}){model.status !== 'ACTIVE' ? ` • ${model.status}` : ''}
                    </option>
                  ))}
                </select>

                {selectedModel ? (
                  <div
                    className={cn(
                      'mt-3 rounded-[20px] border px-4 py-3 text-sm',
                      isDarkMode ? 'border-violet-400/15 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-900'
                    )}
                  >
                    <p className="font-semibold">{selectedModel.displayName}</p>
                    <p className="mt-1 text-xs">
                      {selectedModel.provider} / {selectedModel.modelCode}
                    </p>
                  </div>
                ) : (
                  <p className={cn('mt-3 text-xs leading-5', mutedCls)}>
                    {t(
                      'subscription.wizard.models.noAssignmentHint',
                      'No dedicated model assigned. The system will use the matching default resolution instead.'
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          Sparkles,
          t('subscription.wizard.review.title', 'Review before saving'),
          t(
            'subscription.wizard.review.description',
            'Final step to fine-tune action-level overrides when this plan needs distinct AI behavior.'
          ),
          'from-amber-400 to-orange-500'
        )}

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div
            className={cn(
              'rounded-[24px] border p-4 xl:col-span-1',
              isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
            )}
          >
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.review.planInfo', 'Plan information')}
            </p>
            <h4 className={cn('mt-3 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {formData.displayName?.trim() || t('subscription.wizard.untitled', 'Untitled plan')}
            </h4>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.fields.code', 'Plan code')}</span>
                <span className={cn('font-mono', isDarkMode ? 'text-white' : 'text-slate-900')}>{formData.code || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.table.scope', 'Scope')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{getScopeLabel(formData.planScope, t)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.review.totalListPrice', { defaultValue: 'Tổng niêm yết' })}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formatCurrency(effectiveTotalPrice, t, locale)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.entitlement.creditPriceLabel', { defaultValue: 'Giá phần credit' })}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formatCurrency(currentCreditPrice, t, locale)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.entitlement.basePriceLabel', { defaultValue: 'Giá gốc' })}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formatCurrency(currentBasePrice, t, locale)}</span>
              </div>
              {showPlanLevel ? (
                <div className="flex items-center justify-between gap-3">
                  <span className={mutedCls}>Level</span>
                  <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formData.planLevel || '—'}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'rounded-[24px] border p-4 xl:col-span-1',
              isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
            )}
          >
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.review.entitlementSnapshot', 'Entitlement snapshot')}
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>Workspace cá nhân</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{entitlement.maxIndividualWorkspace ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{entitlement.maxMaterialInWorkspace ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.detail.planIncludedCredits', 'Included credits')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{entitlement.planIncludedCredits ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {enabledFeatures.length > 0 ? (
                enabledFeatures.slice(0, 6).map(([, meta]) => (
                  <span
                    key={meta.labelKey}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                    )}
                  >
                    {t(meta.labelKey, meta.defaultLabel)}
                  </span>
                ))
              ) : (
                <span className={cn('text-xs', mutedCls)}>{t('subscription.wizard.review.noFeatures', 'No features enabled yet.')}</span>
              )}
            </div>
          </div>

          <div
            className={cn(
              'rounded-[24px] border p-4 xl:col-span-1',
              isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
            )}
          >
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.review.aiSnapshot', 'AI snapshot')}
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.review.modelGroupsAssigned', 'Groups with assigned models')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {assignedModels.filter((item) => item.assignedModelId).length}/{assignedModels.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.review.overrideActions', 'Override actions')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{assignedOverrideCount}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {assignedModels.filter((item) => item.model).slice(0, 4).map((item) => (
                  <span
                    key={item.group.value}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'bg-violet-500/10 text-violet-200' : 'bg-violet-50 text-violet-700'
                    )}
                  >
                    {t(item.group.labelKey)}
                  </span>
                ))}
                {assignedModels.every((item) => !item.model) ? <span className={cn('text-xs', mutedCls)}>{t('subscription.wizard.models.noAssignmentHint', 'No dedicated model assigned. The system will use the matching default resolution instead.')}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderCurrentStep = () => {
    switch (activeStepId) {
      case 'basic':
        return renderBasicStep();
      case 'entitlement':
        return renderEntitlementStep();
      case 'models':
        return renderModelsStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return renderCurrentStep();
}

export default PlanFormWizardStepContent;
