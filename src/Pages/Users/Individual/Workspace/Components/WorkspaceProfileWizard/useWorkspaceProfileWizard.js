import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateTemplateSuggestion,
} from './mockProfileWizardData';
import { isAbsoluteBeginnerLevel } from './profileWizardBeginnerUtils';
import {
  analyzeKnowledge,
  suggestProfileFields,
  suggestExamTemplates,
  validateProfileConsistency,
} from '@/api/StudyProfileAPI';

const ROADMAP_FLOW_TOTAL_STEPS = 3;
const NO_ROADMAP_FLOW_TOTAL_STEPS = 2;
const ANALYSIS_DEBOUNCE_MS = 800;
const FIELD_SUGGESTION_DEBOUNCE_MS = 500;
const EXAM_TEMPLATE_SUGGESTION_DEBOUNCE_MS = 600;
const CONSISTENCY_DEBOUNCE_MS = 700;

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
    hasTextValue(initialData?.adaptationMode)
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

function createInitialValues(initialData) {
  const hasExistingProfile = hasProfileData(initialData);
  const purpose =
    initialData?.workspacePurpose ||
    initialData?.learningMode ||
    (initialData?.mockExamName || initialData?.mockExamCatalogId || initialData?.targetScore
      ? 'MOCK_TEST'
      : initialData?.weakAreas || initialData?.strongAreas
        ? 'REVIEW'
        : hasExistingProfile
          ? 'STUDY_NEW'
          : '');


  return {
    workspacePurpose: purpose,
    knowledgeInput: ensureString(initialData?.knowledgeInput || initialData?.knowledge || initialData?.customKnowledge || ''),
    knowledgeDescription: ensureString(initialData?.knowledgeDescription || initialData?.customSchemeDescription || ''),
    inferredDomain: ensureString(initialData?.inferredDomain || initialData?.domain || initialData?.customDomain || ''),
    selectedKnowledgeOption: ensureString(initialData?.selectedKnowledgeOption || initialData?.knowledgeInput || initialData?.knowledge || initialData?.customKnowledge || ''),
    enableRoadmap:
      initialData?.enableRoadmap ??
      initialData?.roadmapEnabled ??
      Boolean(
        purpose === 'STUDY_NEW' ||
        initialData?.adaptationMode ||
        initialData?.speedMode ||
        initialData?.roadmapSpeedMode ||
        initialData?.estimatedTotalDays ||
        initialData?.recommendedMinutesPerDay
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
    adaptationMode: normalizeAdaptationMode(ensureString(initialData?.adaptationMode || 'BALANCED')),
    roadmapSpeedMode: normalizeRoadmapSpeedMode(ensureString(initialData?.roadmapSpeedMode || initialData?.speedMode || 'STANDARD')),
    estimatedTotalDays: ensureNumber(initialData?.estimatedTotalDays, 30),
    recommendedMinutesPerDay: ensureNumber(initialData?.recommendedMinutesPerDay ?? initialData?.estimatedMinutesPerDay, 90),
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
  const hasBasicData = hasBasicStepData(initialData);
  const isCompletedFlow = isReadOnly || initialData?.onboardingCompleted || setupStatus === 'DONE';
  const baseStep =
    isCompletedFlow
      ? totalSteps
      : explicitStep >= 1 && explicitStep <= totalSteps
        ? explicitStep
        : setupStatus === 'PROFILE_DONE'
          ? totalSteps
          : profileStatus === 'BASIC_DONE' || profileStatus === 'DONE'
            ? hasBasicData
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

function shouldShowRoadmapFields(values) {
  return values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap;
}

function getTotalStepsForValues(values) {
  return shouldShowRoadmapFields(values)
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

function buildDomainOptionsFromApi({ domainSuggestions, domainSuggestionDetails, knowledge }) {
  const normalizedKnowledge = (knowledge || '').toString().trim();

  const normalizedDetails = (Array.isArray(domainSuggestionDetails) ? domainSuggestionDetails : [])
    .map(normalizeDomainSuggestionDetail)
    .filter(Boolean);

  if (normalizedDetails.length > 0) {
    return normalizedDetails.slice(0, 5).map((item, index) => ({
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
    label,
    signal: normalizedKnowledge,
    knowledge: normalizedKnowledge,
    reasonType: resolveDomainReasonType(label, normalizedKnowledge, index),
  }));
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
  return {
    knowledge: values.knowledgeInput.trim(),
    domain: values.inferredDomain.trim(),
    learningMode: mapLearningModeForApi(values.workspacePurpose),
    currentLevel: values.currentLevel.trim() || null,
    strongAreas: splitProfileFieldValues(values.strongAreas),
    weakAreas: splitProfileFieldValues(values.weakAreas),
  };
}

function buildExamTemplateSuggestionPayload(values) {
  return {
    knowledge: values.knowledgeInput.trim(),
    domain: values.inferredDomain.trim(),
  };
}

function buildConsistencyPayload(values) {
  return {
    knowledge: values.knowledgeInput.trim(),
    domain: values.inferredDomain,
    learningMode: mapLearningModeForApi(values.workspacePurpose),
    currentLevel: values.currentLevel.trim() || null,
    learningGoal: values.learningGoal.trim() || null,
    examName: values.mockExamName?.trim() || null,
    strongAreas: splitProfileFieldValues(values.strongAreas),
    weakAreas: splitProfileFieldValues(values.weakAreas),
  };
}

function shouldRunLiveConsistency(values) {
  const beginnerMode = isAbsoluteBeginnerLevel(values.currentLevel);

  return Boolean(
    values.knowledgeInput.trim()
    && values.inferredDomain.trim()
    && values.workspacePurpose
    && values.currentLevel.trim()
    && values.learningGoal.trim()
    && (
      beginnerMode
      || (values.strongAreas.trim() && values.weakAreas.trim())
    )
  );
}

function buildConsistencyFingerprint(values) {
  return buildRequestFingerprint(buildConsistencyPayload(values));
}

function buildPayload(values) {
  const sharedPayload = {
    workspacePurpose: values.workspacePurpose,
    knowledgeInput: values.knowledgeInput.trim(),
    knowledgeDescription: values.knowledgeDescription.trim() || null,
    inferredDomain: values.inferredDomain || null,
    selectedKnowledgeOption: values.knowledgeInput.trim() || null,
    enableRoadmap: values.workspacePurpose === 'STUDY_NEW' ? true : Boolean(values.enableRoadmap),
    currentLevel: values.currentLevel.trim(),
    learningGoal: values.learningGoal.trim(),
    strongAreas: values.strongAreas.trim() || null,
    weakAreas: values.weakAreas.trim() || null,
    adaptationMode: shouldShowRoadmapFields(values) ? values.adaptationMode || null : null,
    roadmapSpeedMode: shouldShowRoadmapFields(values) ? values.roadmapSpeedMode || null : null,
    estimatedTotalDays: shouldShowRoadmapFields(values) ? Number(values.estimatedTotalDays) || null : null,
    recommendedMinutesPerDay: shouldShowRoadmapFields(values) ? Number(values.recommendedMinutesPerDay) || null : null,
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

function buildStepSnapshot(stepNumber, values) {
  if (!values || typeof values !== 'object') {
    return null;
  }

  if (stepNumber === 1) {
    return {
      workspacePurpose: normalizeSnapshotText(values.workspacePurpose),
      knowledgeInput: normalizeSnapshotText(values.knowledgeInput),
      knowledgeDescription: normalizeSnapshotText(values.knowledgeDescription),
      inferredDomain: normalizeSnapshotText(values.inferredDomain),
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
    return {
      showRoadmapFields: shouldShowRoadmapFields(values),
      adaptationMode: shouldShowRoadmapFields(values) ? normalizeSnapshotText(values.adaptationMode) : '',
      roadmapSpeedMode: shouldShowRoadmapFields(values) ? normalizeSnapshotText(values.roadmapSpeedMode) : '',
      estimatedTotalDays: shouldShowRoadmapFields(values) ? normalizeSnapshotNumber(values.estimatedTotalDays) : null,
      recommendedMinutesPerDay:
        shouldShowRoadmapFields(values) ? normalizeSnapshotNumber(values.recommendedMinutesPerDay) : null,
    };
  }

  return null;
}

function areStepSnapshotsEqual(leftSnapshot, rightSnapshot) {
  return JSON.stringify(leftSnapshot ?? null) === JSON.stringify(rightSnapshot ?? null);
}

function createSavedStepSnapshots(initialData, values, initialStep, totalSteps = ROADMAP_FLOW_TOTAL_STEPS) {
  if (!values || typeof values !== 'object') {
    return {};
  }

  const snapshots = {};

  if (initialStep >= 2 || hasBasicStepData(initialData)) {
    snapshots[1] = buildStepSnapshot(1, values);
  }

  if (initialStep >= 3 || hasPersonalInfoStepData(initialData)) {
    snapshots[2] = buildStepSnapshot(2, values);
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
    snapshots[3] = buildStepSnapshot(3, values);
  }

  return snapshots;
}

function mapLearningModeForApi(purpose) {
  if (purpose === 'STUDY_NEW') return 'STUDY_NEW';
  if (purpose === 'REVIEW') return 'REVIEW';
  if (purpose === 'MOCK_TEST') return 'MOCK_TEST';
  return 'STUDY_NEW';
}

export function useWorkspaceProfileWizard({
  open,
  initialData,
  onSave,
  storageKey,
  forceStartAtStepOne = false,
  mockTestGenerationState = 'idle',
  mockTestGenerationMessage = '',
  mockTestGenerationProgress = 0,
  t,
  isReadOnly = false,
}) {
  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [values, setValues] = useState(createInitialValues(initialData));
  const totalSteps = getTotalStepsForValues(values);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('idle');
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

    const nextValues = createInitialValues(initialData);

    const initialTotalSteps = getTotalStepsForValues(nextValues);
    const initialStepValue = forceStartAtStepOne
      ? 1
      : getInitialStep(initialData, isReadOnly, storageKey, initialTotalSteps);
    savedStepSnapshotsRef.current = forceStartAtStepOne
      ? {}
      : createSavedStepSnapshots(initialData, nextValues, initialStepValue, initialTotalSteps);
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
    setAnalysisStatus(nextValues.knowledgeInput ? 'loading' : 'idle');
    const canPrimeMockTemplate = nextValues.workspacePurpose === 'MOCK_TEST' && nextValues.mockExamName;
    setTemplateStatus(nextValues.templatePrompt || canPrimeMockTemplate ? 'success' : 'idle');
    setTemplatePreview(
      nextValues.templatePrompt || canPrimeMockTemplate
        ? generateTemplateSuggestion(nextValues)
        : null
    );
    setExamSearch(canPrimeMockTemplate ? nextValues.mockExamName || '' : '');
  }, [open, initialData, isReadOnly, storageKey, forceStartAtStepOne]);

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

    const trimmedKnowledge = values.knowledgeInput.trim();
    const analysisFingerprint = buildRequestFingerprint({
      knowledge: trimmedKnowledge,
      retry: analysisRetryTick,
    });

    if (!trimmedKnowledge) {
      analysisFingerprintRef.current = '';
      setAnalysisStatus('idle');
      setDomainOptions([]);
      setKnowledgeAnalysis(null);
      setValues((current) => ({
        ...current,
        inferredDomain: '',
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
        const result = await analyzeKnowledge(trimmedKnowledge, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        setKnowledgeAnalysis(result);

        const rawOptions = buildDomainOptionsFromApi({
          domainSuggestions: result.domainSuggestions || [],
          domainSuggestionDetails: extractDomainSuggestionDetails(result),
          knowledge: values.knowledgeInput.trim(),
        });
        const localizedOptions = localizeDomainOptions(rawOptions, t);

        setDomainOptions(localizedOptions);
        setAnalysisStatus('success');
        setValues((current) => ({
          ...current,
          inferredDomain:
            localizedOptions.some((option) => option.label === current.inferredDomain) && current.inferredDomain
              ? current.inferredDomain
              : '',
          selectedKnowledgeOption: current.knowledgeInput.trim(),
        }));
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[StudyProfile] Knowledge analysis failed:', error);
        analysisFingerprintRef.current = '';
        setAnalysisStatus('error');
        setKnowledgeAnalysis(null);
        setDomainOptions([]);
      }
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      clearTimeout(analysisTimerRef.current);
      analysisAbortRef.current?.abort();
    };
  }, [open, values.knowledgeInput, analysisRetryTick, t]);

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
    if (!values.knowledgeInput.trim() || !values.inferredDomain.trim()) {
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

    const payload = buildFieldSuggestionPayload(values);
    fieldSuggestionTimerRef.current = setTimeout(() => {
      fetchFieldSuggestions(payload);
    }, FIELD_SUGGESTION_DEBOUNCE_MS);

    if (values.workspacePurpose === 'MOCK_TEST') {
      const knowledge = values.knowledgeInput.trim();
      const domain = values.inferredDomain.trim();
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
    values.inferredDomain,
    values.currentLevel,
    values.strongAreas,
    values.weakAreas,
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
    values.inferredDomain,
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
      const enableRoadmapNext =
        field === 'enableRoadmap'
          ? Boolean(value)
          : field === 'workspacePurpose'
            ? (value === 'STUDY_NEW' ? true : current.enableRoadmap)
            : current.enableRoadmap;
      const next = {
        ...current,
        [field]: value,
        enableRoadmap: enableRoadmapNext,
      };

      const savedBasic = savedStepSnapshotsRef.current?.[1];
      const nextKnowledge = field === 'knowledgeInput' ? ensureString(value) : next.knowledgeInput;
      const nextPurpose = field === 'workspacePurpose' ? ensureString(value) : next.workspacePurpose;
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
          adaptationMode: 'BALANCED',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: 30,
          recommendedMinutesPerDay: 90,
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
    setSaveError('');
    updateField('workspacePurpose', purpose);
  }

  function setMockExamMode(mode) {
    // Removed because there's only one custom mode now
  }

  function selectInferredDomain(domain) {
    updateField('inferredDomain', domain);
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
      if (!values.workspacePurpose) nextErrors.workspacePurpose = t('workspace.profileConfig.validation.purposeRequired');
      if (!values.knowledgeInput.trim()) nextErrors.knowledgeInput = t('workspace.profileConfig.validation.knowledgeRequired');
      if (analysisStatus === 'loading') {
        nextErrors.inferredDomain = translateOrFallback(
          t,
          'workspace.profileConfig.validation.waitForAi',
          'Vui lòng đợi AI phân tích xong kiến thức.'
        );
      } else if (analysisStatus === 'error') {
        nextErrors.inferredDomain = translateOrFallback(
          t,
          'workspace.profileConfig.validation.aiAnalysisError',
          'AI phân tích thất bại. Vui lòng thử lại.'
        );
      } else if (analysisStatus !== 'success') {
        nextErrors.inferredDomain = translateOrFallback(
          t,
          'workspace.profileConfig.validation.waitForAi',
          'Vui lòng đợi AI phân tích xong kiến thức.'
        );
      }
      if (!values.inferredDomain) {
        nextErrors.inferredDomain = translateOrFallback(
          t,
          'workspace.profileConfig.validation.domainRequired',
          'Vui lòng chọn lĩnh vực do AI đề xuất.'
        );
      }
    }

    if (targetStep === 2) {
      const beginnerMode = isAbsoluteBeginnerLevel(values.currentLevel);

      if (!values.currentLevel.trim()) nextErrors.currentLevel = t('workspace.profileConfig.validation.currentLevelRequired');
      if (!values.learningGoal.trim()) nextErrors.learningGoal = t('workspace.profileConfig.validation.learningGoalRequired');
      if ((values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST') && !beginnerMode && !values.strongAreas.trim()) {
        nextErrors.strongAreas = t('workspace.profileConfig.validation.strongAreasRequired');
      }
      if ((values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST') && !beginnerMode && !values.weakAreas.trim()) {
        nextErrors.weakAreas = t('workspace.profileConfig.validation.weakAreasRequired');
      }

      if (values.workspacePurpose === 'MOCK_TEST') {
        if (!values.mockExamName?.trim()) {
          nextErrors.mockExamName = t('workspace.profileConfig.validation.privateExamRequired');
        }
      }
    }

    if (targetStep === 3) {
      if (shouldShowRoadmapFields(values)) {
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
      buildStepSnapshot(targetStep, values)
    );
  }

  function markStepAsSaved(targetStep) {
    savedStepSnapshotsRef.current[targetStep] = buildStepSnapshot(targetStep, values);
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
          setSaveError(result.message || 'Nội dung vi phạm chính sách.');
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
      const result = await onSave(stepToPersist, buildPayload(values));
      markStepAsSaved(stepToPersist);
      return { ok: true, result };
    } catch (error) {
      setSaveError(
        error?.message
          || translateOrFallback(
            t,
            'workspace.profileConfig.validation.saveFailed',
            'Không thể lưu bước hiện tại. Vui lòng thử lại.'
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
    errors,
    saveError,
    statusNotice:
      isWaitingForOverallReview
        ? translateOrFallback(
          t,
          'workspace.profileConfig.stepTwo.overallReviewLoadingTitle',
          'Quizmate AI dang danh gia tong quan'
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
