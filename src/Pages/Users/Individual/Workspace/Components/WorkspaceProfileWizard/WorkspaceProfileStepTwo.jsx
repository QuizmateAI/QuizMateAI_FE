import React from 'react';
import {
  ClipboardList,
  FilePenLine,
  GraduationCap,
  ListChecks,
  Loader2,
  Radar,
  Search,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import { PUBLIC_EXAMS, TEMPLATE_FORMAT_OPTIONS } from './mockProfileWizardData';

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

function WorkspaceProfileStepTwo({
  t,
  isDarkMode,
  values,
  errors,
  selectedExam,
  examSearch,
  templateStatus,
  templatePreview,
  disabled = false,
  onFieldChange,
  onMockExamModeChange,
  onExamSearchChange,
  onPublicExamSelect,
  onGenerateTemplate,
}) {
  const learningGoalLabel = t(`workspace.profileConfig.fields.learningGoalByPurpose.${values.workspacePurpose}`);
  const learningGoalPlaceholder = t(`workspace.profileConfig.placeholders.learningGoalByPurpose.${values.workspacePurpose}`);
  const inputClass = cn(
    'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all',
    isDarkMode
      ? 'border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 focus:border-sky-400'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-sky-500'
  );
  const cardClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04] text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const filteredExams = PUBLIC_EXAMS.filter((exam) => {
    if (!examSearch.trim()) return true;
    const haystack = `${exam.name} ${exam.alias.join(' ')} ${exam.domain}`.toLowerCase();
    return haystack.includes(examSearch.trim().toLowerCase());
  });
  const showStrengthFields = values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST';
  const isMockTest = values.workspacePurpose === 'MOCK_TEST';

  return (
    <div className="space-y-6">
      <section className={cn('rounded-[28px] border p-5 sm:p-6', cardClass)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'
            )}
          >
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepTwo.title')}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{t('workspace.profileConfig.stepTwo.description')}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <FieldBlock label={t('workspace.profileConfig.fields.currentLevel')} error={errors.currentLevel} required>
            <input
              type="text"
              value={values.currentLevel}
              disabled={disabled}
              onChange={(event) => onFieldChange('currentLevel', event.target.value)}
              placeholder={t('workspace.profileConfig.placeholders.currentLevel')}
              className={inputClass}
            />
          </FieldBlock>

          <FieldBlock label={learningGoalLabel} error={errors.learningGoal} required>
            <textarea
              rows={3}
              value={values.learningGoal}
              disabled={disabled}
              onChange={(event) => onFieldChange('learningGoal', event.target.value)}
              placeholder={learningGoalPlaceholder}
              className={inputClass}
            />
          </FieldBlock>
        </div>

        {showStrengthFields ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <FieldBlock label={t('workspace.profileConfig.fields.strongAreas')} error={errors.strongAreas}>
              <textarea
                rows={3}
                value={values.strongAreas}
                disabled={disabled}
                onChange={(event) => onFieldChange('strongAreas', event.target.value)}
                placeholder={t('workspace.profileConfig.placeholders.strongAreas')}
                className={inputClass}
              />
            </FieldBlock>

            <FieldBlock label={t('workspace.profileConfig.fields.weakAreas')} error={errors.weakAreas}>
              <textarea
                rows={3}
                value={values.weakAreas}
                disabled={disabled}
                onChange={(event) => onFieldChange('weakAreas', event.target.value)}
                placeholder={t('workspace.profileConfig.placeholders.weakAreas')}
                className={inputClass}
              />
            </FieldBlock>
          </div>
        ) : null}
      </section>

      {isMockTest ? (
        <section className={cn('rounded-[28px] border p-5 sm:p-6', cardClass)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  isDarkMode ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-fuchsia-50 text-fuchsia-600'
                )}
              >
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('workspace.profileConfig.stepTwo.mockTestTitle')}</h3>
                <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                  {t('workspace.profileConfig.stepTwo.mockTestDescription')}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">
                {t('workspace.profileConfig.fields.mockExamMode')}
                <span className="ml-1 text-red-500">*</span>
              </p>
              <div
                className={cn(
                  'inline-flex rounded-full border p-1',
                  isDarkMode ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
                )}
              >
                {['PUBLIC', 'PRIVATE'].map((mode) => {
                  const active = values.mockExamMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={disabled}
                      onClick={() => onMockExamModeChange(mode)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                        active
                          ? isDarkMode
                            ? 'bg-white text-slate-950'
                            : 'bg-slate-900 text-white'
                          : mutedClass
                      )}
                    >
                      {t(`workspace.profileConfig.mockExamMode.${mode}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {errors.mockExamMode ? <p className="mt-3 text-sm font-medium text-red-400">{errors.mockExamMode}</p> : null}

          {values.mockExamMode === 'PUBLIC' ? (
            <div className="mt-6 space-y-4">
              <FieldBlock label={t('workspace.profileConfig.fields.publicExamSearch')} error={errors.mockExamCatalogId} required>
                <div className="relative">
                  <Search className={cn('pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2', mutedClass)} />
                  <input
                    type="text"
                    value={examSearch}
                    disabled={disabled}
                    onChange={(event) => onExamSearchChange(event.target.value)}
                    placeholder={t('workspace.profileConfig.placeholders.publicExamSearch')}
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </FieldBlock>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredExams.map((exam) => {
                  const active = values.mockExamCatalogId === exam.id;

                  return (
                    <button
                      key={exam.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onPublicExamSelect(exam.id)}
                      className={cn(
                        'rounded-[24px] border p-4 text-left transition-all',
                        active
                          ? isDarkMode
                            ? 'border-fuchsia-400/50 bg-fuchsia-500/10'
                            : 'border-fuchsia-300 bg-fuchsia-50'
                          : isDarkMode
                            ? 'border-white/10 bg-white/[0.03] hover:border-fuchsia-400/30'
                            : 'border-slate-200 bg-slate-50 hover:border-fuchsia-300'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{exam.name}</p>
                          <p className={cn('mt-1 text-xs leading-5', mutedClass)}>{exam.summary}</p>
                        </div>
                        <Trophy className={cn('h-5 w-5 shrink-0', active ? 'text-fuchsia-400' : mutedClass)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold',
                            isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'
                          )}
                        >
                          {exam.scoreScale}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold',
                            isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'
                          )}
                        >
                          {exam.domain}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredExams.length === 0 ? (
                <div
                  className={cn(
                    'rounded-[24px] border border-dashed p-5 text-sm',
                    isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
                  )}
                >
                  {t('workspace.profileConfig.stepTwo.noPublicExam')}
                </div>
              ) : null}

              {selectedExam ? (
                <div
                  className={cn(
                    'rounded-[24px] border p-4',
                    isDarkMode ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : 'border-fuchsia-200 bg-fuchsia-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Radar className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-fuchsia-300' : 'text-fuchsia-600')} />
                    <div>
                      <p className="text-sm font-semibold">{selectedExam.name}</p>
                      <p className={cn('mt-1 text-xs leading-5', mutedClass)}>{selectedExam.summary}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              <FieldBlock label={t('workspace.profileConfig.fields.privateExamName')} error={errors.mockExamName} required>
                <input
                  type="text"
                  value={values.mockExamName}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('mockExamName', event.target.value)}
                  placeholder={t('workspace.profileConfig.placeholders.privateExamName')}
                  className={inputClass}
                />
              </FieldBlock>
            </div>
          )}

          <div className="mt-6 rounded-[24px] border p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'
                  )}
                >
                  <FilePenLine className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t('workspace.profileConfig.stepTwo.templateTitle')}</p>
                  <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                    {t('workspace.profileConfig.stepTwo.templateDescription')}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                disabled={disabled}
                onClick={onGenerateTemplate}
                className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {templateStatus === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {t('workspace.profileConfig.actions.generateTemplate')}
              </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <FieldBlock label={t('workspace.profileConfig.fields.templatePrompt')} error={errors.templatePrompt}>
                <textarea
                  rows={3}
                  value={values.templatePrompt}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('templatePrompt', event.target.value)}
                  placeholder={t('workspace.profileConfig.placeholders.templatePrompt')}
                  className={inputClass}
                />
              </FieldBlock>

              <FieldBlock label={t('workspace.profileConfig.fields.templateNotes')} error={errors.templateNotes}>
                <textarea
                  rows={3}
                  value={values.templateNotes}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('templateNotes', event.target.value)}
                  placeholder={t('workspace.profileConfig.placeholders.templateNotes')}
                  className={inputClass}
                />
              </FieldBlock>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <FieldBlock label={t('workspace.profileConfig.fields.templateFormat')} error={errors.templateFormat}>
                <select
                  value={values.templateFormat}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('templateFormat', event.target.value)}
                  className={inputClass}
                >
                  {TEMPLATE_FORMAT_OPTIONS.map((format) => (
                    <option key={format} value={format}>
                      {t(`workspace.profileConfig.templateFormat.${format}`)}
                    </option>
                  ))}
                </select>
              </FieldBlock>

              <FieldBlock label={t('workspace.profileConfig.fields.templateDurationMinutes')} error={errors.templateDurationMinutes}>
                <input
                  type="number"
                  min={15}
                  value={values.templateDurationMinutes}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('templateDurationMinutes', event.target.value)}
                  className={inputClass}
                />
              </FieldBlock>

              <FieldBlock label={t('workspace.profileConfig.fields.templateQuestionCount')} error={errors.templateQuestionCount}>
                <input
                  type="number"
                  min={10}
                  value={values.templateQuestionCount}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('templateQuestionCount', event.target.value)}
                  className={inputClass}
                />
              </FieldBlock>
            </div>

            {templateStatus === 'success' && templatePreview ? (
              <div
                className={cn(
                  'mt-5 rounded-[24px] border p-5',
                  isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <ListChecks className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{templatePreview.title}</p>
                    <p className={cn('mt-1 text-xs leading-5', mutedClass)}>{templatePreview.summary}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {templatePreview.sections.map((section) => (
                    <div
                      key={section.name}
                      className={cn(
                        'rounded-2xl border p-4',
                        isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-white bg-white/70'
                      )}
                    >
                      <p className="text-sm font-semibold">{section.name}</p>
                      <p className={cn('mt-1 text-xs leading-5', mutedClass)}>{section.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  {templatePreview.notes.map((note, index) => (
                    <div key={`${note}-${index}`} className="flex gap-2 text-xs leading-5">
                      <Target className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default WorkspaceProfileStepTwo;
