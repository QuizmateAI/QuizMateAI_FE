import React from 'react';
import {
  AlertTriangle,
  GraduationCap,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import {
  getBeginnerScopeLabel,
  isAbsoluteBeginnerLevel,
  isJapaneseLearningScope,
} from './profileWizardBeginnerUtils';

function translateOrFallback(key, fallback, options) {
  const translated = i18n.t(key, options);
  return translated === key ? fallback : translated;
}

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function mergeUniqueSuggestions(...lists) {
  const merged = [];
  const seen = new Set();

  lists.flat().forEach((item) => {
    const value = normalizeText(item);
    if (!value) return;

    const key = normalizeForCompare(value);
    if (seen.has(key)) return;

    seen.add(key);
    merged.push(value);
  });

  return merged;
}

/**
 * Normalize text for comparison: lowercase, trim, collapse whitespace.
 * Used to match exam names from different AI calls that may differ in casing/spacing.
 */
function normalizeForCompare(value) {
  return (value ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildTemplateNotesFromStructure(structure) {
  if (!structure || typeof structure !== 'object') return '';

  const lines = [];
  const overview = normalizeText(structure.overview);
  if (overview) {
    lines.push(
      translateOrFallback(
        'workspaceProfileStepTwo.helpers.overview',
        `- Overview: ${overview}`,
        { overview }
      )
    );
  }

  const excludedSections = Array.isArray(structure.excludedSections) ? structure.excludedSections : [];
  excludedSections.forEach((item) => {
    const name = normalizeText(item?.name);
    const reason = normalizeText(item?.reason);
    if (name && reason) {
      lines.push(
        translateOrFallback(
          'workspaceProfileStepTwo.helpers.excludedWithReason',
          `- Excluded: ${name} (${reason})`,
          { name, reason }
        )
      );
    } else if (name) {
      lines.push(
        translateOrFallback(
          'workspaceProfileStepTwo.helpers.excluded',
          `- Excluded: ${name}`,
          { name }
        )
      );
    }
  });

  const sections = Array.isArray(structure.sections) ? structure.sections : [];
  sections.forEach((section) => {
    const sectionName = normalizeText(section?.name);
    const parts = Array.isArray(section?.parts) ? section.parts : [];
    if (!sectionName || parts.length === 0) return;
    const partsText = parts
      .map((p) => {
        const name = normalizeText(p?.name);
        const count = Number(p?.questionCount) || 0;
        return translateOrFallback(
          'workspaceProfileStepTwo.helpers.sectionPartItem',
          `${name} (${count} questions)`,
          { name, count }
        );
      })
      .filter(Boolean)
      .join(', ');
    lines.push(`- ${sectionName}: ${partsText}`);
  });

  return lines.join('\n');
}

function buildPopularTemplateKey(template) {
  const defaultTemplateName = translateOrFallback(
    'workspaceProfileStepTwo.defaultTemplateName',
    'Template'
  );
  const templateId = normalizeText(template?.templateId);
  const templateName = normalizeText(template?.templateName) || normalizeText(template?.examName) || defaultTemplateName;
  const examName = normalizeText(template?.examName);
  const duration = Number(template?.structure?.totalDurationMinutes) || 0;
  const recommendedCount = Number(template?.structure?.recommendedTotalQuestions) || 0;

  return [templateId || templateName, examName, duration, recommendedCount].join('::');
}

function buildPopularTemplateMeta(template) {
  if (!template) return null;

  const defaultTemplateName = translateOrFallback(
    'workspaceProfileStepTwo.defaultTemplateName',
    'Template'
  );
  return {
    key: buildPopularTemplateKey(template),
    templateName: normalizeText(template?.templateName) || normalizeText(template?.examName) || defaultTemplateName,
    examName: normalizeText(template?.examName) || '',
  };
}

function matchesPopularTemplateSelection(template, values) {
  if (!template || !values) return false;

  const examNameMatches = normalizeForCompare(template?.examName) === normalizeForCompare(values.mockExamName);
  if (!examNameMatches) return false;

  const duration = Number(template?.structure?.totalDurationMinutes) || null;
  const recommendedCount = Number(template?.structure?.recommendedTotalQuestions) || null;
  const notes = buildTemplateNotesFromStructure(template?.structure);

  const durationAndCountMatch = Boolean(duration && recommendedCount)
    && Number(values.templateDurationMinutes) === duration
    && Number(values.templateQuestionCount) === recommendedCount;
  const notesMatch = Boolean(notes) && normalizeText(values.templateNotes) === notes;

  return durationAndCountMatch || notesMatch;
}

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

function SuggestionChips({ suggestions, isDarkMode, onSelect, label }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
          className={cn(
              'text-[11px] font-semibold tracking-wide',
              isDarkMode ? 'text-cyan-300/70' : 'text-cyan-600/70'
          )}
      >
        {label}
      </span>
        {suggestions.map((item) => (
            <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    isDarkMode
                        ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:border-cyan-300/40 hover:bg-cyan-500/20'
                        : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100'
                )}
            >
              {item}
            </button>
        ))}
      </div>
  );
}

function GuidanceNote({
                        isDarkMode,
                        title,
                        description,
                        tone = 'info',
                        icon: Icon = Sparkles,
                      }) {
  const toneClass = tone === 'success'
      ? isDarkMode
          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warning'
          ? isDarkMode
              ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          : isDarkMode
              ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
              : 'border-cyan-200 bg-cyan-50 text-cyan-800';

  return (
      <div className={cn('rounded-[20px] border px-4 py-3', toneClass)}>
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-6">{title}</p>
            <p className="mt-1 text-xs leading-5">{description}</p>
          </div>
        </div>
      </div>
  );
}

function normalizeStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (item ?? '').toString().trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[|\n;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function WorkspaceProfileStepTwo({
                                   t,
                                   isDarkMode,
                                   values,
                                   errors,
                                   templateStatus,
                                   templatePreview,
                                   fieldSuggestions,
                                   fieldSuggestionStatus,
                                   consistencyResult,
                                   consistencyStatus,
                                   disabled = false,
                                   onFieldChange,
                                   onGenerateTemplate,
                                   onApplySuggestion,
                                 }) {
  const translateStepTwo = (key, fallback, options) => {
    const translated = t(key, options);
    return translated === key ? fallback : translated;
  };

  const purposeTitles = {
    STUDY_NEW: translateStepTwo('workspaceProfileStepTwo.purpose.STUDY_NEW', 'Study new'),
    REVIEW: translateStepTwo('workspaceProfileStepTwo.purpose.REVIEW', 'Review'),
  };

  const purposeModeLabels = {
    STUDY_NEW: translateStepTwo('workspaceProfileStepTwo.purposeMode.STUDY_NEW', 'study new'),
    REVIEW: translateStepTwo('workspaceProfileStepTwo.purposeMode.REVIEW', 'review'),
  };

  const learningModePrefix = translateStepTwo(
    'workspaceProfileStepTwo.learningModePrefix',
    'Mode'
  );

  const humanizeConsistencyText = (value) => {
    let text = normalizeText(value);
    if (!text) return '';

    Object.entries(purposeModeLabels).forEach(([purposeKey, purposeLabel]) => {
      text = text.replace(new RegExp(`Chế độ học\\s+${purposeKey}\\b`, 'g'), `${learningModePrefix} ${purposeLabel}`);
      text = text.replace(new RegExp(`Che do hoc\\s+${purposeKey}\\b`, 'g'), `${learningModePrefix} ${purposeLabel}`);
      text = text.replace(new RegExp(`\\b${purposeKey}\\b`, 'g'), purposeTitles[purposeKey]);
    });

    return text;
  };

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

  const hasCurrentLevel = values.currentLevel.trim().length > 0;
  const isBeginnerMode = isAbsoluteBeginnerLevel(values.currentLevel);
  const beginnerScopeLabel = getBeginnerScopeLabel(
    values,
    translateStepTwo('workspaceProfileStepTwo.beginnerFallbackScope', 'this knowledge')
  );
  const isJapaneseBeginnerScope = isJapaneseLearningScope(values.knowledgeInput, values.inferredDomain);
  const requireStrengthFields =
      values.workspacePurpose === 'REVIEW' && !isBeginnerMode;
  const hasStrengthWeaknessContext =
      values.strongAreas.trim().length > 0 && values.weakAreas.trim().length > 0;
  const beginnerStrongSuggestions = isBeginnerMode
    ? [
      translateStepTwo(
        'workspaceProfileStepTwo.beginnerStrongSuggestion1',
        'Just getting started so strong points are not clearly defined yet.',
        { scope: beginnerScopeLabel }
      ),
    ].filter(Boolean)
    : [];
  const beginnerWeakSuggestions = isBeginnerMode
    ? [
      translateStepTwo(
        'workspaceProfileStepTwo.beginnerWeakSuggestion1',
        'Just getting started so weak points are not clearly defined yet.',
        { scope: beginnerScopeLabel }
      ),
    ].filter(Boolean)
    : [];
  const beginnerLearningGoalSuggestions = isBeginnerMode
    ? (
      isJapaneseBeginnerScope
        ? [
          translateStepTwo(
            'workspaceProfileStepTwo.beginnerLearningGoalSuggestionJapanese1',
            'Master hiragana, katakana and basic vocabulary before setting higher goals.'
          ),
          translateStepTwo(
            'workspaceProfileStepTwo.beginnerLearningGoalSuggestionJapanese2',
            'Get familiar with sentence patterns and basic Japanese reflexes in the first few weeks.'
          ),
        ]
        : [
          translateStepTwo(
            'workspaceProfileStepTwo.beginnerLearningGoalSuggestion1',
            `Get familiar with the basic foundation of ${beginnerScopeLabel} before increasing difficulty.`,
            { scope: beginnerScopeLabel }
          ),
          translateStepTwo(
            'workspaceProfileStepTwo.beginnerLearningGoalSuggestion2',
            `Build a solid introductory roadmap for ${beginnerScopeLabel} in the early stage.`,
            { scope: beginnerScopeLabel }
          ),
        ]
    ).filter(Boolean)
    : [];
  const effectiveStrongSuggestions = isBeginnerMode
    ? mergeUniqueSuggestions(beginnerStrongSuggestions, fieldSuggestions?.strongAreaSuggestions)
    : fieldSuggestions?.strongAreaSuggestions;
  const effectiveWeakSuggestions = isBeginnerMode
    ? mergeUniqueSuggestions(beginnerWeakSuggestions, fieldSuggestions?.weakAreaSuggestions)
    : fieldSuggestions?.weakAreaSuggestions;
  const effectiveLearningGoalSuggestions = hasStrengthWeaknessContext
    ? fieldSuggestions?.learningGoalSuggestions
    : isBeginnerMode
      ? beginnerLearningGoalSuggestions
      : [];
  const strongAreasPlaceholder = isBeginnerMode
    ? translateStepTwo(
      'workspaceProfileStepTwo.beginnerStrongAreasPlaceholder',
      'E.g.: just getting started so strong points are not clearly defined yet...',
      { scope: beginnerScopeLabel }
    )
    : t('workspace.profileConfig.placeholders.strongAreas');
  const weakAreasPlaceholder = isBeginnerMode
    ? translateStepTwo(
      'workspaceProfileStepTwo.beginnerWeakAreasPlaceholder',
      'E.g.: just getting started so weak points are not clearly defined yet...',
      { scope: beginnerScopeLabel }
    )
    : t('workspace.profileConfig.placeholders.weakAreas');

  const sugLabel = fieldSuggestionStatus === 'loading'
      ? translateStepTwo('workspaceProfileStepTwo.suggestion.loadingLabel', 'Quizmate AI is suggesting...')
      : translateStepTwo('workspaceProfileStepTwo.suggestion.idleLabel', 'Quizmate AI suggests');

  const overallReviewTone = consistencyResult?.isConsistent ? 'success' : 'warning';
  const aiOverallMessage = humanizeConsistencyText(consistencyResult?.message || '');
  const aiAlignmentHighlights = normalizeStringList(consistencyResult?.alignmentHighlights).map(humanizeConsistencyText);
  const aiOverallIssues = normalizeStringList(
    consistencyResult?.issues
    || consistencyResult?.issueList
    || consistencyResult?.warnings
  ).map(humanizeConsistencyText);
  const aiOverallRecommendations = normalizeStringList(
    consistencyResult?.recommendations
    || consistencyResult?.recommendationList
    || consistencyResult?.suggestions
  ).map(humanizeConsistencyText);
  const aiWorkspaceNameSuggestion = normalizeText(
    consistencyResult?.workspaceNameSuggestion
    || consistencyResult?.workspaceTitleSuggestion
    || consistencyResult?.workspaceTitle
  );
  const aiQuizConstraintWarnings = normalizeStringList(
    consistencyResult?.quizConstraintWarnings
    || consistencyResult?.quizConstraints
  ).map(humanizeConsistencyText);

  return (
      <div className="space-y-7">
        <section className={cn('rounded-[30px] border p-5 sm:p-6', cardClass)}>
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
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                {t('workspace.profileConfig.stepTwo.description')}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="rounded-[24px] border border-dashed p-5">
              <FieldBlock
                  label={`1. ${t('workspace.profileConfig.fields.currentLevel')}`}
                  error={errors.currentLevel}
                  required
              >
                <p className={cn('mb-4 text-sm leading-6', mutedClass)}>
                  {translateStepTwo(
                      'workspaceProfileStepTwo.currentLevelDescription',
                      'Describe your current level in the exact knowledge and field you chose, e.g. N5 foundation, know basic kanji, weak in N4 grammar.'
                  )}
                </p>
                <input
                    type="text"
                    value={values.currentLevel}
                    disabled={disabled}
                    onChange={(event) => onFieldChange('currentLevel', event.target.value)}
                    placeholder={t('workspace.profileConfig.placeholders.currentLevel')}
                    className={inputClass}
                />
                <SuggestionChips
                    suggestions={fieldSuggestions?.currentLevelSuggestions}
                    isDarkMode={isDarkMode}
                    onSelect={(val) => onApplySuggestion?.('currentLevel', val)}
                    label={sugLabel}
                />
              </FieldBlock>
            </div>

            <div className="rounded-[24px] border border-dashed p-5">
              <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedClass)}>
                {translateStepTwo(
                    'workspaceProfileStepTwo.strengthWeaknessTitle',
                    '2. Strong and weak points within this scope'
                )}
              </p>


              {!hasCurrentLevel ? (
                  <div className="mt-4">
                    <GuidanceNote
                        isDarkMode={isDarkMode}
                        title={translateStepTwo(
                            'workspaceProfileStepTwo.waitForCurrentLevelTitle',
                            'Fill in current level first'
                        )}
                        description={translateStepTwo(
                            'workspaceProfileStepTwo.waitForCurrentLevelDescription',
                            'Once you describe your current level, Quizmate AI will suggest strong and weak points more closely aligned with the knowledge you chose.'
                        )}
                      />
                  </div>
              ) : null}

              {hasCurrentLevel && isBeginnerMode ? (
                  <div className="mt-4">
                    <GuidanceNote
                        isDarkMode={isDarkMode}
                        title={translateStepTwo(
                            'workspaceProfileStepTwo.beginnerContextTitle',
                            'You are just getting started'
                        )}
                        description={translateStepTwo(
                            'workspaceProfileStepTwo.beginnerContextDescription',
                            `At this stage you don't need clearly defined strong or weak points in ${beginnerScopeLabel}. You can briefly note that you are building from the basics, then add more as you progress.`,
                            { scope: beginnerScopeLabel }
                        )}
                    />
                  </div>
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <FieldBlock
                    label={t('workspace.profileConfig.fields.strongAreas')}
                    error={errors.strongAreas}
                    required={requireStrengthFields}
                >
                <textarea
                    rows={3}
                     value={values.strongAreas}
                     disabled={disabled}
                     onChange={(event) => onFieldChange('strongAreas', event.target.value)}
                    placeholder={strongAreasPlaceholder}
                     className={inputClass}
                 />
                  {hasCurrentLevel ? (
                       <SuggestionChips
                           suggestions={effectiveStrongSuggestions}
                           isDarkMode={isDarkMode}
                           onSelect={(val) => onApplySuggestion?.('strongAreas', val)}
                           label={sugLabel}
                      />
                  ) : null}
                </FieldBlock>

                <FieldBlock
                    label={t('workspace.profileConfig.fields.weakAreas')}
                    error={errors.weakAreas}
                    required={requireStrengthFields}
                >
                <textarea
                    rows={3}
                     value={values.weakAreas}
                     disabled={disabled}
                     onChange={(event) => onFieldChange('weakAreas', event.target.value)}
                    placeholder={weakAreasPlaceholder}
                     className={inputClass}
                 />
                  {hasCurrentLevel ? (
                       <SuggestionChips
                           suggestions={effectiveWeakSuggestions}
                           isDarkMode={isDarkMode}
                           onSelect={(val) => onApplySuggestion?.('weakAreas', val)}
                           label={sugLabel}
                      />
                  ) : null}
                </FieldBlock>
              </div>
            </div>

            <div className="rounded-[24px] border border-dashed p-5">
              <FieldBlock
                  label={`3. ${learningGoalLabel}`}
                  error={errors.learningGoal}
                  required
              >

                {!hasStrengthWeaknessContext ? (
                    <div className="mb-4">
                      <GuidanceNote
                          isDarkMode={isDarkMode}
                          title={translateStepTwo(
                              isBeginnerMode
                                ? 'workspaceProfileStepTwo.beginnerWaitForGoalTitle'
                                : 'workspaceProfileStepTwo.waitForGoalTitle',
                              isBeginnerMode
                                ? 'You can still set learning goals from the start'
                                : 'Add strong and weak points for Quizmate AI to suggest goals'
                          )}
                          description={translateStepTwo(
                              isBeginnerMode
                                ? 'workspaceProfileStepTwo.beginnerWaitForGoalDescription'
                                : 'workspaceProfileStepTwo.waitForGoalDescription',
                              isBeginnerMode
                                ? `If you don't yet have clearly defined strong or weak points in ${beginnerScopeLabel}, briefly describe that you are building a basic foundation. Quizmate AI can still suggest goals to get you started in the right direction.`
                                : 'Once you have the current level, strong and weak points in context, Quizmate AI will suggest more specific learning goals. You can also enter goals according to your actual needs.',
                              { scope: beginnerScopeLabel }
                          )}
                      />
                    </div>
                ) : null}

                <textarea
                    rows={3}
                    value={values.learningGoal}
                    disabled={disabled}
                    onChange={(event) => onFieldChange('learningGoal', event.target.value)}
                    placeholder={learningGoalPlaceholder}
                    className={inputClass}
                 />
                {(hasStrengthWeaknessContext || isBeginnerMode) ? (
                     <SuggestionChips
                        suggestions={effectiveLearningGoalSuggestions}
                        isDarkMode={isDarkMode}
                        onSelect={(val) => onApplySuggestion?.('learningGoal', val)}
                        label={sugLabel}
                    />
                ) : null}
              </FieldBlock>
            </div>
          </div>

          {fieldSuggestionStatus === 'loading' ? (
              <div
                  className={cn(
                      'mt-4 flex items-center gap-3 rounded-[20px] border px-4 py-3',
                      isDarkMode
                          ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200'
                          : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                  )}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
              {translateStepTwo(
                  'workspaceProfileStepTwo.analyzingBanner',
                  'AI is analyzing and suggesting suitable content...'
              )}
            </span>
              </div>
          ) : null}

          {fieldSuggestions?.warning && fieldSuggestions?.message ? (
              <div
                  className={cn(
                      'mt-4 flex items-start gap-3 rounded-[20px] border px-4 py-3',
                      isDarkMode
                          ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                  )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-6">{fieldSuggestions.message}</p>
                  {fieldSuggestions.warnings?.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {fieldSuggestions.warnings.map((warn, idx) => (
                            <li key={idx} className="text-xs leading-5">• {warn}</li>
                        ))}
                      </ul>
                  ) : null}
                </div>
              </div>
          ) : null}

          {consistencyStatus === 'loading' ? (
              <div className="mt-4">
                <GuidanceNote
                    isDarkMode={isDarkMode}
                    title={translateStepTwo(
                        'workspaceProfileStepTwo.overallReviewLoadingTitle',
                        'Quizmate AI is evaluating the overall profile'
                    )}
                    description={translateStepTwo(
                        'workspaceProfileStepTwo.overallReviewLoadingDescription',
                        'The system is checking whether the current level, strong points, weak points and learning goals match the knowledge you chose.'
                    )}
                />
              </div>
          ) : null}

          {consistencyStatus === 'idle' ? (
              <div className="mt-4">
                <GuidanceNote
                    isDarkMode={isDarkMode}
                    title={translateStepTwo(
                        'workspaceProfileStepTwo.overallReviewPendingTitle',
                        'Overall review will appear once you complete the data'
                    )}
                    description={translateStepTwo(
                        isBeginnerMode
                          ? 'workspaceProfileStepTwo.beginnerOverallReviewPendingDescription'
                          : 'workspaceProfileStepTwo.overallReviewPendingDescription',
                        isBeginnerMode
                          ? `Please fill in current level and learning goals. If you are just starting out, the strong and weak points can be left blank or described as building a basic foundation in ${beginnerScopeLabel}.`
                          : 'Please fill in current level, strong points, weak points and learning goals. Then Quizmate AI will check whether the entire Step 2 matches the knowledge and field you chose.',
                        { scope: beginnerScopeLabel }
                    )}
                />
              </div>
          ) : null}

          {consistencyStatus !== 'loading' && consistencyResult ? (
              <div className="mt-4">
                  <GuidanceNote
                      isDarkMode={isDarkMode}
                      tone={overallReviewTone}
                      icon={consistencyResult.isConsistent ? Sparkles : AlertTriangle}
                      title={
                        aiOverallMessage
                          || translateStepTwo(
                              'workspaceProfileStepTwo.overallReviewTitle',
                              'Quizmate AI overall review'
                        )
                    }
                    description={translateStepTwo(
                        'workspaceProfileStepTwo.aiRecommendationNotice',
                        'This is a reference suggestion from Quizmate AI; you can adjust according to your actual context.'
                    )}
                />

                <div
                    className={cn(
                        'mt-3 rounded-[20px] border px-4 py-3',
                        consistencyResult.isConsistent
                            ? isDarkMode
                                ? 'border-emerald-400/20 bg-emerald-500/5 text-emerald-100'
                                : 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                            : isDarkMode
                                ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                                : 'border-amber-200 bg-amber-50 text-amber-900'
                    )}
                >
                  {aiWorkspaceNameSuggestion ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                        {translateStepTwo(
                          'workspaceProfileStepTwo.workspaceNameSuggestionTitle',
                          'Quizmate AI suggested workspace name'
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1.5 text-sm font-semibold',
                            consistencyResult.isConsistent
                              ? isDarkMode
                                ? 'bg-emerald-400/15 text-emerald-50'
                                : 'bg-emerald-100 text-emerald-800'
                              : isDarkMode
                                ? 'bg-amber-400/15 text-amber-50'
                                : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {aiWorkspaceNameSuggestion}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 opacity-85">
                        {translateStepTwo(
                          'workspaceProfileStepTwo.workspaceNameSuggestionDescription',
                          'This name is generated from your current knowledge, field, and learning goal so it can be used immediately for the workspace.'
                        )}
                      </p>
                    </div>
                  ) : null}

                  {aiAlignmentHighlights.length > 0 ? (
                        <div className={cn(aiWorkspaceNameSuggestion ? 'mt-4' : '')}>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                            {translateStepTwo(
                                'workspaceProfileStepTwo.alignmentHighlightsTitle',
                                'Points that are aligned'
                            )}
                          </p>
                          <ul className="mt-2 space-y-1">
                          {aiAlignmentHighlights.map((item, idx) => (
                                <li key={`${item}-${idx}`} className="text-xs leading-5">• {item}</li>
                            ))}
                          </ul>
                        </div>
                    ) : null}

                    {aiOverallIssues.length > 0 ? (
                      <div className={cn(aiAlignmentHighlights.length > 0 ? 'mt-4' : '')}>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                            {translateStepTwo(
                                'workspaceProfileStepTwo.issuesTitle',
                              'Points to review'
                          )}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {aiOverallIssues.map((issue, idx) => (
                              <li key={`${issue}-${idx}`} className="text-xs leading-5">• {issue}</li>
                          ))}
                        </ul>
                      </div>
                  ) : null}

                    {aiOverallRecommendations.length > 0 ? (
                        <div
                            className={cn(
                              (aiAlignmentHighlights.length > 0 || aiOverallIssues.length > 0)
                                    ? 'mt-4'
                                    : ''
                            )}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                          {translateStepTwo(
                              'workspaceProfileStepTwo.recommendationsTitle',
                              'Refinement suggestions'
                          )}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {aiOverallRecommendations.map((rec, idx) => (
                              <li key={`${rec}-${idx}`} className="text-xs leading-5">→ {rec}</li>
                          ))}
                        </ul>
                      </div>
                  ) : null}

                    {aiQuizConstraintWarnings.length > 0 ? (
                      <div
                        className={cn(
                          (aiAlignmentHighlights.length > 0 || aiOverallIssues.length > 0 || aiOverallRecommendations.length > 0)
                            ? 'mt-4'
                            : ''
                        )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                        {translateStepTwo(
                          'workspaceProfileStepTwo.quizConstraintWarningsTitle',
                          'Quiz compatibility notes'
                        )}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {aiQuizConstraintWarnings.map((warn, idx) => (
                          <li key={`${warn}-${idx}`} className="text-xs leading-5">• {warn}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                </div>
              </div>
          ) : null}

          {consistencyStatus === 'legacy-hidden' ? (
              <div
                  className={cn(
                      'mt-4 rounded-[20px] border px-4 py-3',
                      isDarkMode
                          ? 'border-rose-400/20 bg-rose-500/10 text-rose-200'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                  )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {aiOverallMessage || translateStepTwo(
                            'workspaceProfileStepTwo.legacyIssuesTitle',
                            'Quizmate AI detected some issues'
                        )}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {aiOverallIssues.map((issue, idx) => (
                            <li key={idx} className="text-xs leading-5">• {issue}</li>
                        ))}
                      </ul>
                      {aiOverallRecommendations.length > 0 ? (
                          <div className="mt-3">
                            <p className={cn('text-xs font-semibold', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                              {translateStepTwo(
                                  'workspaceProfileStepTwo.legacyRecommendationsLabel',
                                  'Suggestions:'
                              )}
                            </p>
                            <ul className="mt-1 space-y-1">
                              {aiOverallRecommendations.map((rec, idx) => (
                                  <li key={idx} className="text-xs leading-5">→ {rec}</li>
                              ))}
                            </ul>
                          </div>
                    ) : null}
                  </div>
                </div>
              </div>
          ) : null}
        </section>

      </div>
  );
}

export default WorkspaceProfileStepTwo;
