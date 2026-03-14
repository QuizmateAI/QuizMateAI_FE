import React from 'react';
import {
  BookMarked,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Compass,
  Layers3,
  Route,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PURPOSE_META = {
  STUDY_NEW: {
    icon: Compass,
    tint: 'from-cyan-500 to-blue-600',
  },
  REVIEW: {
    icon: Layers3,
    tint: 'from-amber-500 to-orange-500',
  },
  MOCK_TEST: {
    icon: ScrollText,
    tint: 'from-emerald-500 to-green-600',
  },
};

const DOMAIN_OPTION_THEMES = [
  {
    lightInactive: 'border-sky-200 bg-sky-50/85 text-slate-800 hover:border-sky-300 hover:bg-sky-100/80',
    lightActive: 'border-transparent bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-200/70',
    lightIcon: 'bg-sky-100 text-sky-700',
    lightActiveIcon: 'bg-white/20 text-white',
    lightTag: 'bg-sky-100 text-sky-700',
    lightActiveTag: 'bg-white/20 text-white',
    lightReason: 'text-sky-950/75',
    darkInactive: 'border-sky-400/20 bg-sky-500/10 text-slate-100 hover:border-sky-300/40 hover:bg-sky-500/15',
    darkActive: 'border-sky-300/40 bg-gradient-to-r from-sky-500/45 to-cyan-500/40 text-white',
    darkIcon: 'bg-sky-400/15 text-sky-200',
    darkActiveIcon: 'bg-white/10 text-sky-50',
    darkTag: 'bg-sky-400/15 text-sky-100',
    darkActiveTag: 'bg-white/10 text-sky-50',
    darkReason: 'text-sky-100/75',
  },
  {
    lightInactive: 'border-orange-200 bg-orange-50/85 text-slate-800 hover:border-orange-300 hover:bg-orange-100/80',
    lightActive: 'border-transparent bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200/70',
    lightIcon: 'bg-orange-100 text-orange-700',
    lightActiveIcon: 'bg-white/20 text-white',
    lightTag: 'bg-orange-100 text-orange-700',
    lightActiveTag: 'bg-white/20 text-white',
    lightReason: 'text-orange-950/75',
    darkInactive: 'border-orange-400/20 bg-orange-500/10 text-slate-100 hover:border-orange-300/40 hover:bg-orange-500/15',
    darkActive: 'border-orange-300/40 bg-gradient-to-r from-orange-500/45 to-amber-500/40 text-white',
    darkIcon: 'bg-orange-400/15 text-orange-200',
    darkActiveIcon: 'bg-white/10 text-orange-50',
    darkTag: 'bg-orange-400/15 text-orange-100',
    darkActiveTag: 'bg-white/10 text-orange-50',
    darkReason: 'text-orange-100/75',
  },
  {
    lightInactive: 'border-emerald-200 bg-emerald-50/85 text-slate-800 hover:border-emerald-300 hover:bg-emerald-100/80',
    lightActive: 'border-transparent bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-200/70',
    lightIcon: 'bg-emerald-100 text-emerald-700',
    lightActiveIcon: 'bg-white/20 text-white',
    lightTag: 'bg-emerald-100 text-emerald-700',
    lightActiveTag: 'bg-white/20 text-white',
    lightReason: 'text-emerald-950/75',
    darkInactive: 'border-emerald-400/20 bg-emerald-500/10 text-slate-100 hover:border-emerald-300/40 hover:bg-emerald-500/15',
    darkActive: 'border-emerald-300/40 bg-gradient-to-r from-emerald-500/45 to-green-500/40 text-white',
    darkIcon: 'bg-emerald-400/15 text-emerald-200',
    darkActiveIcon: 'bg-white/10 text-emerald-50',
    darkTag: 'bg-emerald-400/15 text-emerald-100',
    darkActiveTag: 'bg-white/10 text-emerald-50',
    darkReason: 'text-emerald-100/75',
  },
];

function WorkspaceProfileStepOne({
  t,
  isDarkMode,
  values,
  errors,
  analysisStatus,
  domainOptions,
  needsKnowledgeDescription,
  disabled = false,
  onPurposeChange,
  onFieldChange,
  onDomainSelect,
}) {
  const surfaceClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04] text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = cn(
    'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all',
    isDarkMode
      ? 'border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 focus:border-cyan-400'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
  );
  const selectedDomainOption = domainOptions.find((option) => option.label === values.inferredDomain) || null;
  const selectedDomainTheme = selectedDomainOption
    ? DOMAIN_OPTION_THEMES[domainOptions.findIndex((option) => option.label === values.inferredDomain) % DOMAIN_OPTION_THEMES.length]
    : DOMAIN_OPTION_THEMES[0];

  return (
    <div className="space-y-6">
      <section className={cn('rounded-[26px] border p-4 sm:p-5', surfaceClass)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'
            )}
          >
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[1.15rem] font-semibold leading-7">{t('workspace.profileConfig.stepOne.title')}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepOne.description')}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 lg:grid-cols-3">
          {Object.entries(PURPOSE_META).map(([purpose, meta]) => {
            const Icon = meta.icon;
            const active = values.workspacePurpose === purpose;

            return (
              <button
                key={purpose}
                type="button"
                disabled={disabled}
                onClick={() => onPurposeChange(purpose)}
                className={cn(
                  'group min-h-[136px] rounded-[22px] border p-3.5 text-left transition-all',
                  disabled && 'cursor-not-allowed opacity-70',
                  active
                    ? isDarkMode
                      ? `border-transparent bg-gradient-to-br ${meta.tint} text-white shadow-lg shadow-cyan-950/25`
                      : `border-transparent bg-gradient-to-br ${meta.tint} text-white shadow-lg shadow-cyan-200/60`
                    : isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:border-cyan-400/40 hover:bg-white/[0.06]'
                      : 'border-slate-200 bg-slate-50 hover:border-cyan-400/50 hover:bg-cyan-50/70'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                        active
                          ? 'bg-white/15 text-white'
                          : isDarkMode
                            ? 'bg-slate-800 text-cyan-300'
                            : 'bg-white text-cyan-600'
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[1.02rem] font-semibold leading-6">{t(`workspace.profileConfig.purpose.${purpose}.title`)}</p>
                      <p className={cn('mt-1.5 text-[13px] leading-6', active ? 'text-white/80' : mutedClass)}>
                        {t(`workspace.profileConfig.purpose.${purpose}.description`)}
                      </p>
                    </div>
                  </div>
                  {active ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <ChevronRight className={cn('h-5 w-5 shrink-0', mutedClass)} />}
                </div>
              </button>
            );
          })}
        </div>
        {errors.workspacePurpose ? <p className="mt-3 text-sm font-medium text-red-400">{errors.workspacePurpose}</p> : null}
      </section>

      <section className={cn('rounded-[28px] border p-5 sm:p-6', surfaceClass)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'
            )}
          >
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepOne.knowledgeTitle')}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepOne.knowledgeDescription')}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <textarea
              rows={3}
              disabled={disabled}
              value={values.knowledgeInput}
              onChange={(event) => onFieldChange('knowledgeInput', event.target.value)}
              placeholder={t('workspace.profileConfig.placeholders.knowledgeInput')}
              className={inputClass}
            />
            {errors.knowledgeInput ? <p className="mt-2 text-sm font-medium text-red-400">{errors.knowledgeInput}</p> : null}
          </div>

          {analysisStatus === 'success' ? (
            <div
              className={cn(
                'rounded-[24px] border p-4',
                isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
              )}
            >
              <p className="mb-3 text-sm font-semibold">{t('workspace.profileConfig.stepOne.knowledgeSuggestionTitle')}</p>
              <div className="space-y-3">
                {domainOptions.map((option, index) => {
                  const active = values.inferredDomain === option.label;
                  const theme = DOMAIN_OPTION_THEMES[index % DOMAIN_OPTION_THEMES.length];

                  return (
                    <button
                      key={option.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => onDomainSelect(option.label)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-[20px] border px-4 py-3 text-left transition-all',
                        active
                          ? isDarkMode
                            ? theme.darkActive
                            : theme.lightActive
                          : isDarkMode
                            ? theme.darkInactive
                            : theme.lightInactive
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          active
                            ? isDarkMode
                              ? theme.darkActiveIcon
                              : theme.lightActiveIcon
                            : isDarkMode
                              ? theme.darkIcon
                              : theme.lightIcon
                        )}
                      >
                        {active ? <CheckCircle2 className="h-4 w-4" /> : <Compass className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{option.label}</p>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              active
                                ? isDarkMode
                                  ? theme.darkActiveTag
                                  : theme.lightActiveTag
                                : isDarkMode
                                  ? theme.darkTag
                                  : theme.lightTag
                            )}
                          >
                            {active ? t('workspace.profileConfig.stepOne.selectedDomainTag') : t('workspace.profileConfig.stepOne.selectDomainTag')}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'mt-1.5 text-sm leading-6',
                            active ? 'text-white/85' : isDarkMode ? theme.darkReason : theme.lightReason
                          )}
                        >
                          {option.reason}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {errors.inferredDomain ? <p className="mt-3 text-sm font-medium text-red-400">{errors.inferredDomain}</p> : null}
            </div>
          ) : null}

          {values.inferredDomain ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{t('workspace.profileConfig.fields.primaryDomain')}</p>
                <span className={cn('text-xs font-medium', mutedClass)}>
                  {t('workspace.profileConfig.stepOne.primaryDomainLockedHint')}
                </span>
              </div>
              <div
                aria-label={t('workspace.profileConfig.fields.primaryDomain')}
                className={cn(
                  'flex min-h-[72px] items-start gap-3 rounded-2xl border px-4 py-3',
                  isDarkMode
                    ? selectedDomainTheme.darkInactive
                    : selectedDomainTheme.lightInactive
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isDarkMode ? selectedDomainTheme.darkIcon : selectedDomainTheme.lightIcon
                  )}
                >
                  <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{values.inferredDomain}</p>
                  <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                    {selectedDomainOption?.reason || t('workspace.profileConfig.stepOne.primaryDomainLockedHint')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {analysisStatus !== 'success' && errors.inferredDomain ? (
            <p className="text-sm font-medium text-red-400">{errors.inferredDomain}</p>
          ) : null}
        </div>
      </section>

      {needsKnowledgeDescription ? (
        <section
          className={cn(
            'rounded-[28px] border p-5 sm:p-6',
            isDarkMode ? 'border-amber-400/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                isDarkMode ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-100 text-amber-700'
              )}
            >
              <Route className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">{t('workspace.profileConfig.stepOne.knowledgeNudgeTitle')}</h3>
              <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-amber-100/80' : 'text-amber-900/70')}>
                {t('workspace.profileConfig.stepOne.knowledgeNudgeDescription')}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold">{t('workspace.profileConfig.fields.knowledgeDescription')}</label>
            <textarea
              rows={4}
              disabled={disabled}
              value={values.knowledgeDescription}
              onChange={(event) => onFieldChange('knowledgeDescription', event.target.value)}
              placeholder={t('workspace.profileConfig.placeholders.knowledgeDescription')}
              className={inputClass}
            />
            {errors.knowledgeDescription ? (
              <p className="mt-2 text-sm font-medium text-red-400">{errors.knowledgeDescription}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {(values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST') ? (
        <section className={cn('rounded-[28px] border p-5 sm:p-6', surfaceClass)}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'
              )}
            >
              <Route className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepOne.roadmapQuestion')}</h3>
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepOne.roadmapDescription')}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[true, false].map((item) => {
              const active = values.enableRoadmap === item;

              return (
                <button
                  key={String(item)}
                  type="button"
                  disabled={disabled}
                  onClick={() => onFieldChange('enableRoadmap', item)}
                  className={cn(
                    'rounded-[24px] border p-4 text-left transition-all',
                    active
                      ? isDarkMode
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-violet-300 bg-violet-50'
                      : isDarkMode
                        ? 'border-white/10 bg-white/[0.03]'
                        : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {item ? t('workspace.profileConfig.common.yes') : t('workspace.profileConfig.common.no')}
                      </p>
                      <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                        {item
                          ? t('workspace.profileConfig.stepOne.enableRoadmap')
                          : t('workspace.profileConfig.stepOne.skipRoadmap')}
                      </p>
                    </div>
                    {active ? <CheckCircle2 className="h-5 w-5 text-violet-400" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default WorkspaceProfileStepOne;
