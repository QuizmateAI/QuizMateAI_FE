import { useCallback, useEffect, useRef, useState } from 'react';
import { generateTemplateSuggestion, getRecommendedRoadmapDays, getRecommendedRoadmapMinutesPerDay } from './mockProfileWizardData';
import { analyzeKnowledge, suggestProfileFields, suggestExamTemplates, validateProfileConsistency } from '@/api/StudyProfileAPI';
import { NO_ROADMAP_FLOW_TOTAL_STEPS, ANALYSIS_DEBOUNCE_MS, FIELD_SUGGESTION_DEBOUNCE_MS, CONSISTENCY_DEBOUNCE_MS, ensureString, normalizeWorkspacePurpose, getReadyLiveFieldValue, createInitialValues, getInitialStep, getTotalStepsForValues, syncRoadmapConfigFields, translateOrFallback, extractDomainSuggestionDetails, buildDomainOptionsFromApi, buildKnowledgeOptionsFromApi, localizeDomainOptions, getSelectedKnowledgeForAi, getSelectedDomainForAi, buildFieldSuggestionPayload, buildConsistencyPayload, shouldRunLiveConsistency, buildConsistencyFingerprint, buildPayload, buildRequestFingerprint, buildStepSnapshot, areStepSnapshotsEqual, createSavedStepSnapshots, buildLiveValidationErrors, canFetchFieldSuggestions, getStudyProfileAnalysisErrorType, validateWorkspaceProfileStep, buildWizardStatus, hasCompleteBasicStepData } from './workspaceProfileWizardUtils';
export function useWorkspaceProfileWizard({
  open,
  initialData,
  onSave,
  storageKey,
  canCreateRoadmap = true,
  forceStartAtStepOne = false,
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
  const initializedWithProfileDataRef = useRef(false);
  const userEditedSinceOpenRef = useRef(false);
  const needsKnowledgeDescription =
    analysisStatus === 'success' && knowledgeAnalysis?.tooBroad === true;
  const canRequestKnowledgeAnalysis = Boolean(getReadyLiveFieldValue('knowledgeInput', values.knowledgeInput));
  const canRequestFieldSuggestion = canFetchFieldSuggestions(values);
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
      initializedWithProfileDataRef.current = false;
      userEditedSinceOpenRef.current = false;
      return;
    }
    const hasCompleteInitialBasicStep = hasCompleteBasicStepData(initialData);
    const shouldHydrateLoadedProfile =
      wasOpenRef.current
      && !forceStartAtStepOne
      && !initializedWithProfileDataRef.current
      && !userEditedSinceOpenRef.current
      && hasCompleteInitialBasicStep;
    if (wasOpenRef.current && !shouldHydrateLoadedProfile) return;
    wasOpenRef.current = true;
    if (forceStartAtStepOne && storageKey && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKey);
    }
    if (shouldHydrateLoadedProfile && storageKey && typeof window !== 'undefined') {
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
    initializedWithProfileDataRef.current = hasCompleteInitialBasicStep;
    userEditedSinceOpenRef.current = false;
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
    setTemplateStatus(nextValues.templatePrompt ? 'success' : 'idle');
    setTemplatePreview(
      nextValues.templatePrompt
        ? generateTemplateSuggestion(nextValues)
        : null
    );
    setExamSearch('');
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
        const result = await analyzeKnowledge(trimmedKnowledge, {
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;
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
        applyResolvedAnalysis(result);
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
    examTemplateSuggestionFingerprintRef.current = '';
    setExamTemplateSuggestions([]);
    setExamTemplateSuggestionStatus('idle');
    return () => {
      clearTimeout(fieldSuggestionTimerRef.current);
      clearTimeout(examTemplateSuggestionTimerRef.current);
    };
  }, [
    open,
    step,
    isReadOnly,
    fetchFieldSuggestions,
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
    consistencyResult,
    consistencyStatus,
  ]);
  function updateField(field, value) {
    userEditedSinceOpenRef.current = true;
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
  function selectInferredDomain(domain) {
    userEditedSinceOpenRef.current = true;
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
    userEditedSinceOpenRef.current = true;
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
    return validateWorkspaceProfileStep({
      targetStep,
      values,
      t,
      analysisStatus,
      canCreateRoadmap,
    });
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
    if (step === 2 && isWaitingForOverallReview) {
      return;
    }
    if (canSkipPersistForCurrentStep()) {
      setSaveError('');
      setMaxUnlockedStep((current) => Math.max(current, Math.min(totalSteps, step + 1)));
      setStep((current) => Math.min(totalSteps, current + 1));
      return;
    }
    const saveState = await persistStep(step);
    if (saveState.ok) {
      setMaxUnlockedStep((current) => Math.max(current, Math.min(totalSteps, step + 1)));
      setStep((current) => Math.min(totalSteps, current + 1));
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
    return {
      ...saveState,
      shouldConfirm: true,
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
  const wizardStatus = buildWizardStatus({
    isWaitingForOverallReview,
    t,
  });
  const workspaceNameSuggestion = typeof (
    consistencyResult?.workspaceNameSuggestion
    || consistencyResult?.workspaceTitleSuggestion
    || consistencyResult?.workspaceTitle
  ) === 'string'
    ? (
      consistencyResult?.workspaceNameSuggestion
      || consistencyResult?.workspaceTitleSuggestion
      || consistencyResult?.workspaceTitle
    ).trim()
    : '';
  return {
    getSuggestedPublicExams: () => [],
    totalSteps,
    step,
    maxUnlockedStep,
    values,
    errors: mergedErrors,
    saveError,
    statusNotice: wizardStatus.statusNotice,
    statusTone: wizardStatus.statusTone,
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
    workspaceNameSuggestion,
    // Actions
    updateField,
    setPurpose,
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
