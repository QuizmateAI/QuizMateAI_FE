import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateTemplateSuggestion,
  getPublicExamById,
  getPublicExamByName,
  getPublicExamTemplateDefaults,
  getSuggestedPublicExams,
} from './mockProfileWizardData';
import {
  analyzeKnowledge,
  suggestProfileFields,
  validateProfileConsistency,
} from '@/api/StudyProfileAPI';

const TOTAL_STEPS = 4;
const ANALYSIS_DEBOUNCE_MS = 800;

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
    || hasTextValue(initialData?.mockExamName)
    || hasTextValue(initialData?.examName)
    || hasTextValue(initialData?.mockExamCatalogId)
  );
}

function hasRoadmapStepData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;

  return Boolean(
    hasTextValue(initialData?.adaptationMode)
    || hasTextValue(initialData?.speedMode)
    || hasTextValue(initialData?.roadmapSpeedMode)
    || Number(initialData?.estimatedTotalDays) > 0
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
  const matchedPublicExam = getPublicExamByName(initialData?.examName || initialData?.mockExamName || '');

  const mockExamMode =
    initialData?.mockExamMode ||
    ((initialData?.mockExamCatalogId || matchedPublicExam)
      ? 'PUBLIC'
      : (initialData?.mockExamName || initialData?.examName)
        ? 'PRIVATE'
        : 'PUBLIC');

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
    mockExamMode,
    mockExamCatalogId: ensureString(initialData?.mockExamCatalogId || matchedPublicExam?.id || ''),
    mockExamName: ensureString(initialData?.mockExamName || initialData?.examName || ''),
    templatePrompt: ensureString(initialData?.templatePrompt || ''),
    templateFormat: ensureString(initialData?.templateFormat || 'FULL_EXAM'),
    templateDurationMinutes: ensureNumber(initialData?.templateDurationMinutes, 90),
    templateQuestionCount: ensureNumber(initialData?.templateQuestionCount, 60),
    templateNotes: ensureString(initialData?.templateNotes || ''),
    adaptationMode: normalizeAdaptationMode(ensureString(initialData?.adaptationMode || 'BALANCED')),
    roadmapSpeedMode: normalizeRoadmapSpeedMode(ensureString(initialData?.roadmapSpeedMode || initialData?.speedMode || 'STANDARD')),
    estimatedTotalDays: ensureNumber(initialData?.estimatedTotalDays, 30),
    recommendedMinutesPerDay: ensureNumber(initialData?.recommendedMinutesPerDay, 90),
  };
}

function readStoredStep(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null;

  const storedStep = Number(window.sessionStorage.getItem(storageKey));
  return Number.isFinite(storedStep) ? storedStep : null;
}

function getInitialStep(initialData, isReadOnly, storageKey) {
  const profileStatus = initialData?.profileStatus;
  const hasBasicData = hasBasicStepData(initialData);
  const hasPersonalData = hasPersonalInfoStepData(initialData);
  const baseStep =
    isReadOnly || profileStatus === 'DONE'
      ? TOTAL_STEPS
      : profileStatus === 'PERSONAL_INFO_DONE'
        ? hasBasicData && hasPersonalData
          ? 3
          : hasBasicData
            ? 2
            : 1
        : profileStatus === 'BASIC_DONE'
          ? hasBasicData
            ? 2
            : 1
          : 1;
  const storedStep = readStoredStep(storageKey);

  if (storedStep && storedStep >= baseStep && storedStep <= TOTAL_STEPS) {
    return storedStep;
  }

  return baseStep;
}

function shouldShowRoadmapFields(values) {
  return values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap;
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

function buildDomainOptionsFromApi(domainSuggestions, knowledge) {
  if (!Array.isArray(domainSuggestions) || domainSuggestions.length === 0) {
    return [];
  }

  const reasonTypes = ['closest', 'group', 'context'];

  return domainSuggestions.slice(0, 5).map((label, index) => ({
    label,
    signal: knowledge,
    knowledge,
    reasonType: reasonTypes[index] || 'context',
  }));
}

function localizeDomainOptions(options, t) {
  return options.map((option) => ({
    ...option,
    reason: t(`workspace.profileConfig.stepOne.domainReason.${option.reasonType}`, {
      signal: option.signal,
      knowledge: option.knowledge,
      domain: option.label,
    }),
  }));
}

function buildPayload(values) {
  const selectedExam = getPublicExamById(values.mockExamCatalogId);
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
          mockExamMode: values.mockExamMode || null,
          mockExamCatalogId: values.mockExamMode === 'PUBLIC' ? values.mockExamCatalogId || null : null,
          mockExamName:
            values.mockExamMode === 'PUBLIC'
              ? selectedExam?.name || null
              : values.mockExamName.trim() || null,
          templatePrompt: values.templatePrompt.trim() || null,
          templateFormat: values.templateFormat || null,
          templateDurationMinutes: Number(values.templateDurationMinutes) || null,
          templateQuestionCount: Number(values.templateQuestionCount) || null,
          templateNotes: values.templateNotes.trim() || null,
          targetScore: null,
          targetScoreScale: null,
          expectedExamDate: null,
        }
      : {
          mockExamMode: null,
          mockExamCatalogId: null,
          mockExamName: null,
          templatePrompt: null,
          templateFormat: null,
          templateDurationMinutes: null,
          templateQuestionCount: null,
          templateNotes: null,
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

function mapLearningModeForApi(purpose) {
  if (purpose === 'STUDY_NEW') return 'STUDY_NEW';
  if (purpose === 'REVIEW') return 'REVIEW';
  if (purpose === 'MOCK_TEST') return 'MOCK_TEST';
  return 'STUDY_NEW';
}

export function useWorkspaceProfileWizard({
  open,
  initialData,
  uploadedMaterials = [],
  onSave,
  onUploadFiles,
  storageKey,
  forceStartAtStepOne = false,
  mockTestGenerationState = 'idle',
  mockTestGenerationMessage = '',
  mockTestGenerationProgress = 0,
  t,
  isReadOnly = false,
}) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(createInitialValues(initialData));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [domainOptions, setDomainOptions] = useState([]);
  const [templateStatus, setTemplateStatus] = useState('idle');
  const [templatePreview, setTemplatePreview] = useState(null);
  const [examSearch, setExamSearch] = useState('');

  // AI analysis state
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState(null);
  const [fieldSuggestions, setFieldSuggestions] = useState(null);
  const [fieldSuggestionStatus, setFieldSuggestionStatus] = useState('idle');
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [consistencyStatus, setConsistencyStatus] = useState('idle');

  const analysisTimerRef = useRef(null);
  const analysisAbortRef = useRef(null);
  const fieldSuggestionAbortRef = useRef(null);
  const templateTimerRef = useRef(null);
  const wasOpenRef = useRef(false);
  const prevStepRef = useRef(null);

  const selectedExam = getPublicExamById(values.mockExamCatalogId);
  const needsKnowledgeDescription =
    analysisStatus === 'success' && knowledgeAnalysis?.tooBroad === true;
  const uploadedMaterialCount = Array.isArray(uploadedMaterials) ? uploadedMaterials.length : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(analysisTimerRef.current);
      clearTimeout(templateTimerRef.current);
      analysisAbortRef.current?.abort();
      fieldSuggestionAbortRef.current?.abort();
    };
  }, []);

  // Dialog open/close reset
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) return;

    wasOpenRef.current = true;

    if (forceStartAtStepOne && storageKey && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKey);
    }

    const nextValues = createInitialValues(initialData);
    if (nextValues.workspacePurpose === 'MOCK_TEST' && !nextValues.mockExamCatalogId && nextValues.mockExamMode === 'PUBLIC') {
      const suggestedExam = getSuggestedPublicExams(nextValues)[0];
      if (suggestedExam) {
        nextValues.mockExamCatalogId = suggestedExam.id;
        nextValues.mockExamName = suggestedExam.name;
      }
    }
    setStep(forceStartAtStepOne ? 1 : getInitialStep(initialData, isReadOnly, storageKey));
    setValues(nextValues);
    setErrors({});
    setSaveError('');
    setSubmitting(false);
    setPendingFiles([]);
    setDomainOptions([]);
    setKnowledgeAnalysis(null);
    setFieldSuggestions(null);
    setFieldSuggestionStatus('idle');
    setConsistencyResult(null);
    setConsistencyStatus('idle');
    setAnalysisStatus(nextValues.knowledgeInput ? 'loading' : 'idle');
    const defaultSelectedExam = getPublicExamById(nextValues.mockExamCatalogId);
    const canPrimeMockTemplate = nextValues.workspacePurpose === 'MOCK_TEST' && nextValues.mockExamMode === 'PUBLIC' && defaultSelectedExam;
    setTemplateStatus(nextValues.templatePrompt || canPrimeMockTemplate ? 'success' : 'idle');
    setTemplatePreview(
      nextValues.templatePrompt || canPrimeMockTemplate
        ? generateTemplateSuggestion(nextValues, defaultSelectedExam)
        : null
    );
    setExamSearch(canPrimeMockTemplate ? defaultSelectedExam?.name || '' : '');
  }, [open, initialData, isReadOnly, storageKey, forceStartAtStepOne]);

  // Persist step to sessionStorage
  useEffect(() => {
    if (!open || !storageKey || typeof window === 'undefined') return;
    window.sessionStorage.setItem(storageKey, String(step));
  }, [open, step, storageKey]);

  // Mock test template sync for PUBLIC exams
  useEffect(() => {
    if (!open || values.workspacePurpose !== 'MOCK_TEST' || values.mockExamMode !== 'PUBLIC' || !selectedExam) {
      return;
    }

    const publicExamDefaults = getPublicExamTemplateDefaults(values, selectedExam);
    const nextTemplatePreview = generateTemplateSuggestion(values, selectedExam);

    setTemplateStatus('success');
    setTemplatePreview(nextTemplatePreview);
    setExamSearch(selectedExam.name);

    if (!publicExamDefaults) return;

    setValues((current) => {
      const nextValues = { ...current };
      let hasChanged = false;

      if (current.templateFormat !== publicExamDefaults.templateFormat) {
        nextValues.templateFormat = publicExamDefaults.templateFormat;
        hasChanged = true;
      }

      if (Number(current.templateDurationMinutes) !== Number(publicExamDefaults.templateDurationMinutes)) {
        nextValues.templateDurationMinutes = publicExamDefaults.templateDurationMinutes;
        hasChanged = true;
      }

      if (Number(current.templateQuestionCount) !== Number(publicExamDefaults.templateQuestionCount)) {
        nextValues.templateQuestionCount = publicExamDefaults.templateQuestionCount;
        hasChanged = true;
      }

      if (current.templatePrompt) {
        nextValues.templatePrompt = '';
        hasChanged = true;
      }

      if (current.templateNotes) {
        nextValues.templateNotes = '';
        hasChanged = true;
      }

      return hasChanged ? nextValues : current;
    });
  }, [
    open,
    values.workspacePurpose,
    values.mockExamMode,
    values.mockExamCatalogId,
    values.knowledgeInput,
    values.inferredDomain,
    values.currentLevel,
    selectedExam,
  ]);

  // Advance to step 3 when mock test generation completes
  useEffect(() => {
    if (!open || isReadOnly) return;
    if (step !== 2 || values.workspacePurpose !== 'MOCK_TEST') return;
    if (mockTestGenerationState !== 'ready') return;

    setSaveError('');
    setStep(3);
  }, [open, isReadOnly, step, values.workspacePurpose, mockTestGenerationState]);

  // ─── Real AI Knowledge Analysis (debounced) ───
  useEffect(() => {
    if (!open) return;

    clearTimeout(analysisTimerRef.current);
    analysisAbortRef.current?.abort();

    if (!values.knowledgeInput.trim()) {
      setAnalysisStatus('idle');
      setDomainOptions([]);
      setKnowledgeAnalysis(null);
      setValues((current) => ({
        ...current,
        inferredDomain: '',
      }));
      return;
    }

    setAnalysisStatus('loading');

    analysisTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      analysisAbortRef.current = abortController;

      try {
        const result = await analyzeKnowledge(values.knowledgeInput.trim(), {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        setKnowledgeAnalysis(result);

        const rawOptions = buildDomainOptionsFromApi(
          result.domainSuggestions || [],
          values.knowledgeInput.trim()
        );
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
        setAnalysisStatus('error');
        setKnowledgeAnalysis(null);
        setDomainOptions([]);
      }
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      clearTimeout(analysisTimerRef.current);
      analysisAbortRef.current?.abort();
    };
  }, [open, values.knowledgeInput]);

  // ─── Auto-fetch field suggestions when entering Step 2 ───
  const fetchFieldSuggestions = useCallback(
    async (knowledge, domain, purpose) => {
      fieldSuggestionAbortRef.current?.abort();

      if (!knowledge || !domain || !purpose) {
        setFieldSuggestions(null);
        setFieldSuggestionStatus('idle');
        return;
      }

      const abortController = new AbortController();
      fieldSuggestionAbortRef.current = abortController;
      setFieldSuggestionStatus('loading');

      try {
        const result = await suggestProfileFields(
          {
            knowledge: knowledge.trim(),
            domain: domain.trim(),
            learningMode: mapLearningModeForApi(purpose),
          },
          { signal: abortController.signal }
        );

        if (abortController.signal.aborted) return;
        setFieldSuggestions(result);
        setFieldSuggestionStatus('success');
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[StudyProfile] Field suggestion failed:', error);
        setFieldSuggestionStatus('error');
        setFieldSuggestions(null);
      }
    },
    []
  );

  useEffect(() => {
    if (!open || isReadOnly) return;

    // Only trigger when we just ENTERED step 2
    if (step === 2 && prevStepRef.current !== 2) {
      fetchFieldSuggestions(
        values.knowledgeInput,
        values.inferredDomain,
        values.workspacePurpose
      );
    }

    prevStepRef.current = step;
  }, [open, step, isReadOnly, fetchFieldSuggestions, values.knowledgeInput, values.inferredDomain, values.workspacePurpose]);

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveError('');
    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function addPendingFiles(files) {
    const normalizedFiles = Array.from(files || []).filter(Boolean);
    if (normalizedFiles.length === 0) return;

    setSaveError('');
    setPendingFiles((current) => {
      const nextFiles = [...current];
      normalizedFiles.forEach((file) => {
        const exists = nextFiles.some(
          (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
        );

        if (!exists) {
          nextFiles.push(file);
        }
      });
      return nextFiles;
    });
    setErrors((current) => {
      if (!current.materials) return current;
      const nextErrors = { ...current };
      delete nextErrors.materials;
      return nextErrors;
    });
  }

  function removePendingFile(index) {
    setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function setPurpose(purpose) {
    setSaveError('');
    setValues((current) => ({
      ...current,
      workspacePurpose: purpose,
      enableRoadmap: purpose === 'STUDY_NEW' ? true : current.enableRoadmap,
    }));
  }

  function setMockExamMode(mode) {
    setSaveError('');
    setValues((current) => ({
      ...current,
      mockExamMode: mode,
      mockExamCatalogId: mode === 'PUBLIC' ? current.mockExamCatalogId : '',
      mockExamName: mode === 'PRIVATE' ? current.mockExamName : '',
    }));
    if (mode === 'PRIVATE') {
      setTemplateStatus('idle');
      setTemplatePreview(null);
    }
  }

  function selectInferredDomain(domain) {
    updateField('inferredDomain', domain);
  }

  function selectPublicExam(examId) {
    const exam = getPublicExamById(examId);
    const templateDefaults = getPublicExamTemplateDefaults(values, exam);
    setSaveError('');
    setValues((current) => ({
      ...current,
      mockExamCatalogId: examId,
      mockExamName: exam?.name || '',
      templateFormat: templateDefaults?.templateFormat || current.templateFormat,
      templateDurationMinutes: templateDefaults?.templateDurationMinutes || current.templateDurationMinutes,
      templateQuestionCount: templateDefaults?.templateQuestionCount || current.templateQuestionCount,
      templatePrompt: '',
      templateNotes: '',
    }));
  }

  function generateTemplatePreviewAsync() {
    clearTimeout(templateTimerRef.current);
    setTemplateStatus('loading');
    templateTimerRef.current = setTimeout(() => {
      setTemplatePreview(generateTemplateSuggestion(values, selectedExam));
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
      if (needsKnowledgeDescription && !values.knowledgeDescription.trim()) {
        nextErrors.knowledgeDescription = t('workspace.profileConfig.validation.knowledgeDescriptionRequired');
      }
    }

    if (targetStep === 2) {
      if (!values.currentLevel.trim()) nextErrors.currentLevel = t('workspace.profileConfig.validation.currentLevelRequired');
      if (!values.learningGoal.trim()) nextErrors.learningGoal = t('workspace.profileConfig.validation.learningGoalRequired');
      if ((values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST') && !values.strongAreas.trim()) {
        nextErrors.strongAreas = t('workspace.profileConfig.validation.strongAreasRequired');
      }
      if ((values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST') && !values.weakAreas.trim()) {
        nextErrors.weakAreas = t('workspace.profileConfig.validation.weakAreasRequired');
      }

      if (values.workspacePurpose === 'MOCK_TEST') {
        if (!values.mockExamMode) nextErrors.mockExamMode = t('workspace.profileConfig.validation.mockExamModeRequired');
        if (values.mockExamMode === 'PUBLIC' && !values.mockExamCatalogId) {
          nextErrors.mockExamCatalogId = t('workspace.profileConfig.validation.publicExamRequired');
        }
        if (values.mockExamMode === 'PRIVATE' && !values.mockExamName.trim()) {
          nextErrors.mockExamName = t('workspace.profileConfig.validation.privateExamRequired');
        }
      }
    }

    if (targetStep === 3) {
      if (pendingFiles.length === 0 && uploadedMaterialCount === 0) {
        nextErrors.materials = translateOrFallback(
          t,
          'workspace.profileConfig.validation.materialsRequired',
          'Vui lòng tải lên ít nhất một tài liệu phù hợp với workspace.'
        );
      }
    }

    if (targetStep === 4) {
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

  async function persistUploadStep() {
    const stepErrors = validateStep(3);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      return false;
    }

    if (pendingFiles.length === 0) {
      return true;
    }

    setSubmitting(true);
    setSaveError('');

    try {
      await onUploadFiles?.(pendingFiles);
      setPendingFiles([]);
      return true;
    } catch (error) {
      setSaveError(
        error?.message
          || translateOrFallback(
            t,
            'workspace.profileConfig.validation.uploadFailed',
            'Không thể tải lên tài liệu ở bước hiện tại. Vui lòng thử lại.'
          )
      );
      return false;
    } finally {
      setSubmitting(false);
    }
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
        setConsistencyStatus('loading');
        const consistencyData = {
          knowledge: values.knowledgeInput.trim(),
          domain: values.inferredDomain,
          learningMode: mapLearningModeForApi(values.workspacePurpose),
          currentLevel: values.currentLevel.trim() || null,
          learningGoal: values.learningGoal.trim() || null,
          examName: values.mockExamName?.trim() || null,
          strongAreas: values.strongAreas ? values.strongAreas.split(/[,\n;/]+/).map((s) => s.trim()).filter(Boolean) : [],
          weakAreas: values.weakAreas ? values.weakAreas.split(/[,\n;/]+/).map((s) => s.trim()).filter(Boolean) : [],
        };
        const result = await validateProfileConsistency(consistencyData);
        setConsistencyResult(result);
        setConsistencyStatus('success');

        // Block save if redFlag
        if (result.redFlag) {
          setSaveError(result.message || 'Nội dung vi phạm chính sách.');
          return { ok: false };
        }
      } catch (error) {
        console.error('[StudyProfile] Consistency validation failed:', error);
        setConsistencyStatus('error');
        // Don't block save on validation API error, just log
      }
    }

    setSubmitting(true);
    setSaveError('');

    try {
      const result = await onSave(stepToPersist, buildPayload(values));
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
      setStep((current) => Math.min(TOTAL_STEPS, current + 1));
      return;
    }

    if (step === 2 && values.workspacePurpose === 'MOCK_TEST' && mockTestGenerationState === 'pending') {
      return;
    }

    if (step === 3) {
      const isUploaded = await persistUploadStep();
      if (isUploaded) {
        setStep(4);
      }
      return;
    }

    const saveState = await persistStep(step);
    if (saveState.ok) {
      if (step === 2 && values.workspacePurpose === 'MOCK_TEST' && saveState.result?.deferred) {
        if (saveState.result?.advanceToStep) {
          setStep(saveState.result.advanceToStep);
        }
        return;
      }

      setStep((current) => Math.min(TOTAL_STEPS, current + 1));
    }
  }

  function previousStep() {
    setSaveError('');
    setStep((current) => Math.max(1, current - 1));
  }

  function isStepComplete(targetStep) {
    return Object.keys(validateStep(targetStep)).length === 0;
  }

  async function handleSubmit() {
    if (isReadOnly) return;
    await persistStep(4);
  }

  function applySuggestion(field, value) {
    updateField(field, value);
  }

  function retryKnowledgeAnalysis() {
    // Force re-trigger by appending/removing a space
    const current = values.knowledgeInput;
    setValues((prev) => ({
      ...prev,
      knowledgeInput: current.endsWith(' ') ? current.trimEnd() : current + ' ',
    }));
  }

  return {
    totalSteps: TOTAL_STEPS,
    step,
    values,
    errors,
    saveError,
    statusNotice: values.workspacePurpose === 'MOCK_TEST' ? mockTestGenerationMessage : '',
    statusTone:
      values.workspacePurpose === 'MOCK_TEST'
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
    submitting,
    pendingFiles,
    analysisStatus,
    domainOptions,
    needsKnowledgeDescription,
    selectedExam,
    examSearch,
    templateStatus,
    templatePreview,
    // AI state
    knowledgeAnalysis,
    fieldSuggestions,
    fieldSuggestionStatus,
    consistencyResult,
    consistencyStatus,
    // Actions
    updateField,
    addPendingFiles,
    removePendingFile,
    setPurpose,
    setMockExamMode,
    selectInferredDomain,
    selectPublicExam,
    generateTemplatePreviewAsync,
    setExamSearch,
    nextStep,
    previousStep,
    handleSubmit,
    isStepComplete,
    applySuggestion,
    retryKnowledgeAnalysis,
  };
}
