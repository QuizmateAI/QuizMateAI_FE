import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateTemplateSuggestion,
  getRecommendedRoadmapDays,
  getRecommendedRoadmapMinutesPerDay,
  inferKnowledgeLoadFromRoadmapConfig,
  inferRoadmapSpeedModeFromDays,
  normalizeKnowledgeLoad,
} from './mockProfileWizardData';
import { isAbsoluteBeginnerLevel } from './profileWizardBeginnerUtils';
import {
  analyzeKnowledge,
  searchStudyCatalog,
  suggestProfileFields,
  suggestExamTemplates,
  validateProfileConsistency,
} from '@/api/StudyProfileAPI';

const ROADMAP_FLOW_TOTAL_STEPS = 3;
const NO_ROADMAP_FLOW_TOTAL_STEPS = 2;
const ANALYSIS_DEBOUNCE_MS = 900;
const FIELD_SUGGESTION_DEBOUNCE_MS = 700;
const EXAM_TEMPLATE_SUGGESTION_DEBOUNCE_MS = 700;
const CONSISTENCY_DEBOUNCE_MS = 1000;
const LIVE_ALLOWED_INPUT_REGEX = /^[\p{L}\p{M}\p{N}\s.,:;!?()[\]/'"&+#%+-]*$/u;
const SHORT_KNOWLEDGE_TOKEN_REGEX = /^[\p{L}\p{M}\p{N}#+./-]{2,5}$/u;
const REPEATED_CHARACTER_REGEX = /(.)\1{5,}/u;
const STUDY_PROFILE_ANALYSIS_ERROR_CODES = {
  EXPIRED: 1190,
  NOT_FOUND: 1191,
  OPTION_INVALID: 1192,
};
const LIVE_INPUT_RULES = {
  knowledgeInput: {
    minCompactLength: 3,
    minMeaningfulChars: 3,
    allowShortToken: true,
  },
  inferredDomain: {
    minCompactLength: 2,
    minMeaningfulChars: 2,
  },
  currentLevel: {
    minCompactLength: 4,
    minMeaningfulChars: 4,
  },
  learningGoal: {
    minCompactLength: 10,
    minMeaningfulChars: 10,
  },
  strongAreas: {
    minCompactLength: 4,
    minMeaningfulChars: 4,
  },
  weakAreas: {
    minCompactLength: 4,
    minMeaningfulChars: 4,
  },
  mockExamName: {
    minCompactLength: 3,
    minMeaningfulChars: 3,
    allowShortToken: true,
  },
};

function ensureString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function ensureTextValue(value, fallback = '') {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ');
  }

  return ensureString(value, fallback);
}

function ensureNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasTextValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && item.trim().length > 0);
  }

  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeWorkspacePurpose(value, fallback = '', options = {}) {
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

function normalizeLiveInput(value) {
  return ensureString(value).replace(/\r\n/g, '\n').trim();
}

function getCompactLiveInputLength(value) {
  return normalizeLiveInput(value).replace(/\s+/g, '').length;
}

function countMeaningfulLiveChars(value) {
  return (normalizeLiveInput(value).match(/[\p{L}\p{M}\p{N}+#]/gu) || []).length;
}

function hasInvalidLiveCharacters(value) {
  const normalizedValue = normalizeLiveInput(value);
  return normalizedValue.length > 0 && !LIVE_ALLOWED_INPUT_REGEX.test(normalizedValue);
}

function isRepeatedNoiseText(value) {
  const compactValue = normalizeLiveInput(value).replace(/\s+/g, '');
  return compactValue.length > 0 && REPEATED_CHARACTER_REGEX.test(compactValue);
}

function isShortSemanticToken(value) {
  const compactValue = normalizeLiveInput(value).replace(/\s+/g, '');
  return SHORT_KNOWLEDGE_TOKEN_REGEX.test(compactValue);
}

function evaluateLiveInputValue(value, rule = {}) {
  const normalizedValue = normalizeLiveInput(value);

  if (!normalizedValue) {
    return {
      status: 'empty',
      normalizedValue,
      reason: '',
    };
  }

  if (hasInvalidLiveCharacters(normalizedValue)) {
    return {
      status: 'invalid',
      normalizedValue,
      reason: 'invalidCharacters',
    };
  }

  if (isRepeatedNoiseText(normalizedValue)) {
    return {
      status: 'invalid',
      normalizedValue,
      reason: 'noise',
    };
  }

  const compactLength = getCompactLiveInputLength(normalizedValue);
  const meaningfulChars = countMeaningfulLiveChars(normalizedValue);

  if (rule.allowShortToken && isShortSemanticToken(normalizedValue)) {
    return {
      status: 'ready',
      normalizedValue,
      reason: '',
    };
  }

  if (
    compactLength < (rule.minCompactLength || 1)
    || meaningfulChars < (rule.minMeaningfulChars || 1)
  ) {
    return {
      status: 'invalid',
      normalizedValue,
      reason: 'tooShort',
    };
  }

  return {
    status: 'ready',
    normalizedValue,
    reason: '',
  };
}

function getLiveFieldEvaluation(field, value) {
  return evaluateLiveInputValue(value, LIVE_INPUT_RULES[field] || {});
}

function getReadyLiveFieldValue(field, value) {
  const evaluation = getLiveFieldEvaluation(field, value);
  return evaluation.status === 'ready' ? evaluation.normalizedValue : '';
}

function hasBlockingLiveFieldValue(field, value) {
  const evaluation = getLiveFieldEvaluation(field, value);
  return evaluation.status === 'invalid';
}

function hasBasicStepData(initialData) {
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

function hasCompleteBasicStepData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;

  return Boolean(
    hasTextValue(initialData?.workspacePurpose || initialData?.learningMode)
    && hasTextValue(initialData?.knowledgeInput || initialData?.knowledge || initialData?.customKnowledge)
    && hasTextValue(initialData?.inferredDomain || initialData?.domain || initialData?.customDomain)
  );
}

function hasPersonalInfoStepData(initialData) {
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

function hasRoadmapStepData(initialData) {
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

function hasProfileData(initialData) {
  return (
    hasBasicStepData(initialData)
    || hasPersonalInfoStepData(initialData)
    || hasRoadmapStepData(initialData)
    || hasTextValue(initialData?.knowledgeDescription)
    || hasTextValue(initialData?.customSchemeDescription)
  );
}

function createInitialValues(initialData, options = {}) {
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

function readStoredStep(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null;

  const storedStep = Number(window.sessionStorage.getItem(storageKey));
  return Number.isFinite(storedStep) ? storedStep : null;
}

function getInitialStep(initialData, isReadOnly, storageKey, totalSteps = ROADMAP_FLOW_TOTAL_STEPS) {
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

function shouldShowRoadmapFields(values, options = {}) {
  if (options?.canCreateRoadmap === false) {
    return false;
  }

  return values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap;
}

function getTotalStepsForValues(values, options = {}) {
  return shouldShowRoadmapFields(values, options)
    ? ROADMAP_FLOW_TOTAL_STEPS
    : NO_ROADMAP_FLOW_TOTAL_STEPS;
}

function validatePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function normalizeAdaptationMode(value) {
  return value === 'FLEXIBLE' ? 'FLEXIBLE' : 'BALANCED';
}

function normalizeRoadmapSpeedMode(value) {
  if (value === 'SLOW') return 'SLOW';
  if (value === 'FAST') return 'FAST';
  return 'STANDARD';
}

function syncRoadmapConfigFields(currentValues, field, value) {
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

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function normalizeReasonText(value) {
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

function isEnglishVietnamesePairSignal(knowledge) {
  const normalizedKnowledge = normalizeReasonText(knowledge);
  if (!normalizedKnowledge) return false;

  const exactShortPair = normalizedKnowledge === 'anh viet' || normalizedKnowledge === 'viet anh';
  const hasExplicitEnglish = normalizedKnowledge.includes('tieng anh') || normalizedKnowledge.includes('english');
  const hasExplicitVietnamese = normalizedKnowledge.includes('tieng viet') || normalizedKnowledge.includes('vietnamese');
  const tokens = normalizedKnowledge.split(' ').filter(Boolean);
  const hasShortPair = tokens.includes('anh') && tokens.includes('viet') && tokens.length <= 3;

  return exactShortPair || (hasExplicitEnglish && hasExplicitVietnamese) || hasShortPair;
}

function resolveDomainReasonType(label, knowledge, index) {
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

function extractDomainSuggestionDetails(result) {
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

function normalizeDomainSuggestionDetail(detail) {
  if (!detail || typeof detail !== 'object') return null;

  const label = (detail.domain || detail.domainTitle || detail.title || detail.label || detail.name || '').toString().trim();
  const reason = (detail.reason || detail.rationale || detail.explanation || detail.message || detail.detail || '').toString().trim();

  if (!label) return null;

  return {
    label,
    reason: reason || '',
  };
}

function buildDomainOptionsFromApi({ domainSuggestions, domainSuggestionDetails, knowledge, domainOptions = [] }) {
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

function buildKnowledgeOptionsFromApi({ knowledgeOptions = [], knowledge, domainOptions = [] }) {
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

function localizeDomainOptions(options, t) {
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

function getSelectedKnowledgeForAi(values) {
  const selectedKnowledge = ensureString(values.selectedKnowledgeOption).trim();
  if (selectedKnowledge) {
    return selectedKnowledge;
  }
  return getReadyLiveFieldValue('knowledgeInput', values.knowledgeInput);
}

function getSelectedDomainForAi(values) {
  return ensureString(values.inferredDomain).trim() || getReadyLiveFieldValue('inferredDomain', values.inferredDomain);
}

function splitProfileFieldValues(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[,\n;/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFieldSuggestionPayload(values) {
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

function buildExamTemplateSuggestionPayload(values) {
  return {
    knowledge: getSelectedKnowledgeForAi(values),
    domain: getSelectedDomainForAi(values),
  };
}

function buildConsistencyPayload(values) {
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

function shouldRunLiveConsistency(values) {
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

function buildConsistencyFingerprint(values) {
  return buildRequestFingerprint(buildConsistencyPayload(values));
}

function buildPayload(values, options = {}) {
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

function normalizeSnapshotText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSnapshotList(value) {
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

function normalizeSnapshotNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFingerprintValue(value) {
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

function buildRequestFingerprint(payload) {
  return JSON.stringify(normalizeFingerprintValue(payload));
}

function buildStepSnapshot(stepNumber, values, options = {}) {
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

function areStepSnapshotsEqual(leftSnapshot, rightSnapshot) {
  return JSON.stringify(leftSnapshot ?? null) === JSON.stringify(rightSnapshot ?? null);
}

function createSavedStepSnapshots(initialData, values, initialStep, totalSteps = ROADMAP_FLOW_TOTAL_STEPS, options = {}) {
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

function mapLearningModeForApi(purpose) {
  const normalizedPurpose = normalizeWorkspacePurpose(purpose, 'STUDY_NEW');
  return normalizedPurpose === 'REVIEW' ? 'REVIEW' : 'STUDY_NEW';
}

function getLiveFieldErrorMessage(field, value, t) {
  const evaluation = getLiveFieldEvaluation(field, value);

  if (evaluation.status !== 'invalid') {
    return '';
  }

  if (evaluation.reason === 'invalidCharacters') {
    return translateOrFallback(
      t,
      `workspace.profileConfig.validation.${field}InvalidCharacters`,
      t(
        'useWorkspaceProfileWizard.validation.invalidCharacters',
        'Only use letters, numbers, and basic punctuation. Invalid characters will not be sent to the AI.'
      )
    );
  }

  if (evaluation.reason === 'noise') {
    return translateOrFallback(
      t,
      `workspace.profileConfig.validation.${field}Noise`,
      t(
        'useWorkspaceProfileWizard.validation.noise',
        'The content has too many repeated characters or symbols. Please enter it more clearly before the system calls the AI.'
      )
    );
  }

  switch (field) {
    case 'knowledgeInput':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.knowledgeInputTooShort',
        t(
          'useWorkspaceProfileWizard.validation.knowledgeInputTooShort',
          'Enter at least 3 meaningful characters so the AI can analyze your knowledge.'
        )
      );
    case 'currentLevel':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.currentLevelTooShort',
        t(
          'useWorkspaceProfileWizard.validation.currentLevelTooShort',
          'Describe your current level with at least 4 meaningful characters.'
        )
      );
    case 'learningGoal':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.learningGoalTooShort',
        t(
          'useWorkspaceProfileWizard.validation.learningGoalTooShort',
          'Your learning goal should have at least 10 meaningful characters before being sent to the AI.'
        )
      );
    case 'strongAreas':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.strongAreasTooShort',
        t(
          'useWorkspaceProfileWizard.validation.strongAreasTooShort',
          'Strong areas should have at least 4 meaningful characters.'
        )
      );
    case 'weakAreas':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.weakAreasTooShort',
        t(
          'useWorkspaceProfileWizard.validation.weakAreasTooShort',
          'Weak areas should have at least 4 meaningful characters.'
        )
      );
    case 'mockExamName':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.mockExamNameTooShort',
        t(
          'useWorkspaceProfileWizard.validation.mockExamNameTooShort',
          'The exam name should have at least 3 meaningful characters.'
        )
      );
    case 'inferredDomain':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.inferredDomainTooShort',
        t(
          'useWorkspaceProfileWizard.validation.inferredDomainTooShort',
          'The domain needs at least 2 meaningful characters.'
        )
      );
    default:
      return translateOrFallback(
        t,
        `workspace.profileConfig.validation.${field}TooShort`,
        t(
          'useWorkspaceProfileWizard.validation.defaultTooShort',
          'The content is still too short to be sent to the AI.'
        )
      );
  }
}

function buildLiveValidationErrors(values, t) {
  const nextErrors = {};

  ['knowledgeInput', 'currentLevel', 'learningGoal', 'strongAreas', 'weakAreas', 'mockExamName'].forEach((field) => {
    if (!hasTextValue(values?.[field])) {
      return;
    }

    const message = getLiveFieldErrorMessage(field, values[field], t);
    if (message) {
      nextErrors[field] = message;
    }
  });

  return nextErrors;
}

function canFetchFieldSuggestions(values) {
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

function canFetchExamTemplateSuggestions(values) {
  return Boolean(
    getSelectedKnowledgeForAi(values)
    && getSelectedDomainForAi(values)
  );
}

function getStudyProfileAnalysisErrorType(error) {
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

export function useWorkspaceProfileWizard({
  open,
  initialData,
  onSave,
  storageKey,
  canCreateRoadmap = true,
  forceStartAtStepOne = false,
  mockTestGenerationState = 'idle',
  mockTestGenerationMessage = '',
  mockTestGenerationProgress = 0,
  t,
  isReadOnly = false,
}) {
  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [values, setValues] = useState(() => createInitialValues(initialData, { canCreateRoadmap }));
  const totalSteps = getTotalStepsForValues(values, { canCreateRoadmap });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [knowledgeOptions, setKnowledgeOptions] = useState([]);
  const [domainOptions, setDomainOptions] = useState([]);
  const [templateStatus, setTemplateStatus] = useState('idle');
  const [templatePreview, setTemplatePreview] = useState(null);
  const [examSearch, setExamSearch] = useState('');
  const [analysisRetryTick, setAnalysisRetryTick] = useState(0);

  // AI analysis state
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState(null);
  const [fieldSuggestions, setFieldSuggestions] = useState(null);
  const [fieldSuggestionStatus, setFieldSuggestionStatus] = useState('idle');
  const [examTemplateSuggestions, setExamTemplateSuggestions] = useState([]);
  const [examTemplateSuggestionStatus, setExamTemplateSuggestionStatus] = useState('idle');
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [consistencyStatus, setConsistencyStatus] = useState('idle');
  const liveValidationErrors = buildLiveValidationErrors(values, t);
  const mergedErrors = {
    ...errors,
    ...liveValidationErrors,
  };

  const analysisTimerRef = useRef(null);
  const analysisAbortRef = useRef(null);
  const fieldSuggestionTimerRef = useRef(null);
  const fieldSuggestionAbortRef = useRef(null);
  const examTemplateSuggestionTimerRef = useRef(null);
  const examTemplateSuggestionAbortRef = useRef(null);
  const consistencyTimerRef = useRef(null);
  const consistencyAbortRef = useRef(null);
  const templateTimerRef = useRef(null);
  const analysisFingerprintRef = useRef('');
  const fieldSuggestionFingerprintRef = useRef('');
  const examTemplateSuggestionFingerprintRef = useRef('');
  const consistencyFingerprintRef = useRef('');
  const wasOpenRef = useRef(false);
  const prevStepRef = useRef(null);
  const savedStepSnapshotsRef = useRef({});
  const basicStepChangeResetGuardRef = useRef(false);

  const needsKnowledgeDescription =
    analysisStatus === 'success' && knowledgeAnalysis?.tooBroad === true;
  const canRequestKnowledgeAnalysis = Boolean(getReadyLiveFieldValue('knowledgeInput', values.knowledgeInput));
  const canRequestFieldSuggestion = canFetchFieldSuggestions(values);
  const canRequestExamTemplateSuggestion = canFetchExamTemplateSuggestions(values);
  const shouldAwaitOverallReview = step === 2 && shouldRunLiveConsistency(values);
  const currentConsistencyFingerprint = shouldAwaitOverallReview
    ? buildConsistencyFingerprint(values)
    : '';
  const hasCompletedOverallReview =
    shouldAwaitOverallReview
    && consistencyStatus === 'success'
    && Boolean(consistencyResult)
    && consistencyFingerprintRef.current === currentConsistencyFingerprint;
  const isWaitingForOverallReview = shouldAwaitOverallReview && !hasCompletedOverallReview;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(analysisTimerRef.current);
      clearTimeout(fieldSuggestionTimerRef.current);
      clearTimeout(examTemplateSuggestionTimerRef.current);
      clearTimeout(consistencyTimerRef.current);
      clearTimeout(templateTimerRef.current);
      analysisAbortRef.current?.abort();
      fieldSuggestionAbortRef.current?.abort();
      examTemplateSuggestionAbortRef.current?.abort();
      consistencyAbortRef.current?.abort();
    };
  }, []);

  // Dialog open/close reset
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      prevStepRef.current = null;
      return;
    }

    if (wasOpenRef.current) return;

    wasOpenRef.current = true;

    if (forceStartAtStepOne && storageKey && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKey);
    }

    const nextValues = createInitialValues(initialData, { canCreateRoadmap });

    const initialTotalSteps = getTotalStepsForValues(nextValues, { canCreateRoadmap });
    const initialStepValue = forceStartAtStepOne
      ? 1
      : getInitialStep(initialData, isReadOnly, storageKey, initialTotalSteps);
    savedStepSnapshotsRef.current = forceStartAtStepOne
      ? {}
      : createSavedStepSnapshots(
        initialData,
        nextValues,
        initialStepValue,
        initialTotalSteps,
        { canCreateRoadmap },
      );
    prevStepRef.current = null;
    setStep(initialStepValue);
    setMaxUnlockedStep(Math.max(1, initialStepValue));
    setValues(nextValues);
    setErrors({});
    setSaveError('');
    setSubmitting(false);
    setDomainOptions([]);
    setKnowledgeAnalysis(null);
    analysisFingerprintRef.current = '';
    fieldSuggestionFingerprintRef.current = '';
    examTemplateSuggestionFingerprintRef.current = '';
    consistencyFingerprintRef.current = '';
    setAnalysisRetryTick(0);
    setFieldSuggestions(null);
    setFieldSuggestionStatus('idle');
    setExamTemplateSuggestions([]);
    setExamTemplateSuggestionStatus('idle');
    setConsistencyResult(null);
    setConsistencyStatus('idle');
    setAnalysisStatus(getReadyLiveFieldValue('knowledgeInput', nextValues.knowledgeInput) ? 'loading' : 'idle');
    const canPrimeMockTemplate = nextValues.workspacePurpose === 'MOCK_TEST' && nextValues.mockExamName;
    setTemplateStatus(nextValues.templatePrompt || canPrimeMockTemplate ? 'success' : 'idle');
    setTemplatePreview(
      nextValues.templatePrompt || canPrimeMockTemplate
        ? generateTemplateSuggestion(nextValues)
        : null
    );
    setExamSearch(canPrimeMockTemplate ? nextValues.mockExamName || '' : '');
  }, [open, initialData, isReadOnly, storageKey, forceStartAtStepOne, canCreateRoadmap]);

  useEffect(() => {
    if (!open || canCreateRoadmap !== false) {
      return;
    }

    setValues((current) => {
      const nextPurpose = current.workspacePurpose === 'STUDY_NEW' || !current.workspacePurpose
        ? 'REVIEW'
        : current.workspacePurpose;

      if (nextPurpose === current.workspacePurpose && current.enableRoadmap === false) {
        return current;
      }

      return {
        ...current,
        workspacePurpose: nextPurpose,
        enableRoadmap: false,
      };
    });

    setStep((current) => Math.min(current, NO_ROADMAP_FLOW_TOTAL_STEPS));
    setMaxUnlockedStep((current) => Math.min(Math.max(current, 1), NO_ROADMAP_FLOW_TOTAL_STEPS));
  }, [open, canCreateRoadmap]);

  // Persist step to sessionStorage
  useEffect(() => {
    if (!open || !storageKey || typeof window === 'undefined') return;
    window.sessionStorage.setItem(storageKey, String(step));
  }, [open, step, storageKey]);



  // Advance to step 3 when mock test generation completes
  useEffect(() => {
    if (!open || isReadOnly) return;
    if (totalSteps < ROADMAP_FLOW_TOTAL_STEPS) return;
    if (step !== 2 || values.workspacePurpose !== 'MOCK_TEST') return;
    if (mockTestGenerationState !== 'ready') return;

    setSaveError('');
    setMaxUnlockedStep((current) => Math.max(current, 3));
    setStep(3);
  }, [open, isReadOnly, step, totalSteps, values.workspacePurpose, mockTestGenerationState]);

  // ─── Real AI Knowledge Analysis (debounced) ───
  useEffect(() => {
    if (!open) return;

    clearTimeout(analysisTimerRef.current);
    analysisAbortRef.current?.abort();

    const trimmedKnowledge = getReadyLiveFieldValue('knowledgeInput', values.knowledgeInput);
    const analysisFingerprint = buildRequestFingerprint({
      knowledge: trimmedKnowledge,
      retry: analysisRetryTick,
    });

    if (!canRequestKnowledgeAnalysis) {
      analysisFingerprintRef.current = '';
      setAnalysisStatus('idle');
      setKnowledgeOptions([]);
      setDomainOptions([]);
      setKnowledgeAnalysis(null);
      setValues((current) => ({
        ...current,
        analysisId: '',
        inferredDomain: '',
        selectedKnowledgeOptionId: '',
        selectedDomainOptionId: '',
        selectedKnowledgeOption: '',
      }));
      return;
    }

    if (analysisFingerprintRef.current === analysisFingerprint) {
      return;
    }

    analysisFingerprintRef.current = analysisFingerprint;
    setAnalysisStatus('loading');

    analysisTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      analysisAbortRef.current = abortController;

      try {
        const catalogResult = await searchStudyCatalog(trimmedKnowledge, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const catalogKnowledgeOptions = buildKnowledgeOptionsFromApi({
          knowledgeOptions: catalogResult?.knowledgeOptions || [],
          knowledge: values.knowledgeInput.trim(),
          domainOptions: buildDomainOptionsFromApi({
            domainOptions: catalogResult?.domainOptions || [],
            knowledge: values.knowledgeInput.trim(),
          }),
        });
        const catalogDomainOptions = localizeDomainOptions(
          buildDomainOptionsFromApi({
            domainOptions: catalogResult?.domainOptions || [],
            knowledge: values.knowledgeInput.trim(),
          }),
          t
        );

        const applyResolvedAnalysis = (result, { preferSelectedKnowledgeLabel = '', preferSelectedDomainLabel = '' } = {}) => {
          const rawDomainOptions = buildDomainOptionsFromApi({
            domainSuggestions: result?.domainSuggestions || [],
            domainSuggestionDetails: extractDomainSuggestionDetails(result),
            domainOptions: result?.domainOptions || [],
            knowledge: values.knowledgeInput.trim(),
          });
          const localizedDomainOptions = localizeDomainOptions(rawDomainOptions, t);
          const rawKnowledgeOptions = buildKnowledgeOptionsFromApi({
            knowledgeOptions: result?.knowledgeOptions || [],
            knowledge: values.knowledgeInput.trim(),
            domainOptions: localizedDomainOptions,
          });

          setKnowledgeAnalysis(result);
          setKnowledgeOptions(rawKnowledgeOptions);
          setDomainOptions(localizedDomainOptions);
          setAnalysisStatus('success');
          setValues((current) => {
            const preferredKnowledgeLabel = preferSelectedKnowledgeLabel || current.selectedKnowledgeOption || current.knowledgeInput.trim();
            const preferredDomainLabel = preferSelectedDomainLabel || current.inferredDomain;
            const matchedKnowledgeOption = rawKnowledgeOptions.find((option) => option.label === preferredKnowledgeLabel) || rawKnowledgeOptions[0] || null;
            const matchedDomainOption = localizedDomainOptions.find((option) => option.label === preferredDomainLabel)
              || localizedDomainOptions.find((option) => matchedKnowledgeOption?.suggestedDomainOptionIds?.includes(option.id))
              || localizedDomainOptions[0]
              || null;

            return {
              ...current,
              analysisId: result?.analysisId || '',
              selectedKnowledgeOptionId: matchedKnowledgeOption?.id || '',
              selectedKnowledgeOption: matchedKnowledgeOption?.label || '',
              inferredDomain: matchedDomainOption?.label || '',
              selectedDomainOptionId: matchedDomainOption?.id || '',
            };
          });
        };

        if (catalogKnowledgeOptions.length > 0 && catalogDomainOptions.length > 0) {
          applyResolvedAnalysis({
            analysisId: catalogResult?.analysisId || '',
            source: catalogResult?.source || 'CATALOG',
            warning: false,
            message: '',
            advice: '',
            tooBroad: false,
            quizCompatible: true,
            confidence: 1,
            normalizedKnowledge: catalogKnowledgeOptions[0]?.label || values.knowledgeInput.trim(),
            validationHighlights: [],
            refinementSuggestions: [],
            quizConstraintWarnings: [],
            knowledgeOptions: catalogResult?.knowledgeOptions || [],
            domainOptions: catalogResult?.domainOptions || [],
          });
          return;
        }

        const result = await analyzeKnowledge(trimmedKnowledge, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;
        applyResolvedAnalysis(result, {
          preferSelectedKnowledgeLabel: catalogKnowledgeOptions[0]?.label || '',
          preferSelectedDomainLabel: catalogDomainOptions[0]?.label || '',
        });
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[StudyProfile] Knowledge analysis failed:', error);
        analysisFingerprintRef.current = '';
        setAnalysisStatus('error');
        setKnowledgeAnalysis(null);
        setKnowledgeOptions([]);
        setDomainOptions([]);
      }
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      clearTimeout(analysisTimerRef.current);
      analysisAbortRef.current?.abort();
    };
  }, [open, values.knowledgeInput, analysisRetryTick, t, canRequestKnowledgeAnalysis]);

  // ─── Auto-fetch field suggestions when entering Step 2 ───
  const fetchFieldSuggestions = useCallback(
    async (payload) => {
      if (!payload?.knowledge || !payload?.domain || !payload?.learningMode) {
        fieldSuggestionFingerprintRef.current = '';
        setFieldSuggestions(null);
        setFieldSuggestionStatus('idle');
        return;
      }

      const fingerprint = buildRequestFingerprint(payload);
      if (fieldSuggestionFingerprintRef.current === fingerprint) {
        return;
      }

      fieldSuggestionFingerprintRef.current = fingerprint;
      fieldSuggestionAbortRef.current?.abort();
      const abortController = new AbortController();
      fieldSuggestionAbortRef.current = abortController;
      setFieldSuggestionStatus('loading');

      try {
        const result = await suggestProfileFields(payload, { signal: abortController.signal });

        if (abortController.signal.aborted) return;
        setFieldSuggestions(result);
        setFieldSuggestionStatus('success');
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[StudyProfile] Field suggestion failed:', error);
        fieldSuggestionFingerprintRef.current = '';
        setFieldSuggestionStatus('error');
        setFieldSuggestions(null);
      }
    },
    []
  );

  const fetchExamTemplateSuggestions = useCallback(
    async ({ knowledge, domain }) => {
      if (!knowledge || !domain) {
        examTemplateSuggestionFingerprintRef.current = '';
        setExamTemplateSuggestions([]);
        setExamTemplateSuggestionStatus('idle');
        return;
      }

      const payload = { knowledge, domain };
      const fingerprint = buildRequestFingerprint(payload);
      if (examTemplateSuggestionFingerprintRef.current === fingerprint) {
        return;
      }

      examTemplateSuggestionFingerprintRef.current = fingerprint;
      examTemplateSuggestionAbortRef.current?.abort();
      const abortController = new AbortController();
      examTemplateSuggestionAbortRef.current = abortController;
      setExamTemplateSuggestionStatus('loading');

      try {
        const response = await suggestExamTemplates(payload, { signal: abortController.signal });
        if (abortController.signal.aborted) return;

        const result = response?.data?.data ?? response?.data ?? response ?? null;
        const templates = Array.isArray(result?.templates)
          ? result.templates
          : Array.isArray(result?.examTemplateSuggestions)
            ? result.examTemplateSuggestions
          : Array.isArray(result)
            ? result
            : [];
        setExamTemplateSuggestions(templates.filter(Boolean));
        setExamTemplateSuggestionStatus('success');
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[StudyProfile] Exam template suggestion failed:', error);
        examTemplateSuggestionFingerprintRef.current = '';
        setExamTemplateSuggestionStatus('error');
        setExamTemplateSuggestions([]);
      }
    },
    []
  );

  const prefetchMockTestStepTwoAiSignals = useCallback(() => {
    if (!canFetchFieldSuggestions(values) || !canFetchExamTemplateSuggestions(values)) {
      return;
    }

    const fieldPayload = buildFieldSuggestionPayload(values);
    const templatePayload = buildExamTemplateSuggestionPayload(values);

    Promise.allSettled([
      fetchFieldSuggestions(fieldPayload),
      fetchExamTemplateSuggestions(templatePayload),
    ]).catch(() => {});
  }, [fetchExamTemplateSuggestions, fetchFieldSuggestions, values]);

  useEffect(() => {
    if (!open || isReadOnly) return;
    prevStepRef.current = step;
    clearTimeout(fieldSuggestionTimerRef.current);
    clearTimeout(examTemplateSuggestionTimerRef.current);

    if (step !== 2) {
      fieldSuggestionAbortRef.current?.abort();
      examTemplateSuggestionAbortRef.current?.abort();
      fieldSuggestionFingerprintRef.current = '';
      examTemplateSuggestionFingerprintRef.current = '';
      return;
    }

    if (canRequestFieldSuggestion) {
      const payload = buildFieldSuggestionPayload(values);
      fieldSuggestionTimerRef.current = setTimeout(() => {
        fetchFieldSuggestions(payload);
      }, FIELD_SUGGESTION_DEBOUNCE_MS);
    } else {
      fieldSuggestionTimerRef.current = null;
      if (!getSelectedKnowledgeForAi(values) || !getSelectedDomainForAi(values)) {
        fieldSuggestionFingerprintRef.current = '';
        setFieldSuggestions(null);
      }
      setFieldSuggestionStatus('idle');
    }

    if (values.workspacePurpose === 'MOCK_TEST' && canRequestExamTemplateSuggestion) {
      const knowledge = getSelectedKnowledgeForAi(values);
      const domain = getSelectedDomainForAi(values);
      examTemplateSuggestionTimerRef.current = setTimeout(() => {
        fetchExamTemplateSuggestions({ knowledge, domain });
      }, EXAM_TEMPLATE_SUGGESTION_DEBOUNCE_MS);
    } else {
      examTemplateSuggestionFingerprintRef.current = '';
      setExamTemplateSuggestions([]);
      setExamTemplateSuggestionStatus('idle');
    }

    return () => {
      clearTimeout(fieldSuggestionTimerRef.current);
      clearTimeout(examTemplateSuggestionTimerRef.current);
    };
  }, [
    open,
    step,
    isReadOnly,
    fetchFieldSuggestions,
    fetchExamTemplateSuggestions,
    values.workspacePurpose,
    values.knowledgeInput,
    values.selectedKnowledgeOption,
    values.selectedKnowledgeOptionId,
    values.inferredDomain,
    values.selectedDomainOptionId,
    values.currentLevel,
    values.strongAreas,
    values.weakAreas,
    canRequestFieldSuggestion,
    canRequestExamTemplateSuggestion,
  ]);

  const runConsistencyValidation = useCallback(
    async (payload, { signal } = {}) => {
      return validateProfileConsistency(payload, { signal });
    },
    []
  );

  useEffect(() => {
    if (!open || isReadOnly) return;

    clearTimeout(consistencyTimerRef.current);

    if (step !== 2 || !shouldRunLiveConsistency(values)) {
      consistencyAbortRef.current?.abort();
      consistencyFingerprintRef.current = '';
      setConsistencyResult(null);
      setConsistencyStatus('idle');
      return;
    }

    const payload = buildConsistencyPayload(values);
    const fingerprint = buildRequestFingerprint(payload);

    if (
      consistencyFingerprintRef.current === fingerprint
      && (consistencyStatus === 'loading' || (consistencyResult && consistencyStatus === 'success'))
    ) {
      return;
    }

    consistencyTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      consistencyAbortRef.current?.abort();
      consistencyAbortRef.current = abortController;
      consistencyFingerprintRef.current = fingerprint;
      setConsistencyStatus('loading');

      try {
        const result = await runConsistencyValidation(payload, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;
        setConsistencyResult(result);
        setConsistencyStatus('success');
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[StudyProfile] Live consistency validation failed:', error);
        consistencyFingerprintRef.current = '';
        setConsistencyStatus('error');
      }
    }, CONSISTENCY_DEBOUNCE_MS);

    return () => {
      clearTimeout(consistencyTimerRef.current);
    };
  }, [
    open,
    step,
    isReadOnly,
    runConsistencyValidation,
    values.workspacePurpose,
    values.knowledgeInput,
    values.selectedKnowledgeOption,
    values.selectedKnowledgeOptionId,
    values.inferredDomain,
    values.selectedDomainOptionId,
    values.currentLevel,
    values.learningGoal,
    values.strongAreas,
    values.weakAreas,
    values.mockExamName,
    consistencyResult,
    consistencyStatus,
  ]);

  function updateField(field, value) {
    setValues((current) => {
      const roadmapConfigPatch = syncRoadmapConfigFields(current, field, value);
      const normalizedPurposeValue =
        field === 'workspacePurpose'
          ? normalizeWorkspacePurpose(value, current.workspacePurpose || 'REVIEW', { canCreateRoadmap })
          : current.workspacePurpose;
      const enableRoadmapNext =
        canCreateRoadmap === false
          ? false
          : field === 'enableRoadmap'
            ? Boolean(value)
            : field === 'workspacePurpose'
              ? (normalizedPurposeValue === 'STUDY_NEW' ? true : current.enableRoadmap)
              : current.enableRoadmap;
      const next = {
        ...current,
        [field]: value,
        workspacePurpose: normalizedPurposeValue,
        enableRoadmap: enableRoadmapNext,
        ...roadmapConfigPatch,
        ...(field === 'knowledgeInput'
          ? {
              analysisId: '',
              inferredDomain: '',
              selectedKnowledgeOptionId: '',
              selectedDomainOptionId: '',
              selectedKnowledgeOption: '',
            }
          : {}),
      };

      const savedBasic = savedStepSnapshotsRef.current?.[1];
      const nextKnowledge = field === 'knowledgeInput' ? ensureString(value) : next.knowledgeInput;
      const nextPurpose = ensureString(next.workspacePurpose);
      const savedKnowledge = ensureString(savedBasic?.knowledgeInput);
      const savedPurpose = ensureString(savedBasic?.workspacePurpose);

      const knowledgeChanged = field === 'knowledgeInput' && savedBasic && ensureString(nextKnowledge).trim() && ensureString(nextKnowledge).trim() !== savedKnowledge.trim();
      const purposeChanged = field === 'workspacePurpose' && savedBasic && ensureString(nextPurpose).trim() && ensureString(nextPurpose).trim() !== savedPurpose.trim();

      if ((knowledgeChanged || purposeChanged) && !basicStepChangeResetGuardRef.current) {
        basicStepChangeResetGuardRef.current = true;
        // Reset Step 2 fields when knowledge or learningMode changes (require re-setup).
        setMaxUnlockedStep(1);
        delete savedStepSnapshotsRef.current[2];
        delete savedStepSnapshotsRef.current[3];
        setTemplateStatus('idle');
        setTemplatePreview(null);
        setFieldSuggestions(null);
        setFieldSuggestionStatus('idle');
        setExamTemplateSuggestions([]);
        setExamTemplateSuggestionStatus('idle');
        setConsistencyResult(null);
        setConsistencyStatus('idle');
        fieldSuggestionFingerprintRef.current = '';
        examTemplateSuggestionFingerprintRef.current = '';
        consistencyFingerprintRef.current = '';
        setStep(1);
        globalThis.setTimeout(() => {
          basicStepChangeResetGuardRef.current = false;
        }, 0);
        return {
          ...next,
          currentLevel: '',
          learningGoal: '',
          strongAreas: '',
          weakAreas: '',
          mockExamName: '',
          templatePrompt: '',
          templateFormat: 'FULL_EXAM',
          templateDurationMinutes: 90,
          templateQuestionCount: 60,
          templateNotes: '',
          templateTotalSectionPoints: 100,
          knowledgeLoad: 'BASIC',
          adaptationMode: 'BALANCED',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: getRecommendedRoadmapDays('BASIC', 'STANDARD'),
          recommendedMinutesPerDay: getRecommendedRoadmapMinutesPerDay('BASIC', getRecommendedRoadmapDays('BASIC', 'STANDARD')),
        };
      }

      return next;
    });
    setSaveError('');
    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function setPurpose(purpose) {
    if (canCreateRoadmap === false && purpose === 'STUDY_NEW') {
      return;
    }

    setSaveError('');
    updateField('workspacePurpose', purpose);
  }

  function setMockExamMode(mode) {
    // Removed because there's only one custom mode now
  }

  function selectInferredDomain(domain) {
    const selectedOption = domainOptions.find((option) => option.label === domain);
    setValues((current) => ({
      ...current,
      inferredDomain: selectedOption?.label || domain,
      selectedDomainOptionId: selectedOption?.id || '',
    }));
    setSaveError('');
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.inferredDomain;
      return nextErrors;
    });
  }

  function selectKnowledgeOption(optionId) {
    const selectedOption = knowledgeOptions.find((option) => option.id === optionId);
    if (!selectedOption) return;

    setValues((current) => {
      const preferredDomainOption = domainOptions.find((option) => selectedOption.suggestedDomainOptionIds?.includes(option.id))
        || domainOptions.find((option) => option.id === current.selectedDomainOptionId)
        || domainOptions.find((option) => option.label === current.inferredDomain)
        || null;

      return {
        ...current,
        selectedKnowledgeOptionId: selectedOption.id,
        selectedKnowledgeOption: selectedOption.label,
        inferredDomain: preferredDomainOption?.label || current.inferredDomain,
        selectedDomainOptionId: preferredDomainOption?.id || current.selectedDomainOptionId,
      };
    });
    setSaveError('');
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.selectedKnowledgeOption;
      delete nextErrors.inferredDomain;
      return nextErrors;
    });
  }

  function selectPublicExam(examId) {
    // Removed
  }

  function generateTemplatePreviewAsync() {
    clearTimeout(templateTimerRef.current);
    setTemplateStatus('loading');
    templateTimerRef.current = setTimeout(() => {
      setTemplatePreview(generateTemplateSuggestion(values));
      setTemplateStatus('success');
    }, 800);
  }

  function validateStep(targetStep = step) {
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
      if (!values.selectedKnowledgeOptionId) {
        nextErrors.selectedKnowledgeOption = translateOrFallback(
          t,
          'workspace.profileConfig.validation.knowledgeOptionRequired',
          t(
            'useWorkspaceProfileWizard.validation.knowledgeOptionRequired',
            'Please choose one main knowledge option from the AI suggestions.'
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

    if (targetStep === 3) {
      if (shouldShowRoadmapFields(values, { canCreateRoadmap })) {
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
    }

    return nextErrors;
  }

  function hasSavedSnapshot(targetStep) {
    return Boolean(savedStepSnapshotsRef.current[targetStep]);
  }

  function isStepDirty(targetStep) {
    return !areStepSnapshotsEqual(
      savedStepSnapshotsRef.current[targetStep],
      buildStepSnapshot(targetStep, values, { canCreateRoadmap })
    );
  }

  function markStepAsSaved(targetStep) {
    savedStepSnapshotsRef.current[targetStep] = buildStepSnapshot(targetStep, values, { canCreateRoadmap });
    if (targetStep < totalSteps) {
      setMaxUnlockedStep((current) => Math.max(current, targetStep + 1));
    }
  }

  function canSkipPersistForCurrentStep() {
    if (step !== 1 && step !== 2) {
      return false;
    }

    return hasSavedSnapshot(step) && !isStepDirty(step);
  }

  async function persistStep(stepToPersist) {
    const stepErrors = validateStep(stepToPersist);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      return { ok: false };
    }

    // Run consistency validation before saving Step 2 (non-blocking, shows warnings)
    if (stepToPersist === 2) {
      try {
        const consistencyPayload = buildConsistencyPayload(values);
        const consistencyFingerprint = buildRequestFingerprint(consistencyPayload);
        let result = null;

        if (
          consistencyFingerprintRef.current === consistencyFingerprint
          && consistencyResult
          && consistencyStatus === 'success'
        ) {
          result = consistencyResult;
        } else {
          consistencyFingerprintRef.current = consistencyFingerprint;
          setConsistencyStatus('loading');
          result = await runConsistencyValidation(consistencyPayload);
          setConsistencyResult(result);
          setConsistencyStatus('success');
        }

        // Block save if redFlag
        if (result.redFlag) {
          setSaveError(
            result.message
              || t(
                'useWorkspaceProfileWizard.validation.policyViolation',
                'The content violates our policy.'
              )
          );
          return { ok: false };
        }
      } catch (error) {
        console.error('[StudyProfile] Consistency validation failed:', error);
        consistencyFingerprintRef.current = '';
        setConsistencyStatus('error');
        // Don't block save on validation API error, just log
      }
    }

    setSubmitting(true);
    setSaveError('');

    try {
      const result = await onSave(stepToPersist, buildPayload(values, { canCreateRoadmap }));
      markStepAsSaved(stepToPersist);
      return { ok: true, result };
    } catch (error) {
      if (stepToPersist === 1) {
        const analysisErrorType = getStudyProfileAnalysisErrorType(error);
        if (analysisErrorType) {
          analysisFingerprintRef.current = '';
          setKnowledgeAnalysis(null);
          setKnowledgeOptions([]);
          setDomainOptions([]);
          setAnalysisStatus('idle');
          setValues((current) => ({
            ...current,
            analysisId: '',
            inferredDomain: '',
            selectedKnowledgeOptionId: '',
            selectedDomainOptionId: '',
            selectedKnowledgeOption: '',
          }));
          setAnalysisRetryTick((current) => current + 1);
        }
      }
      setSaveError(
        error?.message
          || translateOrFallback(
            t,
            'workspace.profileConfig.validation.saveFailed',
            t(
              'useWorkspaceProfileWizard.validation.saveFailed',
              'Could not save the current step. Please try again.'
            )
          )
      );
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  }

  async function nextStep() {
    if (isReadOnly) {
      setStep((current) => Math.min(totalSteps, current + 1));
      return;
    }

    if (step === 2 && values.workspacePurpose === 'MOCK_TEST' && mockTestGenerationState === 'pending') {
      return;
    }

    if (step === 2 && isWaitingForOverallReview) {
      return;
    }

    if (canSkipPersistForCurrentStep()) {
      setSaveError('');
      setMaxUnlockedStep((current) => Math.max(current, Math.min(totalSteps, step + 1)));
      setStep((current) => Math.min(totalSteps, current + 1));
      if (step === 1 && values.workspacePurpose === 'MOCK_TEST') {
        prefetchMockTestStepTwoAiSignals();
      }
      return;
    }

    const saveState = await persistStep(step);
    if (saveState.ok) {
      if (step === 2 && values.workspacePurpose === 'MOCK_TEST' && saveState.result?.deferred) {
        if (saveState.result?.advanceToStep) {
          setMaxUnlockedStep((current) => Math.max(current, saveState.result.advanceToStep));
          setStep(saveState.result.advanceToStep);
        }
        return;
      }

      setMaxUnlockedStep((current) => Math.max(current, Math.min(totalSteps, step + 1)));
      setStep((current) => Math.min(totalSteps, current + 1));
      if (step === 1 && values.workspacePurpose === 'MOCK_TEST') {
        prefetchMockTestStepTwoAiSignals();
      }
    }
  }

  function previousStep() {
    setSaveError('');
    setStep((current) => Math.max(1, current - 1));
  }

  function canNavigateToStep(targetStep) {
    return Number.isInteger(targetStep)
      && targetStep >= 1
      && targetStep < step
      && targetStep <= maxUnlockedStep;
  }

  function goToStep(targetStep) {
    if (!canNavigateToStep(targetStep)) {
      return;
    }

    setSaveError('');
    setStep(targetStep);
  }

  function isStepComplete(targetStep) {
    return Object.keys(validateStep(targetStep)).length === 0;
  }

  function showValidationErrors(targetStep = step) {
    const stepErrors = validateStep(targetStep);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  async function handleSubmit() {
    if (isReadOnly) return;
    const finalStep = totalSteps;

    if (step === 2 && isWaitingForOverallReview) {
      return { ok: false };
    }

    if (step === finalStep && canSkipPersistForCurrentStep()) {
      setSaveError('');
      return {
        ok: true,
        shouldConfirm: true,
      };
    }

    const saveState = await persistStep(finalStep);

    if (!saveState.ok) {
      return saveState;
    }

    const shouldConfirmAfterSubmit = !(
      finalStep === 2
      && values.workspacePurpose === 'MOCK_TEST'
      && saveState.result?.deferred
    );

    return {
      ...saveState,
      shouldConfirm: shouldConfirmAfterSubmit,
    };
  }

  function applySuggestion(field, value) {
    if (field === 'strongAreas' || field === 'weakAreas') {
      const currentValue = values[field] || '';
      const existingValues = currentValue.split(',').map(s => s.trim()).filter(Boolean);
      if (!existingValues.includes(value.trim())) {
        const newValue = existingValues.length > 0 ? `${currentValue}, ${value}` : value;
        updateField(field, newValue);
      }
    } else {
      updateField(field, value);
    }
  }

  function retryKnowledgeAnalysis() {
    analysisFingerprintRef.current = '';
    setAnalysisRetryTick((current) => current + 1);
  }

  return {
    getSuggestedPublicExams: () => [],
    totalSteps,
    step,
    maxUnlockedStep,
    values,
    errors: mergedErrors,
    saveError,
    statusNotice:
      isWaitingForOverallReview
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
        : '',
    statusTone:
      isWaitingForOverallReview
        ? 'info'
        : values.workspacePurpose === 'MOCK_TEST'
        ? mockTestGenerationState === 'ready'
          ? 'success'
          : mockTestGenerationState === 'error'
            ? 'error'
            : mockTestGenerationState === 'pending'
              ? 'info'
              : null
        : null,
    mockTestGenerationProgress,
    isMockTestGenerationPending: step === 2 && values.workspacePurpose === 'MOCK_TEST' && mockTestGenerationState === 'pending',
    isWaitingForOverallReview,
    submitting,
    analysisStatus,
    knowledgeOptions,
    domainOptions,
    needsKnowledgeDescription,
    selectedExam: null,
    examSearch,
    templateStatus,
    templatePreview,
    // AI state
    knowledgeAnalysis,
    fieldSuggestions,
    fieldSuggestionStatus,
    examTemplateSuggestions,
    examTemplateSuggestionStatus,
    consistencyResult,
    consistencyStatus,
    // Actions
    updateField,
    setPurpose,
    setMockExamMode,
    selectKnowledgeOption,
    selectInferredDomain,
    selectPublicExam,
    generateTemplatePreviewAsync,
    setExamSearch,
    nextStep,
    previousStep,
    canNavigateToStep,
    goToStep,
    handleSubmit,
    isStepComplete,
    showValidationErrors,
    applySuggestion,
    retryKnowledgeAnalysis,
  };
}
