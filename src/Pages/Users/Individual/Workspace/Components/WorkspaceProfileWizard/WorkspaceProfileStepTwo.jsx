import React, { useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  FilePenLine,
  GraduationCap,
  Loader2,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import {
  getBeginnerScopeLabel,
  isAbsoluteBeginnerLevel,
  isJapaneseLearningScope,
} from './profileWizardBeginnerUtils';

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
  if (overview) lines.push(`- Overview: ${overview}`);

  const excludedSections = Array.isArray(structure.excludedSections) ? structure.excludedSections : [];
  excludedSections.forEach((item) => {
    const name = normalizeText(item?.name);
    const reason = normalizeText(item?.reason);
    if (name && reason) lines.push(`- Loại bỏ: ${name} (${reason})`);
    else if (name) lines.push(`- Loại bỏ: ${name}`);
  });

  const sections = Array.isArray(structure.sections) ? structure.sections : [];
  sections.forEach((section) => {
    const sectionName = normalizeText(section?.name);
    const parts = Array.isArray(section?.parts) ? section.parts : [];
    if (!sectionName || parts.length === 0) return;
    lines.push(`- ${sectionName}: ${parts.map((p) => `${normalizeText(p?.name)} (${Number(p?.questionCount) || 0} câu)`).filter(Boolean).join(', ')}`);
  });

  return lines.join('\n');
}

function buildPopularTemplateKey(template) {
  const templateId = normalizeText(template?.templateId);
  const templateName = normalizeText(template?.templateName) || normalizeText(template?.examName) || 'Template';
  const examName = normalizeText(template?.examName);
  const duration = Number(template?.structure?.totalDurationMinutes) || 0;
  const recommendedCount = Number(template?.structure?.recommendedTotalQuestions) || 0;

  return [templateId || templateName, examName, duration, recommendedCount].join('::');
}

function buildPopularTemplateMeta(template) {
  if (!template) return null;

  return {
    key: buildPopularTemplateKey(template),
    templateName: normalizeText(template?.templateName) || normalizeText(template?.examName) || 'Template',
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
                                   examTemplateSuggestions = [],
                                   examTemplateSuggestionStatus = 'idle',
                                   consistencyResult,
                                   consistencyStatus,
                                   disabled = false,
                                   onFieldChange,
                                   onGenerateTemplate,
                                   onApplySuggestion,
                                   mockTestGenerationMessage,
                                   generationBannerClassName,
                                   mockTestGenerationState,
                                   progressValue = 0,
                                 }) {
  const translateStepTwo = (key, fallback, options) => {
    const translated = t(key, options);
    return translated === key ? fallback : translated;
  };

  const purposeTitles = {
    STUDY_NEW: translateStepTwo('workspace.profileConfig.purpose.STUDY_NEW.title', 'Học mới'),
    REVIEW: translateStepTwo('workspace.profileConfig.purpose.REVIEW.title', 'Ôn tập'),
    MOCK_TEST: translateStepTwo('workspace.profileConfig.purpose.MOCK_TEST.title', 'Mock test'),
  };

  const purposeModeLabels = {
    STUDY_NEW: translateStepTwo('workspace.profileConfig.stepTwo.purposeModeLabel.STUDY_NEW', 'học mới'),
    REVIEW: translateStepTwo('workspace.profileConfig.stepTwo.purposeModeLabel.REVIEW', 'ôn tập'),
    MOCK_TEST: translateStepTwo('workspace.profileConfig.stepTwo.purposeModeLabel.MOCK_TEST', 'mock test'),
  };

  const humanizeConsistencyText = (value) => {
    let text = normalizeText(value);
    if (!text) return '';

    Object.entries(purposeModeLabels).forEach(([purposeKey, purposeLabel]) => {
      text = text.replace(new RegExp(`Chế độ học\\s+${purposeKey}\\b`, 'g'), `Chế độ ${purposeLabel}`);
      text = text.replace(new RegExp(`Che do hoc\\s+${purposeKey}\\b`, 'g'), `Che do ${purposeLabel}`);
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
    translateStepTwo('workspace.profileConfig.stepTwo.beginnerFallbackScope', 'kiến thức này')
  );
  const isJapaneseBeginnerScope = isJapaneseLearningScope(values.knowledgeInput, values.inferredDomain);
  const requireStrengthFields =
      (values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST') && !isBeginnerMode;
  const hasStrengthWeaknessContext =
      values.strongAreas.trim().length > 0 && values.weakAreas.trim().length > 0;
  const beginnerStrongSuggestions = isBeginnerMode
    ? [
      translateStepTwo(
        'workspace.profileConfig.stepTwo.beginnerStrongSuggestion1',
        'Mới bắt đầu học nên chưa xác định được điểm mạnh rõ ràng.',
        { scope: beginnerScopeLabel }
      ),
    ].filter(Boolean)
    : [];
  const beginnerWeakSuggestions = isBeginnerMode
    ? [
      translateStepTwo(
        'workspace.profileConfig.stepTwo.beginnerWeakSuggestion1',
        'Mới bắt đầu học nên chưa xác định được điểm yếu rõ ràng.',
        { scope: beginnerScopeLabel }
      ),
    ].filter(Boolean)
    : [];
  const beginnerLearningGoalSuggestions = isBeginnerMode
    ? (
      isJapaneseBeginnerScope
        ? [
          translateStepTwo(
            'workspace.profileConfig.stepTwo.beginnerLearningGoalSuggestionJapanese1',
            'Nắm hiragana, katakana và từ vựng cơ bản trước khi lên mục tiêu cao hơn.'
          ),
          translateStepTwo(
            'workspace.profileConfig.stepTwo.beginnerLearningGoalSuggestionJapanese2',
            'Làm quen mẫu câu và phản xạ tiếng Nhật sơ cấp trong những tuần đầu.'
          ),
        ]
        : [
          translateStepTwo(
            'workspace.profileConfig.stepTwo.beginnerLearningGoalSuggestion1',
            `Làm quen nền tảng cơ bản của ${beginnerScopeLabel} trước khi tăng độ khó.`,
            { scope: beginnerScopeLabel }
          ),
          translateStepTwo(
            'workspace.profileConfig.stepTwo.beginnerLearningGoalSuggestion2',
            `Xây lộ trình nhập môn vững cho ${beginnerScopeLabel} trong giai đoạn đầu.`,
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
      'workspace.profileConfig.placeholders.beginnerStrongAreas',
      'VD: mới bắt đầu học nên chưa xác định được điểm mạnh rõ ràng...',
      { scope: beginnerScopeLabel }
    )
    : t('workspace.profileConfig.placeholders.strongAreas');
  const weakAreasPlaceholder = isBeginnerMode
    ? translateStepTwo(
      'workspace.profileConfig.placeholders.beginnerWeakAreas',
      'VD: mới bắt đầu học nên chưa xác định được điểm yếu rõ ràng...',
      { scope: beginnerScopeLabel }
    )
    : t('workspace.profileConfig.placeholders.weakAreas');

  const sugLabel = fieldSuggestionStatus === 'loading'
      ? 'Quizmate AI đang gợi ý...'
      : 'Quizmate AI gợi ý';

  const overallReviewTone = consistencyResult?.isConsistent ? 'success' : 'warning';
  const isMockTest = values.workspacePurpose === 'MOCK_TEST';
  const [activeTab, setActiveTab] = useState('profile');
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [examConfigTab, setExamConfigTab] = useState('popular'); // popular | custom
  const [selectedPopularExamName, setSelectedPopularExamName] = useState('');
  const [selectedPopularTemplateOverride, setSelectedPopularTemplateOverride] = useState(null);
  const hasTemplatePreview = templateStatus === 'success' && Boolean(templatePreview);
  const examNameSuggestions = Array.isArray(fieldSuggestions?.examNameSuggestions) ? fieldSuggestions.examNameSuggestions.filter(Boolean) : [];
  const normalizedExamTemplates = Array.isArray(examTemplateSuggestions) ? examTemplateSuggestions.filter(Boolean) : [];
  const availablePopularExamNames = examNameSuggestions.length > 0
    ? examNameSuggestions
    : Array.from(new Set(normalizedExamTemplates.map((item) => normalizeText(item?.examName)).filter(Boolean)));
  const effectiveSelectedPopularExam = selectedPopularExamName || availablePopularExamNames[0] || '';
  const filteredPopularTemplates = normalizedExamTemplates.filter((tpl) => normalizeForCompare(tpl?.examName) === normalizeForCompare(effectiveSelectedPopularExam));
  const inferredSelectedPopularTemplate = normalizedExamTemplates.find((tpl) => matchesPopularTemplateSelection(tpl, values)) || null;
  const activeSelectedPopularTemplateOverride = selectedPopularTemplateOverride?.key
    && normalizedExamTemplates.some((tpl) => buildPopularTemplateKey(tpl) === selectedPopularTemplateOverride.key)
    ? selectedPopularTemplateOverride
    : null;
  const selectedPopularTemplate = activeSelectedPopularTemplateOverride || buildPopularTemplateMeta(inferredSelectedPopularTemplate);

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
  const aiQuizConstraintWarnings = normalizeStringList(
    consistencyResult?.quizConstraintWarnings
    || consistencyResult?.quizConstraints
  ).map(humanizeConsistencyText);

  return (
      <div className="space-y-6">
        {isMockTest ? (
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1.5 shadow-inner border border-slate-200 dark:border-slate-800 relative z-10 w-fit">
              <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={cn("px-7 py-2.5 rounded-xl font-bold text-sm transition-all relative z-10", activeTab === 'profile' ? "bg-white dark:bg-slate-800 shadow-md text-sky-600 dark:text-sky-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50")}
              >
                Hồ sơ Năng lực
              </button>
              <button
                  type="button"
                  onClick={() => setActiveTab('mocktest')}
                  className={cn("px-7 py-2.5 rounded-xl font-bold text-sm transition-all relative z-10", activeTab === 'mocktest' ? "bg-white dark:bg-slate-800 shadow-md text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50")}
              >
                Cấu hình Đề thi
              </button>
            </div>
        ) : null}

        {(!isMockTest || activeTab === 'profile') && (
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
              <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                {t('workspace.profileConfig.stepTwo.description')}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-[24px] border border-dashed p-4">
              <FieldBlock
                  label={`1. ${t('workspace.profileConfig.fields.currentLevel')}`}
                  error={errors.currentLevel}
                  required
              >
                <p className={cn('mb-4 text-sm leading-6', mutedClass)}>
                  {translateStepTwo(
                      'workspace.profileConfig.stepTwo.currentLevelDescription',
                      'Hãy mô tả trình độ hiện tại theo đúng kiến thức và lĩnh vực đã chọn, ví dụ nền tảng N5, đã biết chữ Hán cơ bản, đang yếu ngữ pháp N4.'
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

            <div className="rounded-[24px] border border-dashed p-4">
              <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedClass)}>
                {translateStepTwo(
                    'workspace.profileConfig.stepTwo.strengthWeaknessTitle',
                    '2. Điểm mạnh và điểm yếu trong đúng phạm vi này'
                )}
              </p>


              {!hasCurrentLevel ? (
                  <div className="mt-4">
                    <GuidanceNote
                        isDarkMode={isDarkMode}
                        title={translateStepTwo(
                            'workspace.profileConfig.stepTwo.waitForCurrentLevelTitle',
                            'Điền trình độ hiện tại trước'
                        )}
                        description={translateStepTwo(
                            'workspace.profileConfig.stepTwo.waitForCurrentLevelDescription',
                            'Sau khi bạn mô tả trình độ hiện tại, Quizmate AI sẽ gợi ý điểm mạnh và điểm yếu sát hơn với kiến thức đã chọn.'
                        )}
                      />
                  </div>
              ) : null}

              {hasCurrentLevel && isBeginnerMode ? (
                  <div className="mt-4">
                    <GuidanceNote
                        isDarkMode={isDarkMode}
                        title={translateStepTwo(
                            'workspace.profileConfig.stepTwo.beginnerContextTitle',
                            'Bạn đang ở giai đoạn mới bắt đầu'
                        )}
                        description={translateStepTwo(
                            'workspace.profileConfig.stepTwo.beginnerContextDescription',
                            `Ở giai đoạn này bạn chưa cần có điểm mạnh hoặc điểm yếu rõ ràng trong ${beginnerScopeLabel}. Bạn có thể ghi ngắn gọn là đang bắt đầu từ nền tảng, sau đó bổ sung dần khi đã học được một thời gian.`,
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

            <div className="rounded-[24px] border border-dashed p-4">
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
                                ? 'workspace.profileConfig.stepTwo.beginnerWaitForGoalTitle'
                                : 'workspace.profileConfig.stepTwo.waitForGoalTitle',
                              isBeginnerMode
                                ? 'Bạn vẫn có thể đặt mục tiêu học tập ngay từ đầu'
                                : 'Bổ sung điểm mạnh và điểm yếu để Quizmate AI gợi ý mục tiêu'
                          )}
                          description={translateStepTwo(
                              isBeginnerMode
                                ? 'workspace.profileConfig.stepTwo.beginnerWaitForGoalDescription'
                                : 'workspace.profileConfig.stepTwo.waitForGoalDescription',
                              isBeginnerMode
                                ? `Nếu chưa có điểm mạnh hoặc điểm yếu rõ ràng trong ${beginnerScopeLabel}, hãy mô tả ngắn gọn là bạn đang xây nền tảng cơ bản. Quizmate AI vẫn có thể gợi ý mục tiêu để bạn bắt đầu đúng hướng.`
                                : 'Khi đã có trình độ hiện tại, điểm mạnh và điểm yếu đúng ngữ cảnh, Quizmate AI sẽ gợi ý mục tiêu học tập cụ thể hơn. Bạn vẫn có thể tự nhập mục tiêu theo nhu cầu thực tế của mình.',
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
              AI đang phân tích và gợi ý nội dung phù hợp...
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
                        'workspace.profileConfig.stepTwo.overallReviewLoadingTitle',
                        'Quizmate AI đang đánh giá tổng quan'
                    )}
                    description={translateStepTwo(
                        'workspace.profileConfig.stepTwo.overallReviewLoadingDescription',
                        'Hệ thống đang kiểm tra xem trình độ hiện tại, điểm mạnh, điểm yếu và mục tiêu học tập đã bám đúng kiến thức bạn chọn hay chưa.'
                    )}
                />
              </div>
          ) : null}

          {consistencyStatus === 'idle' ? (
              <div className="mt-4">
                <GuidanceNote
                    isDarkMode={isDarkMode}
                    title={translateStepTwo(
                        'workspace.profileConfig.stepTwo.overallReviewPendingTitle',
                        'Đánh giá tổng quan sẽ xuất hiện sau khi bạn điền đủ dữ liệu'
                    )}
                    description={translateStepTwo(
                        isBeginnerMode
                          ? 'workspace.profileConfig.stepTwo.beginnerOverallReviewPendingDescription'
                          : 'workspace.profileConfig.stepTwo.overallReviewPendingDescription',
                        isBeginnerMode
                          ? `Hãy điền trình độ hiện tại và mục tiêu học tập. Nếu bạn mới bắt đầu, phần điểm mạnh và điểm yếu có thể để trống hoặc mô tả là đang xây nền tảng cơ bản trong ${beginnerScopeLabel}.`
                          : 'Hãy điền trình độ hiện tại, điểm mạnh, điểm yếu và mục tiêu học tập. Sau đó Quizmate AI sẽ kiểm tra xem toàn bộ phần step 2 đã bám đúng kiến thức và lĩnh vực bạn chọn hay chưa.',
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
                              'workspace.profileConfig.stepTwo.overallReviewTitle',
                              'Đánh giá tổng quan của Quizmate AI'
                        )
                    }
                    description={translateStepTwo(
                        'workspace.profileConfig.stepTwo.aiRecommendationNotice',
                        'Đây là gợi ý tham khảo của Quizmate AI, bạn có thể chỉnh lại theo ngữ cảnh thực tế của mình.'
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
                  {aiAlignmentHighlights.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                            {translateStepTwo(
                                'workspace.profileConfig.stepTwo.alignmentHighlightsTitle',
                                'Những điểm đang khớp'
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
                                'workspace.profileConfig.stepTwo.issuesTitle',
                              'Điểm cần xem lại'
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
                              'workspace.profileConfig.stepTwo.recommendationsTitle',
                              'Gợi ý tinh chỉnh'
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
                          'workspace.profileConfig.stepTwo.quizConstraintWarningsTitle',
                          'Lưu ý tương thích Quiz'
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
                        {aiOverallMessage || 'Quizmate AI phát hiện một số vấn đề'}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {aiOverallIssues.map((issue, idx) => (
                            <li key={idx} className="text-xs leading-5">• {issue}</li>
                        ))}
                      </ul>
                      {aiOverallRecommendations.length > 0 ? (
                          <div className="mt-3">
                            <p className={cn('text-xs font-semibold', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                              Đề xuất:
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
        )}

        {isMockTest && activeTab === 'mocktest' && (
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
                <h3 className="text-lg font-semibold">
                  {t('workspace.profileConfig.stepTwo.mockTestTitle')}
                </h3>
                <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                  {t('workspace.profileConfig.stepTwo.mockTestDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1.5 shadow-inner border border-slate-200 dark:border-slate-800 relative z-10 w-fit">
            <button
              type="button"
              onClick={() => setExamConfigTab('popular')}
              className={cn(
                "px-6 py-2.5 rounded-xl font-bold text-sm transition-all relative z-10",
                examConfigTab === 'popular'
                  ? "bg-white dark:bg-slate-800 shadow-md text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              )}
            >
              Bài thi phổ biến
            </button>
            <button
              type="button"
              onClick={() => setExamConfigTab('custom')}
              className={cn(
                "px-6 py-2.5 rounded-xl font-bold text-sm transition-all relative z-10",
                examConfigTab === 'custom'
                  ? "bg-white dark:bg-slate-800 shadow-md text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              )}
            >
              Custom
            </button>
          </div>

          {mockTestGenerationMessage ? (
              <div
                  className={cn(
                      'mt-4 rounded-[22px] border px-4 py-3 text-sm leading-6',
                      generationBannerClassName
                  )}
              >
                {mockTestGenerationState === 'pending' ? (
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                ) : null}
                {mockTestGenerationMessage}

                <div
                    className={cn(
                        'mt-3 h-2 overflow-hidden rounded-full',
                        isDarkMode ? 'bg-slate-900/70' : 'bg-white/80'
                    )}
                >
                  <div
                      className={cn(
                          'h-full rounded-full transition-all duration-500',
                          mockTestGenerationState === 'ready'
                              ? 'bg-emerald-500'
                              : mockTestGenerationState === 'error'
                                  ? 'bg-rose-500'
                                  : 'bg-cyan-500'
                      )}
                      style={{ width: `${progressValue}%` }}
                  />
                </div>

                <div className="mt-2 text-xs font-semibold">{progressValue}%</div>
              </div>
          ) : null}

          {examConfigTab === 'custom' ? (
            <div className="mt-6">
              <FieldBlock
                label={t('workspace.profileConfig.fields.privateExamName')}
                error={errors.mockExamName}
                required
              >
                <input
                  type="text"
                  value={values.mockExamName}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('mockExamName', event.target.value)}
                  placeholder={t('workspace.profileConfig.placeholders.privateExamName')}
                  className={inputClass}
                />
                <SuggestionChips
                  suggestions={fieldSuggestions?.examNameSuggestions}
                  isDarkMode={isDarkMode}
                  onSelect={(val) => onApplySuggestion?.('mockExamName', val)}
                  label={sugLabel}
                />
              </FieldBlock>
            </div>
          ) : null}

          {examConfigTab === 'popular' ? (
            <div className="mt-8">
              <div className={cn('rounded-[24px] border p-5 sm:p-6', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white')}>
                <p className="text-sm font-semibold">Chọn kỳ thi phổ biến</p>
                <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                  Nhấn vào tên kỳ thi để xem các template gợi ý do Quizmate AI trả về.
                </p>

                {availablePopularExamNames.length === 0 ? (
                  <div
                    className={cn(
                      'mt-4 rounded-[20px] border border-dashed px-4 py-4 text-sm leading-6',
                      isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
                    )}
                  >
                    Hiện chưa có danh sách “bài thi phổ biến”. Hãy điền đủ thông tin ở Step 1-2 để Quizmate AI gợi ý.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {availablePopularExamNames.map((name) => {
                      const active = normalizeForCompare(name) === normalizeForCompare(effectiveSelectedPopularExam);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedPopularExamName(name);
                            onFieldChange('mockExamName', name);
                          }}
                          className={cn(
                            'rounded-full border px-4 py-2 text-xs font-semibold transition-all',
                            active
                              ? isDarkMode
                                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : isDarkMode
                                ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-emerald-400/30 hover:bg-emerald-500/10'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.mockExamName ? (
                  <p className="mt-3 text-sm font-medium text-red-400">{errors.mockExamName}</p>
                ) : null}

                <div
                  className={cn(
                    'mt-6 rounded-[20px] border px-4 py-3',
                    selectedPopularTemplate
                      ? isDarkMode
                        ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : isDarkMode
                        ? 'border-white/10 bg-white/[0.03] text-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', selectedPopularTemplate ? 'text-emerald-500' : mutedClass)} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {selectedPopularTemplate ? `Đang áp dụng: ${selectedPopularTemplate.templateName}` : 'Chưa áp dụng template nào'}
                      </p>
                      <p className={cn('mt-1 text-xs leading-5', selectedPopularTemplate ? '' : mutedClass)}>
                        {selectedPopularTemplate
                          ? `Template cho ${selectedPopularTemplate.examName || effectiveSelectedPopularExam} đang được dùng để điền cấu hình đề thi ở form bên dưới.`
                          : 'Bấm "Dùng template này" để auto điền thời lượng, số câu và ghi chú cấu trúc.'}
                      </p>
                    </div>
                  </div>
                </div>

                {effectiveSelectedPopularExam ? (
                  <div className="mt-6">
                    <p className="text-sm font-semibold">Templates cho {effectiveSelectedPopularExam}</p>
                    {filteredPopularTemplates.length === 0 ? (
                      <p className={cn('mt-2 text-sm leading-6', mutedClass)}>
                        Không có template nào trong response cho kỳ thi này.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {filteredPopularTemplates.map((tpl) => {
                          const duration = Number(tpl?.structure?.totalDurationMinutes) || null;
                          const recommendedCount = Number(tpl?.structure?.recommendedTotalQuestions) || null;
                          const overview = normalizeText(tpl?.structure?.overview);
                          const templateName = normalizeText(tpl?.templateName) || normalizeText(tpl?.examName) || 'Template';
                          const templateKey = buildPopularTemplateKey(tpl);
                          const isSelectedTemplate = selectedPopularTemplate?.key === templateKey;

                          return (
                            <div
                              key={`${tpl?.templateId ?? templateName}-${tpl?.examName ?? ''}`}
                              className={cn(
                                'rounded-[22px] border p-4 transition-all sm:p-5',
                                isSelectedTemplate
                                  ? isDarkMode
                                    ? 'border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.16)]'
                                    : 'border-emerald-300 bg-emerald-50/80 shadow-sm'
                                  : isDarkMode
                                    ? 'border-white/10 bg-white/[0.03]'
                                    : 'border-slate-200 bg-slate-50/60'
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold">{templateName}</p>
                                    {isSelectedTemplate ? (
                                      <span
                                        className={cn(
                                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                          isDarkMode ? 'bg-emerald-400/15 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                                        )}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Đang chọn
                                      </span>
                                    ) : null}
                                  </div>
                                  {overview ? (
                                    <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
                                      {overview}
                                    </p>
                                  ) : null}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {duration ? (
                                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-slate-950/60 text-slate-200' : 'bg-white text-slate-700')}>
                                        {duration} phút
                                      </span>
                                    ) : null}
                                    {recommendedCount ? (
                                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-slate-950/60 text-slate-200' : 'bg-white text-slate-700')}>
                                        ~{recommendedCount} câu
                                      </span>
                                    ) : null}
                                    {tpl?.enforcedLanguage ? (
                                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-slate-950/60 text-slate-200' : 'bg-white text-slate-700')}>
                                        {tpl.enforcedLanguage}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={isSelectedTemplate ? 'default' : 'outline'}
                                    aria-pressed={isSelectedTemplate}
                                    disabled={disabled}
                                    onClick={() => {
                                      setSelectedPopularTemplateOverride(buildPopularTemplateMeta(tpl));
                                      // Apply minimal mapping into current fields for convenience.
                                      onFieldChange('mockExamName', normalizeText(tpl?.examName) || values.mockExamName);
                                      if (duration) onFieldChange('templateDurationMinutes', duration);
                                      if (recommendedCount) onFieldChange('templateQuestionCount', recommendedCount);
                                      const notes = buildTemplateNotesFromStructure(tpl?.structure);
                                      if (notes) onFieldChange('templateNotes', notes);
                                      if (overview && !values.templatePrompt) onFieldChange('templatePrompt', overview);
                                    }}
                                    className={cn(
                                      'rounded-full',
                                      isSelectedTemplate
                                        ? isDarkMode
                                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                        : isDarkMode
                                          ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                                          : 'bg-white'
                                    )}
                                  >
                                    {isSelectedTemplate ? 'Đang dùng template này' : 'Dùng template này'}
                                  </Button>
                                </div>
                              </div>

                              {Array.isArray(tpl?.structure?.sections) && tpl.structure.sections.length > 0 ? (
                                <div className="mt-4 space-y-2">
                                  {tpl.structure.sections.map((section, sectionIndex) => (
                                    <div
                                      key={`${section?.name || 'section'}-${sectionIndex}`}
                                      className={cn(
                                        'rounded-[18px] border px-4 py-3',
                                        isDarkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'
                                      )}
                                    >
                                      <p className="text-sm font-semibold">{section?.name}</p>
                                      {section?.description ? (
                                        <p className={cn('mt-1 text-xs leading-5', mutedClass)}>{section.description}</p>
                                      ) : null}
                                      {Array.isArray(section?.parts) && section.parts.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {section.parts.map((part) => (
                                            <span
                                              key={`${section?.name}-${part?.name}`}
                                              className={cn(
                                                'rounded-full px-3 py-1 text-[11px] font-semibold',
                                                isDarkMode ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700'
                                              )}
                                            >
                                              {part?.name} • {Number(part?.questionCount) || 0} câu
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={cn(
              "mt-8 mx-auto w-full max-w-5xl overflow-hidden rounded-md border border-slate-300 bg-slate-100 shadow-xl dark:border-slate-700 dark:bg-slate-950 transition-all",
              isPreviewFullscreen ? "fixed inset-2 sm:inset-4 z-[100] flex flex-col !mt-0 !max-w-none" : ""
            )}>
              {/* Word-like Ribbon / Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <FilePenLine className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Document - {t('workspace.profileConfig.stepTwo.templateTitle')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('workspace.profileConfig.stepTwo.templateDescription')}
                    </p>
                  </div>

                  <Button
                      type="button"
                      disabled={disabled}
                      onClick={onGenerateTemplate}
                      className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {templateStatus === 'loading' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {t('workspace.profileConfig.actions.generateTemplate')}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {templateStatus === 'success' && (
                    <Button
                      type="button"
                      disabled={disabled}
                      onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                      variant="outline"
                      className="rounded bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      {isPreviewFullscreen ? <Minimize2 className="h-4 w-4 sm:mr-2" /> : <Maximize2 className="h-4 w-4 sm:mr-2" />}
                      <span className="hidden sm:inline">{isPreviewFullscreen ? "Thu nhỏ lại" : "Phóng to đề thi"}</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={onGenerateTemplate}
                    className="rounded bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    {templateStatus === 'loading' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {t('workspace.profileConfig.actions.generateTemplate')}
                  </Button>
                </div>
              </div>

              {/* Document Body (A4 Paper style) */}
              <div className={cn("p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center", isPreviewFullscreen ? "flex-1 overflow-y-auto" : "")}>
                <div
                  className={cn(
                    'w-full max-w-4xl bg-white p-8 sm:p-12 shadow-md border border-slate-200 dark:bg-slate-900 dark:border-slate-800',
                    hasTemplatePreview ? 'min-h-[500px]' : 'min-h-[260px]'
                  )}
                >
                  {/* Configuration Fields mapped like a form in the document */}
                  <h2 className="mb-6 border-b border-slate-200 pb-2 text-2xl font-bold text-slate-800 dark:text-slate-100 dark:border-slate-800">
                    Thiết Lập Khung Bài Thi
                  </h2>

                  <div className="grid gap-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FieldBlock
                        label={t('workspace.profileConfig.fields.templatePrompt')}
                        error={errors.templatePrompt}
                      >
                        <textarea
                          rows={3}
                          value={values.templatePrompt}
                          disabled={disabled}
                          onChange={(event) => onFieldChange('templatePrompt', event.target.value)}
                          placeholder={t('workspace.profileConfig.placeholders.templatePrompt')}
                          className={inputClass}
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={t('workspace.profileConfig.fields.templateNotes')}
                        error={errors.templateNotes}
                      >
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

                    <div className="grid gap-4 lg:grid-cols-3">
                      <FieldBlock
                        label={t('workspace.profileConfig.fields.templateDurationMinutes')}
                        error={errors.templateDurationMinutes}
                      >
                        <input
                          type="number"
                          min={15}
                          value={values.templateDurationMinutes}
                          disabled={disabled}
                          onChange={(event) => onFieldChange('templateDurationMinutes', event.target.value)}
                          className={inputClass}
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={t('workspace.profileConfig.fields.templateQuestionCount')}
                        error={errors.templateQuestionCount}
                      >
                        <input
                          type="number"
                          min={10}
                          value={values.templateQuestionCount}
                          disabled={disabled}
                          onChange={(event) => onFieldChange('templateQuestionCount', event.target.value)}
                          className={inputClass}
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={t('workspace.profileConfig.fields.templateTotalSectionPoints')}
                        error={errors.templateTotalSectionPoints}
                      >
                        <input
                          type="number"
                          min={1}
                          value={values.templateTotalSectionPoints}
                          disabled={disabled}
                          onChange={(event) => onFieldChange('templateTotalSectionPoints', event.target.value)}
                          className={inputClass}
                        />
                      </FieldBlock>
                    </div>
                  </div>

                  {/* AI Generated Word-like Result */}
                  {templateStatus === 'success' && templatePreview ? (
                    <div className="mt-10 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700 relative">
                      <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800 dark:bg-blue-900/10 dark:border-blue-800/30 dark:text-blue-300 font-sans flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                        <p>
                          <span className="font-semibold">Lưu ý:</span> Bạn đang xem trước dàn ý hiển thị (Format Demo) của bài thi. Các câu hỏi bên dưới chỉ là dữ liệu mẫu để minh họa, không phải nội dung câu hỏi chính thức.
                        </p>
                      </div>

                      <div
                        className={cn(
                          'rounded-[24px] border p-5 sm:p-7 shadow-sm',
                          isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
                        )}
                      >
                        <div className="text-center mb-8">
                          <h1 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 dark:text-slate-50 tracking-tight mb-2 antialiased">
                            {templatePreview.title}
                          </h1>
                          <p className="text-sm font-sans italic text-slate-600 dark:text-slate-400 antialiased">
                            {templatePreview.summary}
                          </p>
                        </div>

                        <div className="space-y-10 font-sans text-slate-900 dark:text-slate-100 antialiased">
                          {templatePreview.sections.map((section, index) => (
                            <div key={section.name}>
                              <h3 className="text-base sm:text-lg font-bold mb-1 tracking-tight">
                                Phần {index + 1}: {section.name}
                              </h3>
                              <p className="text-sm italic text-slate-600 dark:text-slate-400 mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 inline-block">
                                {section.detail} ({values.templateTotalSectionPoints || 100} điểm)
                              </p>

                              <div className="space-y-8">
                                {section.mockQuestions?.map((q) => (
                                  <div key={q.index} className="ml-2 lg:ml-6">
                                    <p className="font-semibold mb-2">Câu {q.index}</p>
                                    <div className="whitespace-pre-wrap leading-relaxed mb-4 text-[15px]">{q.content}</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                      {q.options.map((opt) => (
                                        <div key={opt} className="flex items-start">
                                          <span>{opt}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                {section.totalQuestions > (section.mockQuestions?.length || 0) && (
                                  <div className="ml-2 lg:ml-6 mt-6 pb-4 text-center italic text-slate-400 dark:text-slate-500">
                                    ... (còn {section.totalQuestions - section.mockQuestions.length} câu hỏi khác)
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {templatePreview.notes?.length ? (
                          <div className="mt-10 bg-yellow-50/50 p-6 border-l-4 border-yellow-400 dark:bg-yellow-900/10">
                            <h4 className="font-bold text-yellow-800 dark:text-yellow-400 mb-3 font-sans">Ghi chú yêu cầu</h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm font-sans text-yellow-900 dark:text-yellow-200">
                              {templatePreview.notes.map((note, index) => (
                                <li key={`${note}-${index}`}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>
        )}
      </div>
  );
}

export default WorkspaceProfileStepTwo;
