import React from 'react';
import {
  Clock3,
  Gauge,
  LayoutPanelTop,
  ShieldCheck,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADAPTATION_MODE_OPTIONS, ROADMAP_SPEED_OPTIONS } from './mockProfileWizardData';

function FieldBlock({
  label,
  error,
  required = false,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-2 text-sm font-medium text-red-400">{error}</p> : null}
    </div>
  );
}

function SummaryChip({ value, isDarkMode }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold',
        isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
      )}
    >
      {value}
    </span>
  );
}

function WorkspaceProfileStepThree({
  t,
  isDarkMode,
  values,
  errors,
  selectedExam,
  disabled = false,
  onFieldChange,
}) {
  const inputClass = cn(
    'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all',
    isDarkMode
      ? 'border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 focus:border-cyan-400'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
  );
  const cardClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04] text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const showRoadmap = values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap;

  const getAdaptationOptionClasses = (value, active) => {
    if (value === 'FLEXIBLE') {
      return active
        ? isDarkMode
          ? {
            container: 'border-emerald-300/60 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_18px_45px_-26px_rgba(16,185,129,0.55)]',
            description: 'text-white/85',
          }
          : {
            container: 'border-emerald-400/50 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_18px_45px_-26px_rgba(16,185,129,0.45)]',
            description: 'text-white/85',
          }
        : isDarkMode
          ? {
            container: 'border-emerald-400/20 bg-emerald-500/10 text-white hover:bg-emerald-500/15',
            description: 'text-emerald-100/75',
          }
          : {
            container: 'border-emerald-200 bg-emerald-50 text-slate-900 hover:bg-emerald-100/80',
            description: 'text-emerald-800/75',
          };
    }

    return active
      ? isDarkMode
        ? {
          container: 'border-sky-300/60 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_18px_45px_-26px_rgba(59,130,246,0.55)]',
          description: 'text-white/85',
        }
        : {
          container: 'border-sky-400/50 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_18px_45px_-26px_rgba(59,130,246,0.45)]',
          description: 'text-white/85',
        }
      : isDarkMode
        ? {
          container: 'border-sky-400/20 bg-sky-500/10 text-white hover:bg-sky-500/15',
          description: 'text-sky-100/75',
        }
        : {
          container: 'border-sky-200 bg-sky-50 text-slate-900 hover:bg-sky-100/80',
          description: 'text-sky-800/75',
        };
  };

  return (
    <div className="space-y-6">
      <section
        className={cn(
          'overflow-hidden rounded-[32px] border',
          isDarkMode ? 'border-cyan-400/20 bg-slate-950/70 text-white' : 'border-cyan-200 bg-cyan-50/70 text-slate-900'
        )}
      >
        <div
          className={cn(
            'p-5 sm:p-6',
            isDarkMode
              ? 'bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.22),_transparent_40%),linear-gradient(135deg,rgba(8,47,73,0.9),rgba(15,23,42,0.88))]'
              : 'bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(135deg,rgba(240,249,255,1),rgba(236,254,255,0.72))]'
          )}
        >
          <div className="flex items-start gap-3">
            <LayoutPanelTop className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
            <div>
              <p className="text-sm font-semibold">{t('workspace.profileConfig.stepThree.summaryTitle')}</p>
              <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                {t('workspace.profileConfig.stepThree.summaryDescription')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {values.workspacePurpose ? (
                  <SummaryChip isDarkMode={isDarkMode} value={t(`workspace.profileConfig.purpose.${values.workspacePurpose}.title`)} />
                ) : null}
                {values.inferredDomain ? <SummaryChip isDarkMode={isDarkMode} value={values.inferredDomain} /> : null}
                {values.knowledgeInput ? <SummaryChip isDarkMode={isDarkMode} value={values.knowledgeInput} /> : null}
                {values.currentLevel ? <SummaryChip isDarkMode={isDarkMode} value={values.currentLevel} /> : null}
                {values.workspacePurpose === 'MOCK_TEST' && (selectedExam?.name || values.mockExamName) ? (
                  <SummaryChip isDarkMode={isDarkMode} value={selectedExam?.name || values.mockExamName} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showRoadmap ? (
        <section className={cn('rounded-[28px] border p-5 sm:p-6', cardClass)}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'
              )}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepThree.roadmapTitle')}</h3>
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepThree.roadmapDescription')}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <FieldBlock label={t('workspace.profileConfig.fields.adaptationMode')} error={errors.adaptationMode} required>
              <div className="grid gap-3 md:grid-cols-2">
                {ADAPTATION_MODE_OPTIONS.map((item) => {
                  const active = values.adaptationMode === item.value;
                  const optionClass = getAdaptationOptionClasses(item.value, active);

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onFieldChange('adaptationMode', item.value)}
                      className={cn(
                        'rounded-[24px] border p-4 text-left transition-all',
                        optionClass.container
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Gauge className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{t(`workspace.profileConfig.adaptationMode.${item.value}.title`)}</p>
                          <p className={cn('mt-1 text-xs leading-5', optionClass.description)}>
                            {t(`workspace.profileConfig.adaptationMode.${item.value}.description`)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FieldBlock>

            <FieldBlock label={t('workspace.profileConfig.fields.roadmapSpeedMode')} error={errors.roadmapSpeedMode} required>
              <div className="grid gap-3 md:grid-cols-3">
                {ROADMAP_SPEED_OPTIONS.map((item) => {
                  const active = values.roadmapSpeedMode === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onFieldChange('roadmapSpeedMode', item.value)}
                      className={cn(
                        'rounded-[24px] border p-4 text-left transition-all',
                        active
                          ? isDarkMode
                            ? 'border-cyan-400/40 bg-cyan-500/10'
                            : 'border-cyan-300 bg-cyan-50'
                          : isDarkMode
                            ? 'border-white/10 bg-white/[0.03]'
                            : 'border-slate-200 bg-slate-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{t(`workspace.profileConfig.roadmapSpeedMode.${item.value}.title`)}</p>
                          <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                            {t(`workspace.profileConfig.roadmapSpeedMode.${item.value}.description`)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FieldBlock>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock label={t('workspace.profileConfig.fields.estimatedTotalDays')} error={errors.estimatedTotalDays} required>
                <div className="relative">
                  <Clock3 className={cn('pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2', mutedClass)} />
                  <input
                    type="number"
                    min={1}
                    value={values.estimatedTotalDays}
                    disabled={disabled}
                    onChange={(event) => onFieldChange('estimatedTotalDays', event.target.value)}
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </FieldBlock>

              <FieldBlock label={t('workspace.profileConfig.fields.recommendedMinutesPerDay')} error={errors.recommendedMinutesPerDay} required>
                <div className="relative">
                  <TimerReset className={cn('pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2', mutedClass)} />
                  <input
                    type="number"
                    min={15}
                    value={values.recommendedMinutesPerDay}
                    disabled={disabled}
                    onChange={(event) => onFieldChange('recommendedMinutesPerDay', event.target.value)}
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </FieldBlock>
            </div>
          </div>
        </section>
      ) : (
        <section
          className={cn(
            'rounded-[28px] border p-5 sm:p-6',
            isDarkMode ? 'border-slate-800 bg-slate-900/40 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
          )}
        >
          <p className="text-sm font-semibold">{t('workspace.profileConfig.stepThree.noRoadmapTitle')}</p>
          <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepThree.noRoadmapDescription')}</p>
        </section>
      )}
    </div>
  );
}

export default WorkspaceProfileStepThree;
