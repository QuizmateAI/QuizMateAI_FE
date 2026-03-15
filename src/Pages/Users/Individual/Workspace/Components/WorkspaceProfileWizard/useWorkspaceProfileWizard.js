import { useEffect, useRef, useState } from 'react';
import {
  analyzeKnowledgeInput,
  generateTemplateSuggestion,
  getPublicExamById,
  getPublicExamByName,
} from './mockProfileWizardData';

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

function hasProfileData(initialData) {
  if (!initialData || typeof initialData !== 'object') return false;

  return Object.values(initialData).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined && value !== false;
  });
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

function getInitialStep(initialData, isReadOnly) {
  const profileStatus = initialData?.profileStatus;

  if (isReadOnly || profileStatus === 'DONE') return 3;
  if (profileStatus === 'PERSONAL_INFO_DONE') return 3;
  if (profileStatus === 'BASIC_DONE') return 2;
  return 1;
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

export function useWorkspaceProfileWizard({ open, initialData, onSave, t, isReadOnly = false }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(createInitialValues(initialData));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [domainOptions, setDomainOptions] = useState([]);
  const [templateStatus, setTemplateStatus] = useState('idle');
  const [templatePreview, setTemplatePreview] = useState(null);
  const [examSearch, setExamSearch] = useState('');
  const analysisTimerRef = useRef(null);
  const templateTimerRef = useRef(null);
  const wasOpenRef = useRef(false);

  const selectedExam = getPublicExamById(values.mockExamCatalogId);
  const needsKnowledgeDescription = analysisStatus === 'success' && analyzeKnowledgeInput(values.knowledgeInput).isGeneric;

  useEffect(() => {
    return () => {
      clearTimeout(analysisTimerRef.current);
      clearTimeout(templateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) return;

    wasOpenRef.current = true;

    const nextValues = createInitialValues(initialData);
    setStep(getInitialStep(initialData, isReadOnly));
    setValues(nextValues);
    setErrors({});
    setSaveError('');
    setSubmitting(false);
    setDomainOptions([]);
    setAnalysisStatus(nextValues.knowledgeInput ? 'loading' : 'idle');
    setTemplateStatus(nextValues.templatePrompt ? 'success' : 'idle');
    setTemplatePreview(nextValues.templatePrompt ? generateTemplateSuggestion(nextValues, getPublicExamById(nextValues.mockExamCatalogId)) : null);
    setExamSearch('');
  }, [open, initialData, isReadOnly]);

  useEffect(() => {
    if (!open) return;

    clearTimeout(analysisTimerRef.current);

    if (!values.knowledgeInput.trim()) {
      setAnalysisStatus('idle');
      setDomainOptions([]);
      setValues((current) => ({
        ...current,
        inferredDomain: '',
      }));
      return;
    }

    setAnalysisStatus('loading');
    analysisTimerRef.current = setTimeout(() => {
      const result = analyzeKnowledgeInput(values.knowledgeInput);
      const localizedOptions = localizeDomainOptions(result.domainSuggestions, t);
      setDomainOptions(localizedOptions);
      setAnalysisStatus('success');
      setValues((current) => ({
        ...current,
        inferredDomain: localizedOptions.some((option) => option.label === current.inferredDomain) && current.inferredDomain ? current.inferredDomain : '',
        selectedKnowledgeOption: current.knowledgeInput.trim(),
      }));
    }, 650);

    return () => clearTimeout(analysisTimerRef.current);
  }, [open, values.knowledgeInput]);

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
  }

  function selectInferredDomain(domain) {
    updateField('inferredDomain', domain);
  }

  function selectPublicExam(examId) {
    const exam = getPublicExamById(examId);
    setSaveError('');
    setValues((current) => ({
      ...current,
      mockExamCatalogId: examId,
      mockExamName: exam?.name || '',
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
      if (analysisStatus !== 'success') {
        nextErrors.inferredDomain = translateOrFallback(
          t,
          'workspace.profileConfig.validation.waitForAi',
          'Vui long doi AI phan tich xong kien thuc.'
        );
      }
      if (!values.inferredDomain) {
        nextErrors.inferredDomain = translateOrFallback(
          t,
          'workspace.profileConfig.validation.domainRequired',
          'Vui long chon linh vuc do AI de xuat.'
        );
      }
      if (needsKnowledgeDescription && !values.knowledgeDescription.trim()) {
        nextErrors.knowledgeDescription = t('workspace.profileConfig.validation.knowledgeDescriptionRequired');
      }
    }

    if (targetStep === 2) {
      if (!values.currentLevel.trim()) nextErrors.currentLevel = t('workspace.profileConfig.validation.currentLevelRequired');
      if (!values.learningGoal.trim()) nextErrors.learningGoal = t('workspace.profileConfig.validation.learningGoalRequired');

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

  async function persistStep(stepToPersist) {
    const stepErrors = validateStep(stepToPersist);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      return false;
    }

    setSubmitting(true);
    setSaveError('');

    try {
      await onSave(stepToPersist, buildPayload(values));
      return true;
    } catch (error) {
      setSaveError(
        error?.message
          || translateOrFallback(
            t,
            'workspace.profileConfig.validation.saveFailed',
            'Khong the luu buoc hien tai. Vui long thu lai.'
          )
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function nextStep() {
    if (isReadOnly) {
      setStep((current) => Math.min(3, current + 1));
      return;
    }

    const isSaved = await persistStep(step);
    if (isSaved) {
      setStep((current) => Math.min(3, current + 1));
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
    await persistStep(3);
  }

  return {
    step,
    values,
    errors,
    saveError,
    submitting,
    analysisStatus,
    domainOptions,
    needsKnowledgeDescription,
    selectedExam,
    examSearch,
    templateStatus,
    templatePreview,
    updateField,
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
  };
}
