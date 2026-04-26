import React from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  Loader2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ADAPTATION_MODE_OPTIONS,
  getRecommendedRoadmapDays,
  getRecommendedRoadmapMinutesPerDay,
  KNOWLEDGE_LOAD_OPTIONS,
  ROADMAP_SPEED_OPTIONS,
} from './mockProfileWizardData';

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

function WorkspaceProfileStepThree({
  t,
  isDarkMode,
  values,
  errors,
  disabled = false,
  onFieldChange,
  onSuggestRoadmapConfig,
  roadmapTitle,
  roadmapDescription,
  canCreateRoadmap = true,
}) {
  const [suggesting, setSuggesting] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState('');
  const [suggestionMeta, setSuggestionMeta] = React.useState(null);
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
  const showRoadmap = canCreateRoadmap !== false && (values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap);
  const recommendedRoadmapDays = getRecommendedRoadmapDays(values.knowledgeLoad, values.roadmapSpeedMode);
  const estimatedTotalDays = Number(values.estimatedTotalDays) || null;
  const recommendedRoadmapMinutesPerDay = getRecommendedRoadmapMinutesPerDay(
    values.knowledgeLoad,
    estimatedTotalDays || recommendedRoadmapDays
  );
  const currentMinutesPerDay = Number(values.recommendedMinutesPerDay) || null;
  const resolvedRoadmapTitle = roadmapTitle || t('workspace.profileConfig.stepThree.roadmapTitle');
  const resolvedRoadmapDescription = roadmapDescription || t('workspace.profileConfig.stepThree.roadmapDescription');
  const isCustomDaySelection = Boolean(
    showRoadmap
    && estimatedTotalDays
    && estimatedTotalDays !== recommendedRoadmapDays
  );
  const isCustomMinutesSelection = Boolean(
    showRoadmap
    && currentMinutesPerDay
    && currentMinutesPerDay !== recommendedRoadmapMinutesPerDay
  );
  const canSuggestRoadmap = showRoadmap && typeof onSuggestRoadmapConfig === 'function';

  const applySuggestion = (suggestion) => {
    const knowledgeLoad = ['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(suggestion?.knowledgeLoad)
      ? suggestion.knowledgeLoad
      : null;
    const adaptationMode = suggestion?.adaptationMode === 'FLEXIBLE'
      ? 'FLEXIBLE'
      : suggestion?.adaptationMode === 'STRICT'
        ? 'BALANCED'
        : null;
    const roadmapSpeedMode = suggestion?.speedMode === 'FAST'
      ? 'FAST'
      : suggestion?.speedMode === 'SLOW'
        ? 'SLOW'
        : suggestion?.speedMode === 'MEDIUM'
          ? 'STANDARD'
          : null;
    const estimatedTotalDays = Number(suggestion?.estimatedTotalDays);
    const estimatedMinutesPerDay = Number(suggestion?.estimatedMinutesPerDay);

    if (knowledgeLoad) onFieldChange('knowledgeLoad', knowledgeLoad);
    if (adaptationMode) onFieldChange('adaptationMode', adaptationMode);
    if (roadmapSpeedMode) onFieldChange('roadmapSpeedMode', roadmapSpeedMode);
    if (Number.isFinite(estimatedTotalDays) && estimatedTotalDays > 0) {
      onFieldChange('estimatedTotalDays', estimatedTotalDays);
    }
    if (Number.isFinite(estimatedMinutesPerDay) && estimatedMinutesPerDay > 0) {
      onFieldChange('recommendedMinutesPerDay', estimatedMinutesPerDay);
    }
  };

  const handleSuggest = async () => {
    if (!canSuggestRoadmap || suggesting || disabled) return;

    setSuggesting(true);
    setSuggestError('');

    try {
      const suggestion = await onSuggestRoadmapConfig();
      if (!suggestion || typeof suggestion !== 'object') {
        throw new Error(t(
          'workspace.profileConfig.stepThree.suggestInvalid',
          'AI did not return a valid roadmap suggestion.'
        ));
      }

      applySuggestion(suggestion);
      setSuggestionMeta({
        rationale: String(suggestion?.rationale || '').trim(),
        recommendations: Array.isArray(suggestion?.recommendations)
          ? suggestion.recommendations.filter(Boolean)
          : [],
        preLearningRequired: null,
      });
    } catch (error) {
      console.error('[WorkspaceProfileStepThree] Failed to suggest roadmap config:', error);
      setSuggestError(
        error?.message
        || t(
          'workspace.profileConfig.stepThree.suggestFailed',
          'Unable to generate an AI roadmap suggestion right now.'
        )
      );
    } finally {
      setSuggesting(false);
    }
  };

  const getKnowledgeLoadOptionClasses = (value, active) => {
    if (value === 'ADVANCED') {
      return active
        ? isDarkMode
          ? {
            container: 'border-violet-300/60 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_18px_45px_-26px_rgba(168,85,247,0.55)]',
            description: 'text-white/85',
          }
          : {
            container: 'border-violet-400/50 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_18px_45px_-26px_rgba(168,85,247,0.45)]',
            description: 'text-white/85',
          }
        : isDarkMode
          ? {
            container: 'border-violet-400/20 bg-violet-500/10 text-white hover:bg-violet-500/15',
            description: 'text-violet-100/75',
          }
          : {
            container: 'border-violet-200 bg-violet-50 text-slate-900 hover:bg-violet-100/80',
            description: 'text-violet-800/75',
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
              <h3 className="text-lg font-semibold">{resolvedRoadmapTitle}</h3>
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{resolvedRoadmapDescription}</p>
            </div>
          </div>

          {canSuggestRoadmap ? (
            <div
              className={cn(
                'mt-5 rounded-[24px] border px-4 py-4',
                isDarkMode
                  ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
                  : 'border-cyan-200 bg-cyan-50 text-cyan-900'
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                      isDarkMode ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white text-cyan-700'
                    )}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {t(
                        'workspace.profileConfig.stepThree.suggestTitle',
                        'Quizmate AI gợi ý cấu hình lộ trình'
                      )}
                    </p>
                    <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-cyan-100/80' : 'text-cyan-800/75')}>
                      {t(
                        'workspace.profileConfig.stepThree.suggestDescription',
                        'Dùng hồ sơ đã lưu ở bước trước để đề xuất lượng kiến thức, nhịp học, số ngày và số phút học mỗi ngày.'
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabled || suggesting}
                  onClick={handleSuggest}
                  className={cn(
                    'inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition-all',
                    isDarkMode
                      ? 'border-cyan-300/30 bg-slate-950/40 text-cyan-100 hover:bg-slate-900'
                      : 'border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-100'
                  )}
                >
                  {suggesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('workspace.profileConfig.stepThree.suggesting', 'Đang gợi ý...')}
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      {t('workspace.profileConfig.stepThree.suggestButton', 'Lấy gợi ý AI')}
                    </>
                  )}
                </button>
              </div>

              {suggestError ? (
                <p className="mt-3 text-sm font-medium text-rose-500">{suggestError}</p>
              ) : null}

              {suggestionMeta ? (
                <div className={cn(
                  'mt-4 rounded-[20px] border px-4 py-3',
                  isDarkMode ? 'border-emerald-300/15 bg-emerald-500/10' : 'border-emerald-200 bg-white'
                )}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-emerald-200' : 'text-emerald-600')} />
                    <div className="min-w-0 flex-1 space-y-3">
                      {suggestionMeta.rationale ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-75">
                            {t('workspace.profileConfig.stepThree.suggestRationaleLabel', 'Vì sao AI gợi ý')}
                          </p>
                          <p className="mt-1 text-sm leading-6">{suggestionMeta.rationale}</p>
                        </div>
                      ) : null}

                      {suggestionMeta.preLearningRequired != null ? (
                        <p className={cn('text-sm font-medium', isDarkMode ? 'text-amber-100' : 'text-amber-700')}>
                          {suggestionMeta.preLearningRequired
                            ? t('workspace.profileConfig.stepThree.preLearningRequired', 'AI khuyên nên có bài kiểm tra đầu vào trước khi bắt đầu lộ trình.')
                            : t('workspace.profileConfig.stepThree.preLearningNotRequired', 'AI cho rằng có thể bắt đầu lộ trình trực tiếp với cấu hình này.')}
                        </p>
                      ) : null}

                      {suggestionMeta.recommendations.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-75">
                            {t('workspace.profileConfig.stepThree.suggestRecommendationsLabel', 'Ghi chú từ AI')}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm leading-6">
                            {suggestionMeta.recommendations.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
            <FieldBlock label={t('workspace.profileConfig.fields.knowledgeLoad')} error={errors.knowledgeLoad} required>
              <p className={cn('mb-3 text-xs leading-5', mutedClass)}>
                {t('workspace.profileConfig.stepThree.knowledgeLoadHint')}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {KNOWLEDGE_LOAD_OPTIONS.map((item) => {
                  const active = values.knowledgeLoad === item.value;
                  const optionClass = getKnowledgeLoadOptionClasses(item.value, active);

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onFieldChange('knowledgeLoad', item.value)}
                      className={cn(
                        'rounded-[24px] border p-4 text-left transition-all',
                        optionClass.container
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{t(`workspace.profileConfig.knowledgeLoad.${item.value}.title`)}</p>
                          <p className={cn('mt-1 text-xs leading-5', optionClass.description)}>
                            {t(`workspace.profileConfig.knowledgeLoad.${item.value}.description`)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FieldBlock>

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
                <div
                  className={cn(
                    'mt-3 rounded-[20px] border px-4 py-3 text-xs leading-5',
                    isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-800'
                  )}
                >
                  <p className="font-semibold">{t('workspace.profileConfig.stepThree.scheduleInsightTitle')}</p>
                  <p className="mt-1">
                    {isCustomDaySelection
                      ? t('workspace.profileConfig.stepThree.scheduleInsightAdjusted', {
                        days: estimatedTotalDays,
                        speed: t(`workspace.profileConfig.roadmapSpeedMode.${values.roadmapSpeedMode}.title`),
                        recommendedDays: recommendedRoadmapDays,
                      })
                      : t('workspace.profileConfig.stepThree.scheduleInsightSuggested', {
                        days: recommendedRoadmapDays,
                        speed: t(`workspace.profileConfig.roadmapSpeedMode.${values.roadmapSpeedMode}.title`),
                      })}
                  </p>
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
                <div
                  className={cn(
                    'mt-3 rounded-[20px] border px-4 py-3 text-xs leading-5',
                    isDarkMode ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'
                  )}
                >
                  <p className="font-semibold">{t('workspace.profileConfig.stepThree.minutesInsightTitle')}</p>
                  <p className="mt-1">
                    {isCustomMinutesSelection
                      ? t('workspace.profileConfig.stepThree.minutesInsightAdjusted', {
                        minutes: currentMinutesPerDay,
                        recommendedMinutes: recommendedRoadmapMinutesPerDay,
                      })
                      : t('workspace.profileConfig.stepThree.minutesInsightSuggested', {
                        days: estimatedTotalDays || recommendedRoadmapDays,
                        minutes: recommendedRoadmapMinutesPerDay,
                      })}
                  </p>
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
