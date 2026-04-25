import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import GroupWorkspaceProfileConfigMirrorContent from './GroupWorkspaceProfileConfigMirrorContent';
import i18nInstance from '@/i18n';
import { analyzeKnowledge, suggestProfileFields } from '@/api/StudyProfileAPI';
import {
  confirmGroupWorkspaceProfile,
  getGroupWorkspaceProfile,
  normalizeGroupWorkspaceProfile,
  saveGroupBasicStep,
  saveGroupConfigStep,
  saveGroupRoadmapConfigStep,
  suggestGroupRoadmapConfig,
  updateGroupConfigStep,
} from '@/api/WorkspaceAPI';

const LEARNING_MODES = [
  { value: 'STUDY_NEW', labelKey: 'groupWorkspaceProfileConfigMirror.learningModes.studyNew', labelFallback: 'Study New', icon: BrainCircuit },
  { value: 'REVIEW', labelKey: 'groupWorkspaceProfileConfigMirror.learningModes.review', labelFallback: 'Group Review', icon: Sparkles },
];

const GROUP_NAME_PLACEHOLDERS = new Set(['group name null']);
const ANALYSIS_DEBOUNCE_MS = 800;
const FIELD_SUGGESTION_DEBOUNCE_MS = 700;
const COMPACT_TEXTAREA_MIN_HEIGHT = 72;

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function getErrorMessage(error, fallback) {
  return error?.message || error?.response?.data?.message || fallback;
}

function translateOrFallback(key, fallback, options) {
  return i18nInstance.t(key, { defaultValue: fallback, ...(options || {}) });
}

function formatSeatLimit(value) {
  const safeValue = Number(value);
  if (Number.isFinite(safeValue) && safeValue > 0) {
    return i18nInstance.t('groupWorkspaceProfileConfigMirror.seatLimit.members', '{{count}} members', { count: safeValue });
  }
  return i18nInstance.t('groupWorkspaceProfileConfigMirror.seatLimit.managed', 'Managed by the active group plan');
}

function normalizeGroupNameValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return GROUP_NAME_PLACEHOLDERS.has(trimmed.toLowerCase()) ? '' : trimmed;
}

function normalizeGroupLearningMode(value) {
  const normalized = (value || '').toString().trim().toUpperCase();

  if (normalized === 'MOCK_TEST') {
    return 'REVIEW';
  }

  if (normalized === 'STUDY_NEW' || normalized === 'REVIEW') {
    return normalized;
  }

  return '';
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

function extractDomainSuggestionDetails(result) {
  if (!result || typeof result !== 'object') return [];

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
    reason,
  };
}

function buildFallbackDomainReason(label, knowledge, index) {
  const normalizedLabel = normalizeReasonText(label);

  if (normalizedLabel.includes('dich')) {
    return i18nInstance.t(
      'groupWorkspaceProfileConfigMirror.domainReason.translation',
      'Matches the translation-focused direction your group described.'
    );
  }

  if (normalizedLabel.includes('bang')) {
    return i18nInstance.t(
      'groupWorkspaceProfileConfigMirror.domainReason.comparison',
      'Fits a comparison or bridge-style learning scope across two knowledge systems.'
    );
  }

  if (isEnglishVietnamesePairSignal(knowledge)) {
    return i18nInstance.t(
      'groupWorkspaceProfileConfigMirror.domainReason.englishVietnamesePair',
      'Fits a shared learning scope centered on the English-Vietnamese language pair.'
    );
  }

  const fallbackKeys = [
    { key: 'groupWorkspaceProfileConfigMirror.domainReason.fallback1', fallback: 'This is the closest match to the knowledge scope your group described.' },
    { key: 'groupWorkspaceProfileConfigMirror.domainReason.fallback2', fallback: 'This is a related area the AI inferred from the knowledge you entered.' },
    { key: 'groupWorkspaceProfileConfigMirror.domainReason.fallback3', fallback: 'This is a broader context that may still fit your group learning goal.' },
  ];

  const entry = fallbackKeys[index] || fallbackKeys[0];
  return i18nInstance.t(entry.key, entry.fallback);
}

function buildDomainOptionsFromApi({ domainSuggestions, domainSuggestionDetails, knowledge }) {
  const normalizedDetails = (Array.isArray(domainSuggestionDetails) ? domainSuggestionDetails : [])
    .map(normalizeDomainSuggestionDetail)
    .filter(Boolean);

  if (normalizedDetails.length > 0) {
    return normalizedDetails.slice(0, 5).map((item, index) => ({
      label: item.label,
      reason: item.reason || buildFallbackDomainReason(item.label, knowledge, index),
    }));
  }

  if (!Array.isArray(domainSuggestions) || domainSuggestions.length === 0) {
    return [];
  }

  return domainSuggestions.slice(0, 5).map((label, index) => ({
    label,
    reason: buildFallbackDomainReason(label, knowledge, index),
  }));
}

function autoResizeTextarea(textarea, minHeight = COMPACT_TEXTAREA_MIN_HEIGHT) {
  if (!textarea) return;
  textarea.style.height = '0px';
  textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
}


function GroupWorkspaceProfileConfigMirror({
  open,
  onOpenChange,
  isDarkMode,
  workspaceId,
  onComplete,
  canClose = true,
  onTemporaryClose,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const canTemporarilyClose = !canClose && typeof onTemporaryClose === 'function';
  const inputClass = cn(
    'w-full rounded-lg border px-3.5 py-3 text-sm outline-none transition-all duration-200 focus:ring-4',
    isDarkMode
      ? 'border-slate-700/90 bg-slate-950/80 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:border-cyan-300 focus:bg-slate-950 focus:ring-cyan-400/10'
      : 'border-slate-200 bg-white/92 text-slate-950 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-18px_rgba(15,23,42,0.14)] focus:border-cyan-500 focus:bg-white focus:ring-cyan-500/15'
  );
  const textareaClass = cn(inputClass, 'min-h-[156px] resize-none rounded-lg px-3.5 py-3.5');
  const compactTextareaClass = cn(inputClass, 'min-h-[72px] overflow-hidden resize-none');
  const fieldEyebrowClass = cn(
    'text-[11px] font-semibold uppercase tracking-[0.16em]',
    isDarkMode ? 'text-cyan-200/70' : 'text-cyan-700'
  );
  const fieldLabelClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const fieldHelperClass = cn('text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600');
  const sectionDividerClass = isDarkMode ? 'border-white/10' : 'border-slate-200';
  const subtlePanelClass = isDarkMode
    ? 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] backdrop-blur-xl'
    : 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] shadow-[0_24px_60px_-44px_rgba(15,23,42,0.22)] backdrop-blur-xl';
  const accentPanelClass = isDarkMode
    ? 'border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(16,185,129,0.08))]'
    : 'border-cyan-200 bg-[linear-gradient(135deg,#effbff_0%,#f0fdf8_100%)]';
  const accentBarClass = isDarkMode
    ? 'bg-[linear-gradient(90deg,rgba(34,211,238,0.9),rgba(16,185,129,0.75))]'
    : 'bg-[linear-gradient(90deg,#06b6d4,#10b981)]';
  const stepRailClass = isDarkMode
    ? 'border-white/10 bg-white/[0.03]'
    : 'border-white/80 bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_28px_48px_-42px_rgba(15,23,42,0.18)] backdrop-blur-xl';

  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [errors, setErrors] = useState({});
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [isPostOnboardingEdit, setIsPostOnboardingEdit] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [rules, setRules] = useState('');
  const [maxMemberOverride, setMaxMemberOverride] = useState(null);
  const [domain, setDomain] = useState('');
  const [knowledge, setKnowledge] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [domainOptions, setDomainOptions] = useState([]);
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState(null);
  const [analysisRetryTick, setAnalysisRetryTick] = useState(0);
  const [groupGoalSuggestions, setGroupGoalSuggestions] = useState([]);
  const [goalSuggestionStatus, setGoalSuggestionStatus] = useState('idle');
  const [goalSuggestionMessage, setGoalSuggestionMessage] = useState('');
  const [learningMode, setLearningMode] = useState('');
  const [groupLearningGoal, setGroupLearningGoal] = useState('');
  const analysisTimerRef = useRef(null);
  const analysisAbortRef = useRef(null);
  const goalSuggestionTimerRef = useRef(null);
  const goalSuggestionAbortRef = useRef(null);
  const knowledgeTextareaRef = useRef(null);
  const groupGoalTextareaRef = useRef(null);
  const isStudyNewMode = learningMode === 'STUDY_NEW';

  useLayoutEffect(() => {
    if (!open || step !== 2) return;
    autoResizeTextarea(knowledgeTextareaRef.current);
  }, [knowledge, open, step]);

  useLayoutEffect(() => {
    if (!open || step !== 2) return;
    autoResizeTextarea(groupGoalTextareaRef.current);
  }, [groupLearningGoal, open, step]);

  const summary = useMemo(() => {
    const mode = LEARNING_MODES.find((item) => item.value === learningMode);
    return {
      mode: mode
        ? t(mode.labelKey, mode.labelFallback)
        : t('groupWorkspaceProfileConfigMirror.summary.modeNotSet', 'Not set'),
    };
  }, [learningMode, t]);

  const totalSteps = isPostOnboardingEdit ? 1 : 2;
  const displayStep = isPostOnboardingEdit ? 1 : step;
  const wizardTitle = isPostOnboardingEdit
    ? t('groupWorkspaceProfileConfigMirror.editConfigTitle', 'Update group learning setup')
    : step === 1
      ? t('groupProfileConfig.stepOne.title')
      : t('groupProfileConfig.stepTwo.title');
  const wizardDescription = isPostOnboardingEdit
    ? t(
      'groupWorkspaceProfileConfigMirror.editConfigDescription',
      'Adjust the shared domain, knowledge scope, learning mode, and group goal without reopening onboarding.'
    )
    : step === 1
      ? t('groupProfileConfig.stepOne.description')
      : t('groupProfileConfig.stepTwo.description');
  const confirmTitle = isPostOnboardingEdit
    ? t('groupWorkspaceProfileConfigMirror.confirm.updateTitle', 'Confirm learning setup update')
    : t('groupWorkspaceProfileConfigMirror.confirm.title', 'Confirm this group profile');
  const confirmDescription = isPostOnboardingEdit
    ? t(
      'groupWorkspaceProfileConfigMirror.confirm.updateDescription',
      'Review the updated learning setup once more before saving it to the active group profile.'
    )
    : t(
      'groupWorkspaceProfileConfigMirror.confirm.description',
      'Review the summary once more. After confirmation, this setup becomes the active profile for the group workspace.'
    );
  const confirmActionLabel = isPostOnboardingEdit
    ? t('groupWorkspaceProfileConfigMirror.confirm.saveUpdateButton', 'Save learning setup')
    : t('groupWorkspaceProfileConfigMirror.confirm.confirmButton', 'Confirm this profile');

  const stepTabs = useMemo(() => {
    const tabs = [
      {
        id: 1,
        icon: Users,
        title: t('groupProfileConfig.tabs.basic.title'),
        description: t('groupProfileConfig.tabs.basic.description'),
      },
      {
        id: 2,
        icon: BrainCircuit,
        title: t('groupProfileConfig.tabs.learning.title'),
        description: t('groupProfileConfig.tabs.learning.description'),
      },
    ];

    return isPostOnboardingEdit ? tabs.filter((item) => item.id === 2) : tabs;
  }, [isPostOnboardingEdit, t]);

  const readinessItems = useMemo(() => ([
    {
      label: t('groupProfileConfig.stepTwo.ready.knowledge'),
      ready: Boolean(knowledge.trim()),
      value: knowledge.trim() || t('groupProfileConfig.stepTwo.ready.pending'),
    },
    {
      label: t('groupProfileConfig.stepTwo.ready.domain'),
      ready: Boolean(domain.trim()),
      value: domain.trim() || t('groupProfileConfig.stepTwo.ready.pending'),
    },
    {
      label: t('groupProfileConfig.stepTwo.ready.mode'),
      ready: Boolean(learningMode),
      value: summary.mode,
    },
    {
      label: t('groupProfileConfig.stepTwo.groupGoal'),
      ready: Boolean(groupLearningGoal.trim()),
      value: groupLearningGoal.trim() || t('groupProfileConfig.stepTwo.ready.pending'),
    },
  ]), [domain, groupLearningGoal, knowledge, learningMode, summary.mode, t]);

  const stepOnePreviewItems = useMemo(() => ([
    {
      id: 'groupName',
      label: t('groupProfileConfig.stepOne.groupName'),
      value: groupName.trim() || t('groupProfileConfig.stepTwo.ready.pending'),
    },
    {
      id: 'seatLimit',
      label: t('groupWorkspaceProfileConfigMirror.stepOne.previewSeatLimit'),
      value: formatSeatLimit(maxMemberOverride),
    },
    {
      id: 'rules',
      label: t('groupProfileConfig.stepOne.rulesEyebrow'),
      value: rules.trim() || t('groupProfileConfig.stepTwo.ready.pending'),
    },
  ]), [groupName, maxMemberOverride, rules, t]);

  const selectedDomainOption = useMemo(
    () => domainOptions.find((option) => option.label === domain) || null,
    [domainOptions, domain]
  );
  const canFinishStepTwo = Boolean(
    knowledge.trim()
    && domain.trim()
    && learningMode
    && groupLearningGoal.trim()
  );
  const finishLabel = isPostOnboardingEdit
    ? t('groupWorkspaceProfileConfigMirror.finishUpdateButton', 'Review update')
    : canFinishStepTwo
      ? t('groupProfileConfig.common.finish')
      : t('groupProfileConfig.common.finishIncomplete');

  const hasAnalysisSummary = analysisStatus === 'success' && Boolean(
    knowledgeAnalysis?.message
    || knowledgeAnalysis?.advice
    || knowledgeAnalysis?.normalizedKnowledge
  );
  const confirmMutedClass = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const confirmLabelClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const confirmationSummarySections = useMemo(() => {
    const emptyLabel = t('groupWorkspaceProfileConfigMirror.confirmationSummary.empty', 'Not configured');

    return [
      {
        id: 'identity',
        title: t('groupWorkspaceProfileConfigMirror.confirmationSummary.identityTitle', 'Group identity'),
        items: [
          { id: 'groupName', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.groupNameLabel', 'Group name'), value: groupName.trim() || emptyLabel },
        ],
      },
      {
        id: 'learning',
        title: t('groupWorkspaceProfileConfigMirror.confirmationSummary.learningScopeTitle', 'Learning scope'),
        items: [
          { id: 'knowledge', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.knowledgeLabel', 'Shared knowledge scope'), value: knowledge.trim() || emptyLabel },
          { id: 'domain', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.domainLabel', 'Domain'), value: domain.trim() || emptyLabel },
          { id: 'mode', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.modeLabel', 'Learning mode'), value: summary.mode || emptyLabel },
        ],
      },
      {
        id: 'notes',
        title: t('groupWorkspaceProfileConfigMirror.confirmationSummary.operatingNotesTitle', 'Operating notes'),
        spanClass: 'lg:col-span-2',
        itemsGridClass: 'space-y-3',
        items: [
          { id: 'goal', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.goalLabel', 'Shared learning goal'), value: groupLearningGoal.trim() || emptyLabel },
          { id: 'rules', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.rulesLabel', 'Group rules'), value: rules.trim() || emptyLabel },
        ],
      },
    ];
  }, [
    domain,
    groupLearningGoal,
    groupName,
    knowledge,
    learningMode,
    rules,
    summary.mode,
    t,
  ]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setSaveError('');
      setStatusNotice('');
      try {
        const response = await getGroupWorkspaceProfile(workspaceId);
        const profile = normalizeGroupWorkspaceProfile(extractApiData(response));
        if (cancelled || !profile) return;
        const normalizedLearningMode = normalizeGroupLearningMode(profile.learningMode);
        const nextIsPostOnboardingEdit = Boolean(profile.onboardingCompleted);
        setGroupName(normalizeGroupNameValue(profile.groupName));
        setRules(profile.rules || '');
        setMaxMemberOverride(profile.maxMemberOverride ?? null);
        setDomain(profile.domain || '');
        setKnowledge(profile.knowledge || '');
        setLearningMode(normalizedLearningMode);
        setGroupLearningGoal(profile.groupLearningGoal || '');
        setIsPostOnboardingEdit(nextIsPostOnboardingEdit);
        const nextStep = nextIsPostOnboardingEdit
          ? 2
          : Math.min(Math.max(Number(profile.currentStep) || 1, 1), 2);
        setStep(nextStep);
        setMaxUnlockedStep(nextIsPostOnboardingEdit ? 2 : Math.max(nextStep, 1));
      } catch {
        if (!cancelled) {
          setIsPostOnboardingEdit(false);
          setStep(1);
          setMaxUnlockedStep(1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open) {
      clearTimeout(goalSuggestionTimerRef.current);
      goalSuggestionAbortRef.current?.abort();
      setErrors({});
      setSaveError('');
      setStatusNotice('');
      setSubmitting(false);
      setAnalysisStatus('idle');
      setDomainOptions([]);
      setKnowledgeAnalysis(null);
      setAnalysisRetryTick(0);
      setGroupGoalSuggestions([]);
      setGoalSuggestionStatus('idle');
      setGoalSuggestionMessage('');
      setShowProfileConfirm(false);
      setIsPostOnboardingEdit(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearTimeout(analysisTimerRef.current);
      analysisAbortRef.current?.abort();
      clearTimeout(goalSuggestionTimerRef.current);
      goalSuggestionAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    clearTimeout(analysisTimerRef.current);
    analysisAbortRef.current?.abort();

    const trimmedKnowledge = knowledge.trim();
    if (!trimmedKnowledge) {
      setAnalysisStatus('idle');
      setDomainOptions([]);
      setKnowledgeAnalysis(null);
      setDomain('');
      return;
    }

    setAnalysisStatus('loading');

    analysisTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      analysisAbortRef.current = abortController;

      try {
        const result = await analyzeKnowledge(trimmedKnowledge, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const nextDomainOptions = buildDomainOptionsFromApi({
          domainSuggestions: result?.domainSuggestions || [],
          domainSuggestionDetails: extractDomainSuggestionDetails(result),
          knowledge: trimmedKnowledge,
        });

        setKnowledgeAnalysis(result);
        setDomainOptions(nextDomainOptions);
        setAnalysisStatus('success');
        setDomain((current) => {
          if (nextDomainOptions.some((option) => option.label === current)) {
            return current;
          }

          return nextDomainOptions.length === 0 ? current : '';
        });
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[GroupWorkspace] Knowledge analysis failed:', error);
        setAnalysisStatus('error');
        setKnowledgeAnalysis(null);
        setDomainOptions([]);
      }
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      clearTimeout(analysisTimerRef.current);
      analysisAbortRef.current?.abort();
    };
  }, [open, knowledge, analysisRetryTick]);

  useEffect(() => {
    if (!open || step !== 2) return;

    clearTimeout(goalSuggestionTimerRef.current);
    goalSuggestionAbortRef.current?.abort();

    const trimmedKnowledge = knowledge.trim();
    const trimmedDomain = domain.trim();
    const normalizedLearningMode = normalizeGroupLearningMode(learningMode);

    if (
      analysisStatus !== 'success'
      || !trimmedKnowledge
      || !trimmedDomain
      || !normalizedLearningMode
    ) {
      setGroupGoalSuggestions([]);
      setGoalSuggestionStatus('idle');
      setGoalSuggestionMessage('');
      return;
    }

    setGoalSuggestionStatus('loading');
    setGoalSuggestionMessage('');

    goalSuggestionTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      goalSuggestionAbortRef.current = abortController;

      try {
        const result = await suggestProfileFields(
          {
            knowledge: trimmedKnowledge,
            domain: trimmedDomain,
            learningMode: normalizedLearningMode,
            currentLevel: null,
            strongAreas: [],
            weakAreas: [],
          },
          { signal: abortController.signal }
        );

        if (abortController.signal.aborted) return;

        const nextSuggestions = Array.isArray(result?.learningGoalSuggestions)
          ? result.learningGoalSuggestions
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
            .slice(0, 3)
          : [];

        setGroupGoalSuggestions(nextSuggestions);
        setGoalSuggestionStatus('success');
        setGoalSuggestionMessage(
          result?.warning && typeof result?.message === 'string'
            ? result.message.trim()
            : ''
        );
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[GroupWorkspace] Goal suggestions failed:', error);
        setGroupGoalSuggestions([]);
        setGoalSuggestionStatus('error');
        setGoalSuggestionMessage(
          getErrorMessage(
            error,
            translateOrFallback(
              'groupWorkspaceProfileConfigMirror.goalSuggestionError',
              'QuizMate AI chưa thể gợi ý mục tiêu học tập lúc này.'
            )
          )
        );
      }
    }, FIELD_SUGGESTION_DEBOUNCE_MS);

    return () => {
      clearTimeout(goalSuggestionTimerRef.current);
      goalSuggestionAbortRef.current?.abort();
    };
  }, [open, step, analysisStatus, knowledge, domain, learningMode]);

  const validateStepOne = () => {
    const nextErrors = {};
    if (!groupName.trim()) {
      nextErrors.groupName = t('groupProfileConfig.validation.groupName');
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors = {};
    if (!knowledge.trim()) nextErrors.knowledge = t('groupProfileConfig.validation.knowledge');
    if (knowledge.trim()) {
      if (analysisStatus === 'loading') {
        nextErrors.domain = t('groupProfileConfig.validation.analysisLoading');
      } else if (analysisStatus === 'error') {
        nextErrors.domain = t('groupProfileConfig.validation.analysisError');
      } else if (analysisStatus !== 'success') {
        nextErrors.domain = t('groupProfileConfig.validation.analysisMissing');
      } else if (!domain.trim()) {
        nextErrors.domain = t('groupProfileConfig.validation.domain');
      }
    }
    if (!learningMode) nextErrors.learningMode = t('groupProfileConfig.validation.learningMode');
    if (!groupLearningGoal.trim()) nextErrors.groupLearningGoal = t('groupProfileConfig.validation.groupGoal');
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) {
      setSaveError(
        t(
          'groupWorkspaceProfileConfigMirror.validation.completeRequired',
          'Please complete the required fields before reviewing the final setup.'
        )
      );

      requestAnimationFrame(() => {
        const firstErrorElement = document.querySelector('.group-profile-field-error');
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    } else {
      setSaveError('');
    }
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!workspaceId || loading || submitting || !validateStepOne()) return;
    setSubmitting(true);
    setSaveError('');
    setStatusNotice('');
    try {
      await saveGroupBasicStep(workspaceId, { groupName, rules, defaultRoleOnJoin: 'MEMBER' });
      setStep(2);
      setMaxUnlockedStep(2);
    } catch (error) {
      setSaveError(getErrorMessage(error, t('groupProfileConfig.messages.basicsSaveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!validateStepTwo()) return;
    if (!workspaceId || loading || submitting) {
      return;
    }
    setSubmitting(true);
    setSaveError('');
    setStatusNotice('');
    try {
      const payload = {
        domain,
        knowledge,
        learningMode: normalizeGroupLearningMode(learningMode),
        roadmapEnabled: true,
        groupLearningGoal,
        examName: null,
        preLearningRequired: false,
      };

      if (isPostOnboardingEdit) {
        await updateGroupConfigStep(workspaceId, payload);
      } else {
        await saveGroupConfigStep(workspaceId, payload);

        if (payload.roadmapEnabled) {
          try {
            const suggestResponse = await suggestGroupRoadmapConfig(workspaceId);
            const suggestion = suggestResponse?.data?.data ?? suggestResponse?.data ?? {};
            await saveGroupRoadmapConfigStep(workspaceId, {
              knowledgeLoad: suggestion.knowledgeLoad,
              adaptationMode: suggestion.adaptationMode,
              speedMode: suggestion.speedMode,
              estimatedTotalDays: suggestion.estimatedTotalDays,
              estimatedMinutesPerDay: suggestion.estimatedMinutesPerDay,
              preLearningRequired: suggestion.preLearningRequired,
            });
          } catch (roadmapError) {
            console.warn('[GroupProfile] roadmap-config suggest/save failed', roadmapError);
          }
        }

        await confirmGroupWorkspaceProfile(workspaceId);
      }

      setShowProfileConfirm(false);
      setStatusNotice(
        isPostOnboardingEdit
          ? t('groupWorkspaceProfileConfigMirror.messages.updated', 'Group learning setup updated.')
          : t('groupProfileConfig.messages.completed')
      );
      if (onComplete) {
        await Promise.resolve(onComplete());
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      setSaveError(getErrorMessage(error, t('groupProfileConfig.messages.confirmSaveError')));
      setShowProfileConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (!canClose && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  const handleHeaderClose = () => {
    if (canTemporarilyClose) {
      onTemporaryClose();
      return;
    }

    if (showProfileConfirm) {
      setShowProfileConfirm(false);
      return;
    }

    onOpenChange(false);
  };

  const shellClass = isDarkMode
    ? 'border-slate-800 bg-[#020817] text-white'
    : 'border-white/80 bg-[linear-gradient(180deg,#fbfeff_0%,#f7fbff_46%,#f4fbf8_100%)] text-slate-900';
  const panelClass = isDarkMode
    ? 'border-white/10 bg-white/[0.02]'
    : 'border-white/80 bg-white/90 shadow-[0_28px_70px_-52px_rgba(15,23,42,0.24)] backdrop-blur-xl';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const analysisToneClass = knowledgeAnalysis?.warning
    ? isDarkMode
      ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
      : 'border-amber-200 bg-amber-50 text-amber-900'
    : isDarkMode
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900';

  return (
    <GroupWorkspaceProfileConfigMirrorContent
      LEARNING_MODES={LEARNING_MODES}
      accentBarClass={accentBarClass}
      accentPanelClass={accentPanelClass}
      analysisStatus={analysisStatus}
      analysisToneClass={analysisToneClass}
      autoResizeTextarea={autoResizeTextarea}
      canClose={canClose}
      canFinishStepTwo={canFinishStepTwo}
      canTemporarilyClose={canTemporarilyClose}
      compactTextareaClass={compactTextareaClass}
      confirmActionLabel={confirmActionLabel}
      confirmDescription={confirmDescription}
      confirmLabelClass={confirmLabelClass}
      confirmMutedClass={confirmMutedClass}
      confirmTitle={confirmTitle}
      confirmationSummarySections={confirmationSummarySections}
      displayStep={displayStep}
      domain={domain}
      domainOptions={domainOptions}
      errors={errors}
      fieldEyebrowClass={fieldEyebrowClass}
      fieldHelperClass={fieldHelperClass}
      fieldLabelClass={fieldLabelClass}
      finishLabel={finishLabel}
      fontClass={fontClass}
      goalSuggestionMessage={goalSuggestionMessage}
      goalSuggestionStatus={goalSuggestionStatus}
      groupGoalSuggestions={groupGoalSuggestions}
      groupGoalTextareaRef={groupGoalTextareaRef}
      groupLearningGoal={groupLearningGoal}
      groupName={groupName}
      handleConfirmSubmit={handleConfirmSubmit}
      handleDialogOpenChange={handleDialogOpenChange}
      handleHeaderClose={handleHeaderClose}
      handleNext={handleNext}
      hasAnalysisSummary={hasAnalysisSummary}
      inputClass={inputClass}
      isDarkMode={isDarkMode}
      isPostOnboardingEdit={isPostOnboardingEdit}
      knowledge={knowledge}
      knowledgeAnalysis={knowledgeAnalysis}
      knowledgeTextareaRef={knowledgeTextareaRef}
      learningMode={learningMode}
      loading={loading}
      maxUnlockedStep={maxUnlockedStep}
      mutedClass={mutedClass}
      onOpenChange={onOpenChange}
      open={open}
      panelClass={panelClass}
      readinessItems={readinessItems}
      rules={rules}
      saveError={saveError}
      sectionDividerClass={sectionDividerClass}
      selectedDomainOption={selectedDomainOption}
      setAnalysisRetryTick={setAnalysisRetryTick}
      setDomain={setDomain}
      setErrors={setErrors}
      setGroupLearningGoal={setGroupLearningGoal}
      setGroupName={setGroupName}
      setKnowledge={setKnowledge}
      setLearningMode={setLearningMode}
      setRules={setRules}
      setShowProfileConfirm={setShowProfileConfirm}
      setStep={setStep}
      shellClass={shellClass}
      showProfileConfirm={showProfileConfirm}
      statusNotice={statusNotice}
      step={step}
      stepOnePreviewItems={stepOnePreviewItems}
      stepRailClass={stepRailClass}
      stepTabs={stepTabs}
      submitting={submitting}
      subtlePanelClass={subtlePanelClass}
      t={t}
      textareaClass={textareaClass}
      totalSteps={totalSteps}
      translateOrFallback={translateOrFallback}
      validateStepTwo={validateStepTwo}
      wizardDescription={wizardDescription}
      wizardTitle={wizardTitle}
    />
  );
}

export default GroupWorkspaceProfileConfigMirror;
