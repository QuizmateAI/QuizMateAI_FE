import React from 'react';
import {
  CalendarClock,
  Clock3,
  Gauge,
  LayoutPanelTop,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADAPTATION_MODE_OPTIONS, ROADMAP_SPEED_OPTIONS } from './mockProfileWizardData';

function FieldBlock({
  label,
  error,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
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
  improvementStatus,
  improvementOptions,
  useCustomTargetScore,
  disabled = false,
  onFieldChange,
  onToggleImprovement,
  onTargetScoreSuggestion,
  onEnableCustomTargetScore,
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
  const showImprovement = values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST';
  const showRoadmap = values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap;
  const targetScoreSuggestions = selectedExam?.scoreSuggestions || [];

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

      {showImprovement ? (
        <section className={cn('rounded-[28px] border p-5 sm:p-6', cardClass)}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600'
              )}
            >
              {improvementStatus === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepThree.improvementTitle')}</h3>
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                {t('workspace.profileConfig.stepThree.improvementDescription')}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {improvementOptions.map((option) => {
              const active = values.improvementFocus.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleImprovement(option)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition-all',
                    active
                      ? isDarkMode
                        ? 'border-transparent bg-amber-400 text-slate-950'
                        : 'border-transparent bg-amber-500 text-white'
                      : isDarkMode
                        ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-amber-300/40'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300'
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {errors.improvementFocus ? <p className="mt-3 text-sm font-medium text-red-400">{errors.improvementFocus}</p> : null}
        </section>
      ) : null}

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

          <div className="mt-6 grid gap-4">
            <FieldBlock label={t('workspace.profileConfig.fields.adaptationMode')} error={errors.adaptationMode}>
              <div className="grid gap-3 md:grid-cols-2">
                {ADAPTATION_MODE_OPTIONS.map((item) => {
                  const active = values.adaptationMode === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onFieldChange('adaptationMode', item.value)}
                      className={cn(
                        'rounded-[24px] border p-4 text-left transition-all',
                        active
                          ? `border-transparent bg-gradient-to-br ${item.accent} text-white`
                          : isDarkMode
                            ? 'border-white/10 bg-white/[0.03]'
                            : 'border-slate-200 bg-slate-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Gauge className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{t(`workspace.profileConfig.adaptationMode.${item.value}.title`)}</p>
                          <p className={cn('mt-1 text-xs leading-5', active ? 'text-white/80' : mutedClass)}>
                            {t(`workspace.profileConfig.adaptationMode.${item.value}.description`)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FieldBlock>

            <FieldBlock label={t('workspace.profileConfig.fields.roadmapSpeedMode')} error={errors.roadmapSpeedMode}>
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
              <FieldBlock label={t('workspace.profileConfig.fields.estimatedTotalDays')} error={errors.estimatedTotalDays}>
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

              <FieldBlock label={t('workspace.profileConfig.fields.recommendedMinutesPerDay')} error={errors.recommendedMinutesPerDay}>
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

      {values.workspacePurpose === 'MOCK_TEST' ? (
        <section className={cn('rounded-[28px] border p-5 sm:p-6', cardClass)}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                isDarkMode ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-fuchsia-50 text-fuchsia-600'
              )}
            >
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepThree.mockGoalTitle')}</h3>
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepThree.mockGoalDescription')}</p>
            </div>
          </div>

          {values.mockExamMode === 'PUBLIC' ? (
            <div className="mt-6">
              <FieldBlock label={t('workspace.profileConfig.fields.targetScore')} error={errors.targetScore}>
                <div className="flex flex-wrap gap-2">
                  {targetScoreSuggestions.map((score) => {
                    const active = values.targetScore === score && !useCustomTargetScore;

                    return (
                      <button
                        key={score}
                        type="button"
                        disabled={disabled}
                        onClick={() => onTargetScoreSuggestion(score)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm transition-all',
                          active
                            ? isDarkMode
                              ? 'border-transparent bg-fuchsia-400 text-slate-950'
                              : 'border-transparent bg-fuchsia-600 text-white'
                            : isDarkMode
                              ? 'border-slate-700 bg-slate-900/80 text-slate-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                        )}
                      >
                        {score}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onEnableCustomTargetScore}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-all',
                      useCustomTargetScore
                        ? isDarkMode
                          ? 'border-transparent bg-slate-100 text-slate-950'
                          : 'border-transparent bg-slate-900 text-white'
                        : isDarkMode
                          ? 'border-slate-700 bg-slate-900/80 text-slate-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                    )}
                  >
                    {t('workspace.profileConfig.actions.customTargetScore')}
                  </button>
                </div>

                {useCustomTargetScore ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FieldBlock label={t('workspace.profileConfig.fields.customTargetScore')} error={errors.targetScore}>
                      <input
                        type="text"
                        value={values.targetScore}
                        disabled={disabled}
                        onChange={(event) => onFieldChange('targetScore', event.target.value)}
                        placeholder={t('workspace.profileConfig.placeholders.customTargetScore')}
                        className={inputClass}
                      />
                    </FieldBlock>

                    <FieldBlock label={t('workspace.profileConfig.fields.targetScoreScale')}>
                      <input type="text" value={selectedExam?.scoreScale || values.targetScoreScale} disabled className={inputClass} />
                    </FieldBlock>
                  </div>
                ) : (
                  <p className={cn('mt-3 text-xs leading-5', mutedClass)}>
                    {selectedExam?.scoreScale}
                  </p>
                )}
              </FieldBlock>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FieldBlock label={t('workspace.profileConfig.fields.targetScore')} error={errors.targetScore}>
                <input
                  type="text"
                  value={values.targetScore}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('targetScore', event.target.value)}
                  placeholder={t('workspace.profileConfig.placeholders.customTargetScore')}
                  className={inputClass}
                />
              </FieldBlock>

              <FieldBlock label={t('workspace.profileConfig.fields.targetScoreScale')} error={errors.targetScoreScale}>
                <input
                  type="text"
                  value={values.targetScoreScale}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('targetScoreScale', event.target.value)}
                  placeholder={t('workspace.profileConfig.placeholders.targetScoreScale')}
                  className={inputClass}
                />
              </FieldBlock>
            </div>
          )}

          <div className="mt-4">
            <FieldBlock label={t('workspace.profileConfig.fields.expectedExamDate')} error={errors.expectedExamDate}>
              <div className="relative">
                <CalendarClock className={cn('pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2', mutedClass)} />
                <input
                  type="date"
                  value={values.expectedExamDate}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('expectedExamDate', event.target.value)}
                  className={cn(inputClass, 'pl-11')}
                />
              </div>
            </FieldBlock>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default WorkspaceProfileStepThree;
