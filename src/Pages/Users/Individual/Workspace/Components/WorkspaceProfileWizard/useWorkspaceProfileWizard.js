import { useEffect, useRef, useState } from 'react';
import {
  analyzeKnowledgeInput,
  generateImprovementRecommendations,
  generateTemplateSuggestion,
  getPublicExamById,
} from './mockProfileWizardData';

function parseArrayValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(/[,\n;/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function ensureString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
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
    (initialData?.mockExamName || initialData?.mockExamCatalogId || initialData?.targetScore
      ? 'MOCK_TEST'
      : initialData?.weakAreas || initialData?.strongAreas
        ? 'REVIEW'
        : hasExistingProfile
          ? 'STUDY_NEW'
          : '');

  const mockExamMode =
    initialData?.mockExamMode ||
    (initialData?.mockExamCatalogId ? 'PUBLIC' : initialData?.mockExamName ? 'PRIVATE' : 'PUBLIC');

  const targetScore = ensureString(initialData?.targetScore || initialData?.customTargetLevel || '');
  const targetScoreScale = ensureString(initialData?.targetScoreScale || '');

  return {
    workspacePurpose: purpose,
    knowledgeInput: ensureString(initialData?.knowledgeInput || initialData?.customKnowledge || ''),
    knowledgeDescription: ensureString(initialData?.knowledgeDescription || initialData?.customSchemeDescription || ''),
    inferredDomain: ensureString(initialData?.inferredDomain || initialData?.customDomain || ''),
    selectedKnowledgeOption: ensureString(initialData?.selectedKnowledgeOption || initialData?.knowledgeInput || initialData?.customKnowledge || ''),
    enableRoadmap:
      initialData?.enableRoadmap ??
      Boolean(
        purpose === 'STUDY_NEW' ||
        initialData?.adaptationMode ||
        initialData?.roadmapSpeedMode ||
        initialData?.estimatedTotalDays ||
        initialData?.recommendedMinutesPerDay
      ),
    currentLevel: ensureString(initialData?.currentLevel || initialData?.customCurrentLevel || ''),
    learningGoal: ensureString(initialData?.learningGoal || ''),
    strongAreas: ensureString(initialData?.strongAreas || ''),
    weakAreas: ensureString(initialData?.weakAreas || ''),
    mockExamMode,
    mockExamCatalogId: ensureString(initialData?.mockExamCatalogId || ''),
    mockExamName: ensureString(initialData?.mockExamName || ''),
    templatePrompt: ensureString(initialData?.templatePrompt || ''),
    templateFormat: ensureString(initialData?.templateFormat || 'FULL_EXAM'),
    templateDurationMinutes: ensureNumber(initialData?.templateDurationMinutes, 90),
    templateQuestionCount: ensureNumber(initialData?.templateQuestionCount, 60),
    templateNotes: ensureString(initialData?.templateNotes || ''),
    adaptationMode: normalizeAdaptationMode(ensureString(initialData?.adaptationMode || 'BALANCED')),
    roadmapSpeedMode: ensureString(initialData?.roadmapSpeedMode || 'STANDARD'),
    estimatedTotalDays: ensureNumber(initialData?.estimatedTotalDays, 30),
    recommendedMinutesPerDay: ensureNumber(initialData?.recommendedMinutesPerDay, 90),
    improvementFocus: parseArrayValue(initialData?.improvementFocus || initialData?.weakAreas || ''),
    targetScore,
    targetScoreScale,
    expectedExamDate: ensureString(initialData?.expectedExamDate || initialData?.targetExamDate || ''),
  };
}

function shouldShowImprovementFocus(values) {
  return values.workspacePurpose === 'REVIEW' || values.workspacePurpose === 'MOCK_TEST';
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
    improvementFocus: shouldShowImprovementFocus(values) ? values.improvementFocus : [],
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
          targetScore: values.targetScore.trim() || null,
          targetScoreScale:
            values.mockExamMode === 'PUBLIC'
              ? selectedExam?.scoreScale || values.targetScoreScale || null
              : values.targetScoreScale.trim() || null,
          expectedExamDate: values.expectedExamDate || null,
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
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [domainOptions, setDomainOptions] = useState([]);
  const [improvementStatus, setImprovementStatus] = useState('idle');
  const [improvementOptions, setImprovementOptions] = useState([]);
  const [templateStatus, setTemplateStatus] = useState('idle');
  const [templatePreview, setTemplatePreview] = useState(null);
  const [examSearch, setExamSearch] = useState('');
  const [useCustomTargetScore, setUseCustomTargetScore] = useState(Boolean(createInitialValues(initialData).targetScore));
  const analysisTimerRef = useRef(null);
  const improvementTimerRef = useRef(null);
  const templateTimerRef = useRef(null);

  const selectedExam = getPublicExamById(values.mockExamCatalogId);
  const needsKnowledgeDescription = analysisStatus === 'success' && analyzeKnowledgeInput(values.knowledgeInput).isGeneric;

  useEffect(() => {
    return () => {
      clearTimeout(analysisTimerRef.current);
      clearTimeout(improvementTimerRef.current);
      clearTimeout(templateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const nextValues = createInitialValues(initialData);
    setStep(1);
    setValues(nextValues);
    setErrors({});
    setSubmitting(false);
    setDomainOptions([]);
    setAnalysisStatus(nextValues.knowledgeInput ? 'loading' : 'idle');
    setImprovementStatus('idle');
    setImprovementOptions([]);
    setTemplateStatus(nextValues.templatePrompt ? 'success' : 'idle');
    setTemplatePreview(nextValues.templatePrompt ? generateTemplateSuggestion(nextValues, getPublicExamById(nextValues.mockExamCatalogId)) : null);
    setExamSearch('');
    setUseCustomTargetScore(Boolean(nextValues.targetScore));
  }, [open, initialData]);

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

  useEffect(() => {
    if (!open || step !== 3 || !shouldShowImprovementFocus(values)) return;

    clearTimeout(improvementTimerRef.current);
    setImprovementStatus('loading');
    improvementTimerRef.current = setTimeout(() => {
      setImprovementOptions(generateImprovementRecommendations(values, selectedExam));
      setImprovementStatus('success');
    }, 700);

    return () => clearTimeout(improvementTimerRef.current);
  }, [
    open,
    step,
    values.workspacePurpose,
    values.currentLevel,
    values.learningGoal,
    values.strongAreas,
    values.weakAreas,
    values.knowledgeInput,
    values.inferredDomain,
    values.mockExamCatalogId,
  ]);

  useEffect(() => {
    if (values.mockExamMode !== 'PUBLIC' || !selectedExam) return;

    setValues((current) => ({
      ...current,
      targetScoreScale: selectedExam.scoreScale,
    }));
  }, [values.mockExamMode, selectedExam?.id]);

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function setPurpose(purpose) {
    setValues((current) => ({
      ...current,
      workspacePurpose: purpose,
      enableRoadmap: purpose === 'STUDY_NEW' ? true : current.enableRoadmap,
    }));
  }

  function setMockExamMode(mode) {
    setValues((current) => ({
      ...current,
      mockExamMode: mode,
      mockExamCatalogId: mode === 'PUBLIC' ? current.mockExamCatalogId : '',
      mockExamName: mode === 'PRIVATE' ? current.mockExamName : '',
      targetScoreScale: mode === 'PRIVATE' ? current.targetScoreScale : getPublicExamById(current.mockExamCatalogId)?.scoreScale || '',
      targetScore: mode === 'PRIVATE' ? current.targetScore : '',
    }));
    setUseCustomTargetScore(false);
  }

  function selectInferredDomain(domain) {
    updateField('inferredDomain', domain);
  }

  function toggleImprovementFocus(option) {
    setValues((current) => {
      const nextSet = current.improvementFocus.includes(option)
        ? current.improvementFocus.filter((item) => item !== option)
        : [...current.improvementFocus, option];

      return {
        ...current,
        improvementFocus: nextSet,
      };
    });
  }

  function selectPublicExam(examId) {
    const exam = getPublicExamById(examId);
    setValues((current) => ({
      ...current,
      mockExamCatalogId: examId,
      mockExamName: exam?.name || '',
      targetScoreScale: exam?.scoreScale || '',
      targetScore: '',
    }));
    setUseCustomTargetScore(false);
  }

  function setTargetScoreSuggestion(score) {
    setValues((current) => ({
      ...current,
      targetScore: score,
    }));
    setUseCustomTargetScore(false);
  }

  function enableCustomTargetScore() {
    setUseCustomTargetScore(true);
    setValues((current) => ({
      ...current,
      targetScore: '',
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
      if (analysisStatus !== 'success') nextErrors.inferredDomain = t('workspace.profileConfig.validation.waitForAi');
      if (!values.inferredDomain) nextErrors.inferredDomain = t('workspace.profileConfig.validation.domainRequired');
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
      if (shouldShowImprovementFocus(values) && values.improvementFocus.length === 0) {
        nextErrors.improvementFocus = t('workspace.profileConfig.validation.improvementFocusRequired');
      }

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

      if (values.workspacePurpose === 'MOCK_TEST') {
        if (!values.targetScore.trim()) nextErrors.targetScore = t('workspace.profileConfig.validation.targetScoreRequired');
        if (values.mockExamMode === 'PRIVATE' && !values.targetScoreScale.trim()) {
          nextErrors.targetScoreScale = t('workspace.profileConfig.validation.targetScoreScaleRequired');
        }
        if (!values.expectedExamDate) {
          nextErrors.expectedExamDate = t('workspace.profileConfig.validation.expectedExamDateRequired');
        }
      }
    }

    return nextErrors;
  }

  function nextStep() {
    if (isReadOnly) {
      setStep((current) => Math.min(3, current + 1));
      return;
    }

    const stepErrors = validateStep(step);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length === 0) {
      setStep((current) => Math.min(3, current + 1));
    }
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1));
  }

  function isStepComplete(targetStep) {
    return Object.keys(validateStep(targetStep)).length === 0;
  }

  async function handleSubmit() {
    if (isReadOnly) return;

    const finalErrors = {
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    };

    setErrors(finalErrors);

    if (Object.keys(finalErrors).length > 0) {
      const firstBrokenStep = [1, 2, 3].find((item) => Object.keys(validateStep(item)).length > 0) || 1;
      setStep(firstBrokenStep);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(buildPayload(values));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    step,
    values,
    errors,
    submitting,
    analysisStatus,
    domainOptions,
    needsKnowledgeDescription,
    selectedExam,
    examSearch,
    improvementStatus,
    improvementOptions,
    templateStatus,
    templatePreview,
    useCustomTargetScore,
    updateField,
    setPurpose,
    setMockExamMode,
    selectInferredDomain,
    toggleImprovementFocus,
    selectPublicExam,
    setTargetScoreSuggestion,
    enableCustomTargetScore,
    generateTemplatePreviewAsync,
    setExamSearch,
    nextStep,
    previousStep,
    handleSubmit,
    isStepComplete,
  };
}
