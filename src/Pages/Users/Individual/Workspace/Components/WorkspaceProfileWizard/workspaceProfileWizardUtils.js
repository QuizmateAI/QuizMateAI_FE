import {
  getRecommendedRoadmapDays,
  getRecommendedRoadmapMinutesPerDay,
  inferKnowledgeLoadFromRoadmapConfig,
  inferRoadmapSpeedModeFromDays,
  normalizeKnowledgeLoad,
} from './mockProfileWizardData';
import { isAbsoluteBeginnerLevel } from './profileWizardBeginnerUtils';
import {
  STUDY_PROFILE_ANALYSIS_ERROR_CODES,
  getLiveFieldErrorMessage,
  getReadyLiveFieldValue,
  hasBlockingLiveFieldValue,
} from './workspaceProfileWizardLiveValidation';
export { getReadyLiveFieldValue, hasBlockingLiveFieldValue, getLiveFieldErrorMessage, buildLiveValidationErrors } from './workspaceProfileWizardLiveValidation';
export const ROADMAP_FLOW_TOTAL_STEPS = 3;
export const NO_ROADMAP_FLOW_TOTAL_STEPS = 2;
export const ANALYSIS_DEBOUNCE_MS = 900;
export const FIELD_SUGGESTION_DEBOUNCE_MS = 700;
export const EXAM_TEMPLATE_SUGGESTION_DEBOUNCE_MS = 700;
export const CONSISTENCY_DEBOUNCE_MS = 1000;
export function ensureString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}
export function ensureTextValue(value, fallback = '') {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ');
  }
  return ensureString(value, fallback);
}
export function ensureNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export function hasTextValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && item.trim().length > 0);
  }
  return typeof value === 'string' && value.trim().length > 0;
}
export function normalizeWorkspacePurpose(value, fallback = '', options = {}) {
  const roadmapLockedByPlan = options?.canCreateRoadmap === false;
  const normalized = ensureString(value).trim().toUpperCase();
  if (normalized === 'MOCK_TEST') {
    return 'REVIEW';
  }
  if (roadmapLockedByPlan && normalized === 'STUDY_NEW') {
    return 'REVIEW';
  }
  if (normalized === 'STUDY_NEW' || normalized === 'REVIEW') {
    return normalized;
  }
  return fallback;
}
export function hasBasicStepData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;
  return Boolean(
    hasTextValue(initialData?.workspacePurpose)
    || hasTextValue(initialData?.learningMode)
    || hasTextValue(initialData?.knowledgeInput)
    || hasTextValue(initialData?.knowledge)
    || hasTextValue(initialData?.customKnowledge)
    || hasTextValue(initialData?.inferredDomain)
    || hasTextValue(initialData?.domain)
    || hasTextValue(initialData?.customDomain)
  );
}
export function hasCompleteBasicStepData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;
  return Boolean(
    hasTextValue(initialData?.workspacePurpose || initialData?.learningMode)
    && hasTextValue(initialData?.knowledgeInput || initialData?.knowledge || initialData?.customKnowledge)
    && hasTextValue(initialData?.inferredDomain || initialData?.domain || initialData?.customDomain)
  );
}
export function hasPersonalInfoStepData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;
  return Boolean(
    hasTextValue(initialData?.currentLevel)
    || hasTextValue(initialData?.customCurrentLevel)
    || hasTextValue(initialData?.learningGoal)
    || hasTextValue(initialData?.strongAreas)
    || hasTextValue(initialData?.weakAreas)
    || hasTextValue(initialData?.examName)
  );
}
export function hasRoadmapStepData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;
  return Boolean(
    hasTextValue(initialData?.knowledgeLoad)
    || hasTextValue(initialData?.roadmapKnowledgeLoad)
    || hasTextValue(initialData?.adaptationMode)
    || hasTextValue(initialData?.speedMode)
    || hasTextValue(initialData?.roadmapSpeedMode)
    || Number(initialData?.estimatedTotalDays) > 0
    || Number(initialData?.estimatedMinutesPerDay) > 0
    || Number(initialData?.recommendedMinutesPerDay) > 0
  );
}
export function hasProfileData(initialData) {
  return (
    hasBasicStepData(initialData)
    || hasPersonalInfoStepData(initialData)
    || hasRoadmapStepData(initialData)
    || hasTextValue(initialData?.knowledgeDescription)
    || hasTextValue(initialData?.customSchemeDescription)
  );
}
export function createInitialValues(initialData, options = {}) {
  const roadmapLockedByPlan = options?.canCreateRoadmap === false;
  const hasExistingProfile = hasProfileData(initialData);
  const purpose =
    normalizeWorkspacePurpose(
      initialData?.workspacePurpose || initialData?.learningMode,
      '',
      options,
    ) ||
    (initialData?.mockExamName || initialData?.mockExamCatalogId || initialData?.targetScore
      ? 'REVIEW'
      : initialData?.weakAreas || initialData?.strongAreas
        ? 'REVIEW'
        : hasExistingProfile
          ? (roadmapLockedByPlan ? 'REVIEW' : 'STUDY_NEW')
          : (roadmapLockedByPlan ? 'REVIEW' : ''));
  const roadmapSpeedMode = normalizeRoadmapSpeedMode(
    ensureString(initialData?.roadmapSpeedMode || initialData?.speedMode || 'STANDARD')
  );
  const knowledgeLoad = normalizeKnowledgeLoad(
    ensureString(
      initialData?.knowledgeLoad
      || inferKnowledgeLoadFromRoadmapConfig(initialData?.roadmapSpeedMode || initialData?.speedMode, initialData?.estimatedTotalDays)
      || 'BASIC'
    )
  );
  const recommendedRoadmapDays = getRecommendedRoadmapDays(knowledgeLoad, roadmapSpeedMode);
  const estimatedTotalDays = ensureNumber(initialData?.estimatedTotalDays, recommendedRoadmapDays);
  const recommendedMinutesPerDay = getRecommendedRoadmapMinutesPerDay(knowledgeLoad, estimatedTotalDays);
  return {
    workspacePurpose: purpose,
    analysisId: ensureString(initialData?.analysisId || ''),
    knowledgeInput: ensureString(initialData?.knowledgeInput || initialData?.knowledge || initialData?.customKnowledge || ''),
    knowledgeDescription: ensureString(initialData?.knowledgeDescription || initialData?.customSchemeDescription || ''),
    inferredDomain: ensureString(initialData?.inferredDomain || initialData?.domain || initialData?.customDomain || ''),
    selectedKnowledgeOptionId: ensureString(initialData?.selectedKnowledgeOptionId || ''),
    selectedDomainOptionId: ensureString(initialData?.selectedDomainOptionId || ''),
    selectedKnowledgeOption: ensureString(initialData?.selectedKnowledgeOption || initialData?.knowledgeInput || initialData?.knowledge || initialData?.customKnowledge || ''),
    enableRoadmap: roadmapLockedByPlan
      ? false
      : (
        initialData?.enableRoadmap ??
        initialData?.roadmapEnabled ??
        Boolean(
          purpose === 'STUDY_NEW' ||
          initialData?.knowledgeLoad ||
          initialData?.adaptationMode ||
          initialData?.speedMode ||
          initialData?.roadmapSpeedMode ||
          initialData?.estimatedTotalDays ||
          initialData?.recommendedMinutesPerDay
        )
      ),
    currentLevel: ensureString(initialData?.currentLevel || initialData?.customCurrentLevel || ''),
    learningGoal: ensureString(initialData?.learningGoal || ''),
    strongAreas: ensureTextValue(initialData?.strongAreas || ''),
    weakAreas: ensureTextValue(initialData?.weakAreas || ''),
    mockExamName: ensureString(initialData?.mockExamName || initialData?.examName || ''),
    templatePrompt: ensureString(initialData?.templatePrompt || ''),
    templateFormat: ensureString(initialData?.templateFormat || 'FULL_EXAM'),
    templateDurationMinutes: ensureNumber(initialData?.templateDurationMinutes, 90),
    templateQuestionCount: ensureNumber(initialData?.templateQuestionCount, 60),
    templateNotes: ensureString(initialData?.templateNotes || ''),
    templateTotalSectionPoints: ensureNumber(initialData?.templateTotalSectionPoints, 100),
    knowledgeLoad,
    adaptationMode: normalizeAdaptationMode(ensureString(initialData?.adaptationMode || 'BALANCED')),
    roadmapSpeedMode,
    estimatedTotalDays,
    recommendedMinutesPerDay: ensureNumber(initialData?.recommendedMinutesPerDay ?? initialData?.estimatedMinutesPerDay, recommendedMinutesPerDay),
  };
}
export function readStoredStep(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null;
  const storedStep = Number(window.sessionStorage.getItem(storageKey));
  return Number.isFinite(storedStep) ? storedStep : null;
}
export function getInitialStep(initialData, isReadOnly, storageKey, totalSteps = ROADMAP_FLOW_TOTAL_STEPS) {
  const explicitStep = Number(initialData?.currentStep);
  const profileStatus = initialData?.profileStatus;
  const setupStatus = initialData?.workspaceSetupStatus;
  const hasCompleteBasicData = hasCompleteBasicStepData(initialData);
  const isCompletedFlow = isReadOnly || initialData?.onboardingCompleted || setupStatus === 'DONE';
  const baseStep =
    isCompletedFlow
      ? totalSteps
      : explicitStep >= 1 && explicitStep <= totalSteps
        ? (explicitStep > 1 && !hasCompleteBasicData ? 1 : explicitStep)
        : setupStatus === 'PROFILE_DONE'
          ? totalSteps
          : profileStatus === 'BASIC_DONE' || profileStatus === 'DONE'
            ? hasCompleteBasicData
              ? 2
              : 1
            : 1;
  if (isCompletedFlow) {
    return totalSteps;
  }
  const storedStep = readStoredStep(storageKey);
  if (storedStep && storedStep >= 1 && storedStep <= baseStep) {
    return storedStep;
  }
  return baseStep;
}
export function shouldShowRoadmapFields(values, options = {}) {
  if (options?.canCreateRoadmap === false) {
    return false;
  }
  return values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap;
}
export function getTotalStepsForValues(values, options = {}) {
  return shouldShowRoadmapFields(values, options)
    ? ROADMAP_FLOW_TOTAL_STEPS
    : NO_ROADMAP_FLOW_TOTAL_STEPS;
}
export function validatePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}
export function normalizeAdaptationMode(value) {
  return value === 'FLEXIBLE' ? 'FLEXIBLE' : 'BALANCED';
}
export function normalizeRoadmapSpeedMode(value) {
  if (value === 'SLOW') return 'SLOW';
  if (value === 'FAST') return 'FAST';
  return 'STANDARD';
}
export function syncRoadmapConfigFields(currentValues, field, value) {
  const nextKnowledgeLoad =
    field === 'knowledgeLoad'
      ? normalizeKnowledgeLoad(value)
      : normalizeKnowledgeLoad(currentValues.knowledgeLoad);
  let nextRoadmapSpeedMode =
    field === 'roadmapSpeedMode'
      ? normalizeRoadmapSpeedMode(value)
      : normalizeRoadmapSpeedMode(currentValues.roadmapSpeedMode);
  let nextEstimatedTotalDays =
    field === 'estimatedTotalDays'
      ? value
      : currentValues.estimatedTotalDays;
  let nextRecommendedMinutesPerDay =
    field === 'recommendedMinutesPerDay'
      ? value
      : currentValues.recommendedMinutesPerDay;
  if (field === 'knowledgeLoad' || field === 'roadmapSpeedMode') {
    nextEstimatedTotalDays = getRecommendedRoadmapDays(nextKnowledgeLoad, nextRoadmapSpeedMode);
    nextRecommendedMinutesPerDay = getRecommendedRoadmapMinutesPerDay(nextKnowledgeLoad, nextEstimatedTotalDays);
  } else if (field === 'estimatedTotalDays' && validatePositiveNumber(value)) {
    nextRoadmapSpeedMode = inferRoadmapSpeedModeFromDays(nextKnowledgeLoad, value);
    nextRecommendedMinutesPerDay = getRecommendedRoadmapMinutesPerDay(nextKnowledgeLoad, value);
  }
  return {
    knowledgeLoad: nextKnowledgeLoad,
    roadmapSpeedMode: nextRoadmapSpeedMode,
    estimatedTotalDays: nextEstimatedTotalDays,
    recommendedMinutesPerDay: nextRecommendedMinutesPerDay,
  };
}
export function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}
export function normalizeReasonText(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ');
}
export function isEnglishVietnamesePairSignal(knowledge) {
  const normalizedKnowledge = normalizeReasonText(knowledge);
  if (!normalizedKnowledge) return false;
  const exactShortPair = normalizedKnowledge === 'anh viet' || normalizedKnowledge === 'viet anh';
  const hasExplicitEnglish = normalizedKnowledge.includes('tieng anh') || normalizedKnowledge.includes('english');
  const hasExplicitVietnamese = normalizedKnowledge.includes('tieng viet') || normalizedKnowledge.includes('vietnamese');
  const tokens = normalizedKnowledge.split(' ').filter(Boolean);
  const hasShortPair = tokens.includes('anh') && tokens.includes('viet') && tokens.length <= 3;
  return exactShortPair || (hasExplicitEnglish && hasExplicitVietnamese) || hasShortPair;
}
export function resolveDomainReasonType(label, knowledge, index) {
  const normalizedLabel = normalizeReasonText(label);
  if (normalizedLabel.includes('dich')) {
    return 'translation';
  }
  if (normalizedLabel.includes('bang')) {
    return 'studyBridge';
  }
  if (isEnglishVietnamesePairSignal(knowledge)) {
    return 'languagePair';
  }
  const reasonTypes = ['closest', 'group', 'context'];
  return reasonTypes[index] || 'context';
}
export function extractDomainSuggestionDetails(result) {
  if (!result || typeof result !== 'object') return [];
  // Backend contract (as of 2026-03): domainSuggestionDetails: [{ label, reason }]
  // Keep a few aliases for backwards/experimental payloads.
  const candidates = [
    result.domainSuggestionDetails,
    result.domainSuggestionDetail,
    result.domainSuggestionDetailList,
    result.domainSuggestionDetailsList,
    result.domainSuggestionsDetail,
    result.domainSuggestionsDetails,
  ];
  const found = candidates.find((item) => Array.isArray(item));
  return Array.isArray(found) ? found : [];
}
export function normalizeDomainSuggestionDetail(detail) {
  if (!detail || typeof detail !== 'object') return null;
  const label = (detail.domain || detail.domainTitle || detail.title || detail.label || detail.name || '').toString().trim();
  const reason = (detail.reason || detail.rationale || detail.explanation || detail.message || detail.detail || '').toString().trim();
  if (!label) return null;
  return {
    label,
    reason: reason || '',
  };
}
export function buildDomainOptionsFromApi({ domainSuggestions, domainSuggestionDetails, knowledge, domainOptions = [] }) {
  const normalizedKnowledge = (knowledge || '').toString().trim();
  if (Array.isArray(domainOptions) && domainOptions.length > 0) {
    return domainOptions
      .filter((option) => option && (option.canonicalName || option.label))
      .slice(0, 5)
      .map((option, index) => {
        const label = (option.canonicalName || option.label || '').toString().trim();
        return {
          id: option.optionId || option.id || `domain-option-${index + 1}`,
          label,
          signal: normalizedKnowledge,
          knowledge: normalizedKnowledge,
          confidence: Number(option.confidence) || null,
          reasonType: resolveDomainReasonType(label, normalizedKnowledge, index),
          reason: (option.reason || '').toString().trim(),
        };
      });
  }
  const normalizedDetails = (Array.isArray(domainSuggestionDetails) ? domainSuggestionDetails : [])
    .map(normalizeDomainSuggestionDetail)
    .filter(Boolean);
  if (normalizedDetails.length > 0) {
    return normalizedDetails.slice(0, 5).map((item, index) => ({
      id: `domain-option-${index + 1}`,
      label: item.label,
      signal: normalizedKnowledge,
      knowledge: normalizedKnowledge,
      reasonType: resolveDomainReasonType(item.label, normalizedKnowledge, index),
      reason: item.reason,
    }));
  }
  if (!Array.isArray(domainSuggestions) || domainSuggestions.length === 0) {
    return [];
  }
  return domainSuggestions.slice(0, 5).map((label, index) => ({
    id: `domain-option-${index + 1}`,
    label,
    signal: normalizedKnowledge,
    knowledge: normalizedKnowledge,
    reasonType: resolveDomainReasonType(label, normalizedKnowledge, index),
  }));
}
export function buildKnowledgeOptionsFromApi({ knowledgeOptions = [], knowledge, domainOptions = [] }) {
  const normalizedKnowledge = (knowledge || '').toString().trim();
  const availableDomainOptionIds = new Set(
    (Array.isArray(domainOptions) ? domainOptions : [])
      .map((option) => option?.id)
      .filter(Boolean)
  );
  if (Array.isArray(knowledgeOptions) && knowledgeOptions.length > 0) {
    return knowledgeOptions
      .filter((option) => option && (option.canonicalName || option.label))
      .slice(0, 5)
      .map((option, index) => ({
        id: option.optionId || option.id || `knowledge-option-${index + 1}`,
        label: (option.canonicalName || option.label || '').toString().trim(),
        description:
          (option.coreMeaningShort || option.coreDefinitionShort || option.description || '').toString().trim(),
        confidence: Number(option.confidence) || null,
        existingKnowledge: Boolean(option.existingKnowledge ?? option.isExistingKnowledge ?? option.existingKnowledgeId),
        suggestedDomainOptionIds: (Array.isArray(option.suggestedDomainOptionIds) ? option.suggestedDomainOptionIds : [])
          .filter((id) => availableDomainOptionIds.has(id)),
      }));
  }
  if (!normalizedKnowledge) {
    return [];
  }
  return [{
    id: 'knowledge-option-1',
    label: normalizedKnowledge,
    description: normalizedKnowledge,
    confidence: null,
    existingKnowledge: false,
    suggestedDomainOptionIds: [],
  }];
}
export function localizeDomainOptions(options, t) {
  return options.map((option) => ({
    ...option,
    reason:
      option.reason?.trim()
      || t(`workspace.profileConfig.stepOne.domainReason.${option.reasonType}`, {
        signal: option.signal,
        knowledge: option.knowledge,
        domain: option.label,
      }),
  }));
}
export function getSelectedKnowledgeForAi(values) {
  const selectedKnowledge = ensureString(values.selectedKnowledgeOption).trim();
  if (selectedKnowledge) {
    return selectedKnowledge;
  }
  return getReadyLiveFieldValue('knowledgeInput', values.knowledgeInput);
}
export function getSelectedDomainForAi(values) {
  return ensureString(values.inferredDomain).trim() || getReadyLiveFieldValue('inferredDomain', values.inferredDomain);
}
export function splitProfileFieldValues(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\n;/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
export function buildFieldSuggestionPayload(values) {
  const readyKnowledge = getSelectedKnowledgeForAi(values);
  const readyDomain = getSelectedDomainForAi(values);
  const readyCurrentLevel = getReadyLiveFieldValue('currentLevel', values.currentLevel);
  const readyStrongAreas = getReadyLiveFieldValue('strongAreas', values.strongAreas);
  const readyWeakAreas = getReadyLiveFieldValue('weakAreas', values.weakAreas);
  return {
    knowledge: readyKnowledge,
    domain: readyDomain,
    learningMode: mapLearningModeForApi(values.workspacePurpose),
    currentLevel: readyCurrentLevel || null,
    strongAreas: splitProfileFieldValues(readyStrongAreas),
    weakAreas: splitProfileFieldValues(readyWeakAreas),
  };
}
export function buildExamTemplateSuggestionPayload(values) {
  return {
    knowledge: getSelectedKnowledgeForAi(values),
    domain: getSelectedDomainForAi(values),
  };
}
export function buildConsistencyPayload(values) {
  const readyKnowledge = getSelectedKnowledgeForAi(values);
  const readyDomain = getSelectedDomainForAi(values);
  const readyCurrentLevel = getReadyLiveFieldValue('currentLevel', values.currentLevel);
  const readyLearningGoal = getReadyLiveFieldValue('learningGoal', values.learningGoal);
  const readyMockExamName = getReadyLiveFieldValue('mockExamName', values.mockExamName);
  const readyStrongAreas = getReadyLiveFieldValue('strongAreas', values.strongAreas);
  const readyWeakAreas = getReadyLiveFieldValue('weakAreas', values.weakAreas);
  return {
    knowledge: readyKnowledge,
    domain: readyDomain,
    learningMode: mapLearningModeForApi(values.workspacePurpose),
    currentLevel: readyCurrentLevel || null,
    learningGoal: readyLearningGoal || null,
    examName: readyMockExamName || null,
    strongAreas: splitProfileFieldValues(readyStrongAreas),
    weakAreas: splitProfileFieldValues(readyWeakAreas),
  };
}
export function shouldRunLiveConsistency(values) {
  const beginnerMode = isAbsoluteBeginnerLevel(values.currentLevel);
  const hasReadyKnowledge = Boolean(getSelectedKnowledgeForAi(values));
  const hasReadyDomain = Boolean(getSelectedDomainForAi(values));
  const hasReadyCurrentLevel = Boolean(getReadyLiveFieldValue('currentLevel', values.currentLevel));
  const hasReadyLearningGoal = Boolean(getReadyLiveFieldValue('learningGoal', values.learningGoal));
  const hasReadyStrongAreas = Boolean(getReadyLiveFieldValue('strongAreas', values.strongAreas));
  const hasReadyWeakAreas = Boolean(getReadyLiveFieldValue('weakAreas', values.weakAreas));
  const hasReadyMockExamName =
    values.workspacePurpose !== 'MOCK_TEST'
    || Boolean(getReadyLiveFieldValue('mockExamName', values.mockExamName));
  return Boolean(
    hasReadyKnowledge
    && hasReadyDomain
    && values.workspacePurpose
    && hasReadyCurrentLevel
    && hasReadyLearningGoal
    && hasReadyMockExamName
    && (
      beginnerMode
      || (hasReadyStrongAreas && hasReadyWeakAreas)
    )
  );
}
export function buildConsistencyFingerprint(values) {
  return buildRequestFingerprint(buildConsistencyPayload(values));
}
export function buildPayload(values, options = {}) {
  const shouldPersistRoadmapFields = shouldShowRoadmapFields(values, options);
  const sharedPayload = {
    workspacePurpose: values.workspacePurpose,
    analysisId: values.analysisId || null,
    knowledgeInput: values.knowledgeInput.trim(),
    knowledgeDescription: values.knowledgeDescription.trim() || null,
    inferredDomain: values.inferredDomain || null,
    selectedKnowledgeOptionId: values.selectedKnowledgeOptionId || null,
    selectedDomainOptionId: values.selectedDomainOptionId || null,
    selectedKnowledgeOption: values.selectedKnowledgeOption?.trim() || values.knowledgeInput.trim() || null,
    enableRoadmap: options?.canCreateRoadmap === false
      ? false
      : (values.workspacePurpose === 'STUDY_NEW' ? true : Boolean(values.enableRoadmap)),
    currentLevel: values.currentLevel.trim(),
    learningGoal: values.learningGoal.trim(),
    strongAreas: values.strongAreas.trim() || null,
    weakAreas: values.weakAreas.trim() || null,
    knowledgeLoad: shouldPersistRoadmapFields ? values.knowledgeLoad || null : null,
    adaptationMode: shouldPersistRoadmapFields ? values.adaptationMode || null : null,
    roadmapSpeedMode: shouldPersistRoadmapFields ? values.roadmapSpeedMode || null : null,
    estimatedTotalDays: shouldPersistRoadmapFields ? Number(values.estimatedTotalDays) || null : null,
    recommendedMinutesPerDay: shouldPersistRoadmapFields ? Number(values.recommendedMinutesPerDay) || null : null,
    improvementFocus: [],
  };
  const mockTestPayload =
    values.workspacePurpose === 'MOCK_TEST'
      ? {
          mockExamName: values.mockExamName?.trim() || null,
          templatePrompt: values.templatePrompt.trim() || null,
          templateFormat: values.templateFormat || null,
          templateDurationMinutes: Number(values.templateDurationMinutes) || null,
          templateQuestionCount: Number(values.templateQuestionCount) || null,
          templateNotes: values.templateNotes.trim() || null,
          templateTotalSectionPoints: Number(values.templateTotalSectionPoints) || null,
          targetScore: null,
          targetScoreScale: null,
          expectedExamDate: null,
        }
      : {
          mockExamName: null,
          templatePrompt: null,
          templateFormat: null,
          templateDurationMinutes: null,
          templateQuestionCount: null,
          templateNotes: null,
          templateTotalSectionPoints: null,
          targetScore: null,
          targetScoreScale: null,
          expectedExamDate: null,
        };
  return {
    ...sharedPayload,
    ...mockTestPayload,
    customDomain: values.inferredDomain || null,
    customKnowledge: values.knowledgeInput.trim() || null,
    customCurrentLevel: values.currentLevel.trim() || null,
    learningGoal: values.learningGoal.trim() || null,
    strongAreas: values.strongAreas.trim() || null,
    weakAreas: values.weakAreas.trim() || null,
  };
}
export function normalizeSnapshotText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
export function normalizeSnapshotList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join('|');
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n;/]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join('|');
  }
  return '';
}
export function normalizeSnapshotNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
export function normalizeFingerprintValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeFingerprintValue(item))
      .filter((item) => item !== '' && item !== null)
      .sort();
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        const normalized = normalizeFingerprintValue(value[key]);
        const isEmptyObject =
          normalized
          && typeof normalized === 'object'
          && !Array.isArray(normalized)
          && Object.keys(normalized).length === 0;
        if (normalized === '' || normalized === null || isEmptyObject) {
          return result;
        }
        result[key] = normalized;
        return result;
      }, {});
  }
  if (typeof value === 'string') {
    return value.trim().replace(/\s+/g, ' ');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null;
  }
  return value ?? null;
}
export function buildRequestFingerprint(payload) {
  return JSON.stringify(normalizeFingerprintValue(payload));
}
export function buildStepSnapshot(stepNumber, values, options = {}) {
  if (!values || typeof values !== 'object') {
    return null;
  }
  if (stepNumber === 1) {
    return {
      workspacePurpose: normalizeSnapshotText(values.workspacePurpose),
      knowledgeInput: normalizeSnapshotText(values.knowledgeInput),
      knowledgeDescription: normalizeSnapshotText(values.knowledgeDescription),
      inferredDomain: normalizeSnapshotText(values.inferredDomain),
      analysisId: normalizeSnapshotText(values.analysisId),
      selectedKnowledgeOptionId: normalizeSnapshotText(values.selectedKnowledgeOptionId),
      selectedDomainOptionId: normalizeSnapshotText(values.selectedDomainOptionId),
      selectedKnowledgeOption: normalizeSnapshotText(values.selectedKnowledgeOption),
      enableRoadmap: values.workspacePurpose === 'STUDY_NEW' ? true : Boolean(values.enableRoadmap),
    };
  }
  if (stepNumber === 2) {
    return {
      workspacePurpose: normalizeSnapshotText(values.workspacePurpose),
      currentLevel: normalizeSnapshotText(values.currentLevel),
      learningGoal: normalizeSnapshotText(values.learningGoal),
      strongAreas: normalizeSnapshotList(values.strongAreas),
      weakAreas: normalizeSnapshotList(values.weakAreas),
      mockExamName:
        values.workspacePurpose === 'MOCK_TEST'
          ? normalizeSnapshotText(values.mockExamName)
          : '',
      templatePrompt: values.workspacePurpose === 'MOCK_TEST' ? normalizeSnapshotText(values.templatePrompt) : '',
      templateFormat: values.workspacePurpose === 'MOCK_TEST' ? normalizeSnapshotText(values.templateFormat) : '',
      templateDurationMinutes:
        values.workspacePurpose === 'MOCK_TEST' ? normalizeSnapshotNumber(values.templateDurationMinutes) : null,
      templateQuestionCount:
        values.workspacePurpose === 'MOCK_TEST' ? normalizeSnapshotNumber(values.templateQuestionCount) : null,
      templateNotes: values.workspacePurpose === 'MOCK_TEST' ? normalizeSnapshotText(values.templateNotes) : '',
      templateTotalSectionPoints:
        values.workspacePurpose === 'MOCK_TEST' ? normalizeSnapshotNumber(values.templateTotalSectionPoints) : null,
    };
  }
  if (stepNumber === 3) {
    const showRoadmapFields = shouldShowRoadmapFields(values, options);
    return {
      showRoadmapFields,
      knowledgeLoad: showRoadmapFields ? normalizeSnapshotText(values.knowledgeLoad) : '',
      adaptationMode: showRoadmapFields ? normalizeSnapshotText(values.adaptationMode) : '',
      roadmapSpeedMode: showRoadmapFields ? normalizeSnapshotText(values.roadmapSpeedMode) : '',
      estimatedTotalDays: showRoadmapFields ? normalizeSnapshotNumber(values.estimatedTotalDays) : null,
      recommendedMinutesPerDay:
        showRoadmapFields ? normalizeSnapshotNumber(values.recommendedMinutesPerDay) : null,
    };
  }
  return null;
}
export function areStepSnapshotsEqual(leftSnapshot, rightSnapshot) {
  return JSON.stringify(leftSnapshot ?? null) === JSON.stringify(rightSnapshot ?? null);
}
export function createSavedStepSnapshots(initialData, values, initialStep, totalSteps = ROADMAP_FLOW_TOTAL_STEPS, options = {}) {
  if (!values || typeof values !== 'object') {
    return {};
  }
  const snapshots = {};
  if (initialStep >= 2 || hasBasicStepData(initialData)) {
    snapshots[1] = buildStepSnapshot(1, values, options);
  }
  if (initialStep >= 3 || hasPersonalInfoStepData(initialData)) {
    snapshots[2] = buildStepSnapshot(2, values, options);
  }
  if (
    totalSteps >= 3
    && (
    initialStep >= 3
    || hasRoadmapStepData(initialData)
    || initialData?.workspaceSetupStatus === 'DONE'
    || initialData?.onboardingCompleted
    )
  ) {
    snapshots[3] = buildStepSnapshot(3, values, options);
  }
  return snapshots;
}
export function mapLearningModeForApi(purpose) {
  const normalizedPurpose = normalizeWorkspacePurpose(purpose, 'STUDY_NEW');
  return normalizedPurpose === 'REVIEW' ? 'REVIEW' : 'STUDY_NEW';
}
export function validateWorkspaceProfileStep({
  targetStep,
  values,
  t,
  analysisStatus,
  canCreateRoadmap,
}) {
  const nextErrors = {};
  if (targetStep === 1) {
    const knowledgeInputError = getLiveFieldErrorMessage('knowledgeInput', values.knowledgeInput, t);
    const knowledgeReady = Boolean(getReadyLiveFieldValue('knowledgeInput', values.knowledgeInput));
    if (!values.workspacePurpose) nextErrors.workspacePurpose = t('workspace.profileConfig.validation.purposeRequired');
    if (!values.knowledgeInput.trim()) {
      nextErrors.knowledgeInput = t('workspace.profileConfig.validation.knowledgeRequired');
    } else if (knowledgeInputError) {
      nextErrors.knowledgeInput = knowledgeInputError;
    }
    if (!knowledgeReady) {
      return nextErrors;
    }
    if (analysisStatus === 'loading') {
      nextErrors.inferredDomain = translateOrFallback(
        t,
        'workspace.profileConfig.validation.waitForAi',
        t(
          'useWorkspaceProfileWizard.validation.waitForAi',
          'Please wait for the AI to finish analyzing your knowledge.'
        )
      );
    } else if (analysisStatus === 'error') {
      nextErrors.inferredDomain = translateOrFallback(
        t,
        'workspace.profileConfig.validation.aiAnalysisError',
        t(
          'useWorkspaceProfileWizard.validation.aiAnalysisError',
          'AI analysis failed. Please try again.'
        )
      );
    } else if (analysisStatus !== 'success') {
      nextErrors.inferredDomain = translateOrFallback(
        t,
        'workspace.profileConfig.validation.waitForAi',
        t(
          'useWorkspaceProfileWizard.validation.waitForAi',
          'Please wait for the AI to finish analyzing your knowledge.'
        )
      );
    }
    if (!values.inferredDomain) {
      nextErrors.inferredDomain = translateOrFallback(
        t,
        'workspace.profileConfig.validation.domainRequired',
        t(
          'useWorkspaceProfileWizard.validation.domainRequired',
          'Please select a domain suggested by the AI.'
        )
      );
    }
    if (values.inferredDomain && !values.selectedDomainOptionId) {
      nextErrors.inferredDomain = translateOrFallback(
        t,
        'workspace.profileConfig.validation.domainRequired',
        t(
          'useWorkspaceProfileWizard.validation.domainRequired',
          'Please select a domain suggested by the AI.'
        )
      );
    }
  }
  if (targetStep === 2) {
    const beginnerMode = isAbsoluteBeginnerLevel(values.currentLevel);
    const currentLevelError = getLiveFieldErrorMessage('currentLevel', values.currentLevel, t);
    const learningGoalError = getLiveFieldErrorMessage('learningGoal', values.learningGoal, t);
    const strongAreasError = getLiveFieldErrorMessage('strongAreas', values.strongAreas, t);
    const weakAreasError = getLiveFieldErrorMessage('weakAreas', values.weakAreas, t);
    const mockExamNameError = getLiveFieldErrorMessage('mockExamName', values.mockExamName, t);
    if (!values.currentLevel.trim()) {
      nextErrors.currentLevel = t('workspace.profileConfig.validation.currentLevelRequired');
    } else if (currentLevelError) {
      nextErrors.currentLevel = currentLevelError;
    }
    if (!values.learningGoal.trim()) {
      nextErrors.learningGoal = t('workspace.profileConfig.validation.learningGoalRequired');
    } else if (learningGoalError) {
      nextErrors.learningGoal = learningGoalError;
    }
    if (values.workspacePurpose === 'REVIEW' && !beginnerMode && !values.strongAreas.trim()) {
      nextErrors.strongAreas = t('workspace.profileConfig.validation.strongAreasRequired');
    } else if (values.strongAreas.trim() && strongAreasError) {
      nextErrors.strongAreas = strongAreasError;
    }
    if (values.workspacePurpose === 'REVIEW' && !beginnerMode && !values.weakAreas.trim()) {
      nextErrors.weakAreas = t('workspace.profileConfig.validation.weakAreasRequired');
    } else if (values.weakAreas.trim() && weakAreasError) {
      nextErrors.weakAreas = weakAreasError;
    }
    if (values.workspacePurpose === 'MOCK_TEST') {
      if (!values.mockExamName?.trim()) {
        nextErrors.mockExamName = t('workspace.profileConfig.validation.privateExamRequired');
      } else if (mockExamNameError) {
        nextErrors.mockExamName = mockExamNameError;
      }
    }
  }
  if (targetStep === 3 && shouldShowRoadmapFields(values, { canCreateRoadmap })) {
    if (!values.knowledgeLoad) nextErrors.knowledgeLoad = t('workspace.profileConfig.validation.knowledgeLoadRequired');
    if (!values.adaptationMode) nextErrors.adaptationMode = t('workspace.profileConfig.validation.adaptationModeRequired');
    if (!values.roadmapSpeedMode) nextErrors.roadmapSpeedMode = t('workspace.profileConfig.validation.roadmapSpeedModeRequired');
    if (!validatePositiveNumber(values.estimatedTotalDays)) {
      nextErrors.estimatedTotalDays = t('workspace.profileConfig.validation.estimatedTotalDaysRequired');
    }
    if (!validatePositiveNumber(values.recommendedMinutesPerDay)) {
      nextErrors.recommendedMinutesPerDay = t('workspace.profileConfig.validation.recommendedMinutesRequired');
    }
  }
  return nextErrors;
}
export function buildWizardStatus({
  isWaitingForOverallReview,
  t,
  values,
  mockTestGenerationMessage,
  mockTestGenerationState,
}) {
  const statusNotice = isWaitingForOverallReview
    ? translateOrFallback(
      t,
      'workspace.profileConfig.stepTwo.overallReviewLoadingTitle',
      t(
        'useWorkspaceProfileWizard.overallReviewLoadingTitle',
        'QuizMate AI is performing an overall review'
      )
    )
    : values.workspacePurpose === 'MOCK_TEST'
      ? mockTestGenerationMessage
      : '';
  const statusTone = isWaitingForOverallReview
    ? 'info'
    : values.workspacePurpose === 'MOCK_TEST'
      ? mockTestGenerationState === 'ready'
        ? 'success'
        : mockTestGenerationState === 'error'
          ? 'error'
          : mockTestGenerationState === 'pending'
            ? 'info'
            : null
      : null;
  return { statusNotice, statusTone };
}
export function canFetchFieldSuggestions(values) {
  if (!values.workspacePurpose) {
    return false;
  }
  if (!getSelectedKnowledgeForAi(values)) {
    return false;
  }
  if (!getSelectedDomainForAi(values)) {
    return false;
  }
  return !(
    hasBlockingLiveFieldValue('currentLevel', values.currentLevel)
    || hasBlockingLiveFieldValue('strongAreas', values.strongAreas)
    || hasBlockingLiveFieldValue('weakAreas', values.weakAreas)
  );
}
export function canFetchExamTemplateSuggestions(values) {
  return Boolean(
    getSelectedKnowledgeForAi(values)
    && getSelectedDomainForAi(values)
  );
}
export function getStudyProfileAnalysisErrorType(error) {
  const statusCode = Number(error?.data?.statusCode ?? error?.code);
  if (statusCode === STUDY_PROFILE_ANALYSIS_ERROR_CODES.EXPIRED) {
    return 'STUDY_PROFILE_ANALYSIS_EXPIRED';
  }
  if (statusCode === STUDY_PROFILE_ANALYSIS_ERROR_CODES.NOT_FOUND) {
    return 'STUDY_PROFILE_ANALYSIS_NOT_FOUND';
  }
  if (statusCode === STUDY_PROFILE_ANALYSIS_ERROR_CODES.OPTION_INVALID) {
    return 'STUDY_PROFILE_ANALYSIS_OPTION_INVALID';
  }
  return '';
}
