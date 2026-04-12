import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Loader2,
  RefreshCw,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import i18nInstance from '@/i18n';
import { analyzeKnowledge } from '@/api/StudyProfileAPI';
import {
  confirmGroupWorkspaceProfile,
  getGroupWorkspaceProfile,
  normalizeGroupWorkspaceProfile,
  saveGroupBasicStep,
  saveGroupConfigStep,
} from '@/api/WorkspaceAPI';

const LEARNING_MODES = [
  { value: 'STUDY_NEW', labelKey: 'groupWorkspaceProfileConfigMirror.learningModes.studyNew', labelFallback: 'Study New', icon: BrainCircuit },
  { value: 'REVIEW', labelKey: 'groupWorkspaceProfileConfigMirror.learningModes.review', labelFallback: 'Group Review', icon: Sparkles },
  { value: 'MOCK_TEST', labelKey: 'groupWorkspaceProfileConfigMirror.learningModes.mockTest', labelFallback: 'Group Mock Test', icon: ScrollText },
];

const GROUP_NAME_PLACEHOLDERS = new Set(['group name null']);
const ANALYSIS_DEBOUNCE_MS = 800;
const COMPACT_TEXTAREA_MIN_HEIGHT = 72;

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function getErrorMessage(error, fallback) {
  return error?.message || error?.response?.data?.message || fallback;
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

function FieldError({ message }) {
  if (!message) return null;
  return <p className="group-profile-field-error text-xs font-medium text-rose-500">{message}</p>;
}

function ChoiceCard({ active, onClick, icon: Icon, title, description, disabled, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-full rounded-[22px] border p-4 text-left transition-all duration-200 hover:scale-[1.02]',
        active
          ? isDarkMode
            ? 'border-cyan-400/40 bg-cyan-500/10'
            : 'border-cyan-300 bg-cyan-50'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.03] hover:border-white/20'
            : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)] hover:border-[color:var(--surface-border-strong)]',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="flex h-full items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl border',
          active
            ? isDarkMode ? 'border-cyan-300/35 bg-cyan-400/20 text-cyan-100' : 'border-cyan-200 bg-white text-cyan-700'
            : isDarkMode ? 'border-white/10 bg-slate-900/70 text-slate-200' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-60)] text-slate-600'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function ToggleTile({ checked, onChange, title, description, badge, disabled, isDarkMode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[22px] border p-4 transition-all duration-200',
        checked
          ? isDarkMode
            ? 'border-cyan-400/30 bg-cyan-500/10'
            : 'border-cyan-200 bg-cyan-50/90'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.03]'
            : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)]',
        disabled && 'cursor-not-allowed opacity-70'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge ? (
            <span className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
              isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'
            )}>
              {badge}
            </span>
          ) : null}
        </span>
        <span className={cn('mt-1 block text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
          {description}
        </span>
      </span>
    </label>
  );
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
    'w-full rounded-[22px] border px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:ring-4',
    isDarkMode
      ? 'border-slate-700/90 bg-slate-950/80 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:border-cyan-300 focus:bg-slate-950 focus:ring-cyan-400/10'
      : 'border-[color:var(--surface-border-mid)] bg-[color:var(--design-30)] text-slate-950 placeholder:text-slate-400 shadow-[var(--surface-shadow-soft)] focus:border-cyan-500 focus:bg-cyan-50/35 focus:ring-cyan-500/15'
  );
  const textareaClass = cn(inputClass, 'min-h-[156px] resize-none rounded-[24px] px-4 py-4');
  const compactTextareaClass = cn(inputClass, 'min-h-[72px] overflow-hidden resize-none');
  const fieldShellClass = cn(
    'rounded-[26px] border p-4 md:p-5',
    isDarkMode
      ? 'border-white/10 bg-white/[0.035]'
      : 'border-[color:var(--surface-border-soft)] bg-[linear-gradient(180deg,var(--design-30)_0%,var(--design-60)_100%)] shadow-[var(--surface-shadow-soft)]'
  );
  const fieldEyebrowClass = cn(
    'text-[11px] font-semibold uppercase tracking-[0.16em]',
    isDarkMode ? 'text-cyan-200/70' : 'text-cyan-700'
  );
  const fieldLabelClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const fieldHelperClass = cn('text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600');

  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [errors, setErrors] = useState({});
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [rules, setRules] = useState('');
  const [maxMemberOverride, setMaxMemberOverride] = useState(null);
  const [domain, setDomain] = useState('');
  const [knowledge, setKnowledge] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [domainOptions, setDomainOptions] = useState([]);
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState(null);
  const [analysisRetryTick, setAnalysisRetryTick] = useState(0);
  const [learningMode, setLearningMode] = useState('');
  const [roadmapEnabled, setRoadmapEnabled] = useState(false);
  const [groupLearningGoal, setGroupLearningGoal] = useState('');
  const [examName, setExamName] = useState('');
  const [preLearningRequired, setPreLearningRequired] = useState(false);
  const analysisTimerRef = useRef(null);
  const analysisAbortRef = useRef(null);
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

  const stepTabs = useMemo(() => ([
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
  ]), [t]);

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

  const selectedDomainOption = useMemo(
    () => domainOptions.find((option) => option.label === domain) || null,
    [domainOptions, domain]
  );
  const canFinishStepTwo = Boolean(
    knowledge.trim()
    && domain.trim()
    && learningMode
    && groupLearningGoal.trim()
    && (learningMode !== 'MOCK_TEST' || examName.trim())
  );

  const hasAnalysisSummary = analysisStatus === 'success' && Boolean(
    knowledgeAnalysis?.message
    || knowledgeAnalysis?.advice
    || knowledgeAnalysis?.normalizedKnowledge
  );
  const confirmMutedClass = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const confirmLabelClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const confirmationSummarySections = useMemo(() => {
    const emptyLabel = t('groupWorkspaceProfileConfigMirror.confirmationSummary.empty', 'Not configured');
    const enabledLabel = t('groupWorkspaceProfileConfigMirror.confirmationSummary.enabled', 'Enabled');
    const disabledLabel = t('groupWorkspaceProfileConfigMirror.confirmationSummary.disabled', 'Disabled');
    const requiredLabel = t('groupWorkspaceProfileConfigMirror.confirmationSummary.required', 'Required');
    const notRequiredLabel = t('groupWorkspaceProfileConfigMirror.confirmationSummary.notRequired', 'Not required');

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
          ...(learningMode === 'MOCK_TEST'
            ? [{ id: 'exam', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.examLabel', 'Exam name'), value: examName.trim() || emptyLabel }]
            : []),
        ],
      },
      {
        id: 'config',
        title: t('groupWorkspaceProfileConfigMirror.confirmationSummary.groupSetupTitle', 'Group setup'),
        items: [
          { id: 'roadmap', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.roadmapLabel', 'Shared roadmap'), value: roadmapEnabled ? enabledLabel : disabledLabel },
          { id: 'entry', label: t('groupWorkspaceProfileConfigMirror.confirmationSummary.entryLabel', 'Entry assessment'), value: preLearningRequired ? requiredLabel : notRequiredLabel },
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
    examName,
    groupLearningGoal,
    groupName,
    knowledge,
    learningMode,
    preLearningRequired,
    roadmapEnabled,
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
        setGroupName(normalizeGroupNameValue(profile.groupName));
        setRules(profile.rules || '');
        setMaxMemberOverride(profile.maxMemberOverride ?? null);
        setDomain(profile.domain || '');
        setKnowledge(profile.knowledge || '');
        setLearningMode(profile.learningMode || '');
        setRoadmapEnabled(
          profile.learningMode === 'STUDY_NEW'
            ? Boolean(profile.roadmapEnabled ?? true)
            : Boolean(profile.roadmapEnabled)
        );
        setGroupLearningGoal(profile.groupLearningGoal || '');
        setExamName(profile.examName || '');
        setPreLearningRequired(Boolean(profile.preLearningRequired));
        const nextStep = Math.min(Math.max(Number(profile.currentStep) || 1, 1), 2);
        setStep(nextStep);
        setMaxUnlockedStep(profile.onboardingCompleted ? 2 : Math.max(nextStep, 1));
      } catch {
        if (!cancelled) {
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
      setErrors({});
      setSaveError('');
      setStatusNotice('');
      setSubmitting(false);
      setAnalysisStatus('idle');
      setDomainOptions([]);
      setKnowledgeAnalysis(null);
      setAnalysisRetryTick(0);
      setShowProfileConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearTimeout(analysisTimerRef.current);
      analysisAbortRef.current?.abort();
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
    if (learningMode === 'MOCK_TEST' && !examName.trim()) {
      nextErrors.examName = t('groupProfileConfig.validation.examName');
    }
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
      await saveGroupConfigStep(workspaceId, {
        domain,
        knowledge,
        learningMode,
        roadmapEnabled,
        groupLearningGoal,
        examName,
        preLearningRequired,
      });
      await confirmGroupWorkspaceProfile(workspaceId);
      setShowProfileConfirm(false);
      setStatusNotice(t('groupProfileConfig.messages.completed'));
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

  const shellClass = isDarkMode ? 'border-slate-800 bg-gradient-to-br from-[#020817] via-[#020817] to-slate-900/50 text-white' : 'border-[color:var(--surface-border-mid)] bg-[linear-gradient(180deg,var(--design-60)_0%,#edf6ff_100%)] text-slate-900';
  const panelClass = isDarkMode ? 'border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02]' : 'border-[color:var(--surface-border-mid)] bg-[linear-gradient(180deg,var(--design-30)_0%,#f7fbff_100%)] shadow-[0_30px_64px_-48px_rgba(15,23,42,0.18)]';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const analysisToneClass = knowledgeAnalysis?.warning
    ? isDarkMode
      ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
      : 'border-amber-200 bg-amber-50 text-amber-900'
    : isDarkMode
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900';

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        hideClose
        onEscapeKeyDown={canClose ? undefined : (event) => event.preventDefault()}
        onInteractOutside={canClose ? undefined : (event) => event.preventDefault()}
        className={cn('flex max-h-[92vh] max-w-6xl flex-col overflow-hidden rounded-[32px] border p-0 shadow-2xl', shellClass, fontClass)}
      >
        <DialogHeader className="border-b border-inherit px-8 pb-5 pt-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {showProfileConfirm ? (
                <>
                  <div className={cn(
                    'mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.04em]',
                    isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  )}>
                    <Check className="h-3.5 w-3.5" />
                    {t('groupWorkspaceProfileConfigMirror.confirm.badge', 'PROFILE CONFIRMATION')}
                  </div>
                  <DialogTitle className="text-[24px] font-bold">
                    {t('groupWorkspaceProfileConfigMirror.confirm.title', 'Confirm this group profile')}
                  </DialogTitle>
                  <DialogDescription className={cn('mt-2 max-w-4xl text-sm leading-6', confirmMutedClass)}>
                    {t(
                      'groupWorkspaceProfileConfigMirror.confirm.description',
                      'Review the summary once more. After confirmation, this setup becomes the active profile for the group workspace.'
                    )}
                  </DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle className="text-[24px] font-bold">
                    {step === 1
                      ? t('groupProfileConfig.stepOne.title')
                      : t('groupProfileConfig.stepTwo.title')}
                  </DialogTitle>
                  <DialogDescription className={cn('mt-2 max-w-3xl text-sm leading-6', mutedClass)}>
                    {step === 1
                      ? t('groupProfileConfig.stepOne.description')
                      : t('groupProfileConfig.stepTwo.description')}
                  </DialogDescription>
                </>
              )}
            </div>
            {canTemporarilyClose ? (
              <button
                type="button"
                onClick={handleHeaderClose}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-900'
                    : 'border-[color:var(--surface-border-mid)] bg-[color:var(--design-30)] text-slate-700 shadow-[var(--surface-shadow-soft)] hover:bg-[color:var(--design-60)]'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            ) : canClose ? (
              <button
                type="button"
                onClick={handleHeaderClose}
                className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)] text-slate-600')}
                aria-label={t('groupProfileConfig.common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {showProfileConfirm ? (
            <div className="mt-5">
              <div className={cn(
                'rounded-[26px] border px-5 py-5 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.35)]',
                isDarkMode
                  ? 'border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(8,47,73,0.78),rgba(6,78,59,0.78))]'
                  : 'border-[color:var(--surface-border-mid)] bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(239,246,255,1),rgba(236,253,245,0.98))]'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    isDarkMode ? 'bg-white/10 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t('groupWorkspaceProfileConfigMirror.confirm.finalReviewTitle', 'Final review before applying to the group')}
                    </p>
                    <p className={cn('mt-1 text-sm leading-6', confirmMutedClass)}>
                      {t(
                        'groupWorkspaceProfileConfigMirror.confirm.finalReviewDescription',
                        'You can still return to the wizard to revise the goal, rules, or learning scope before saving.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {stepTabs.map((item) => {
                const active = step === item.id;
                const unlocked = item.id <= maxUnlockedStep;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked || loading || submitting}
                    onClick={() => setStep(item.id)}
                    className={cn(
                      'rounded-[24px] border px-4 py-4 text-left transition-all duration-200',
                      active
                        ? isDarkMode
                          ? 'border-cyan-400/40 bg-cyan-500/10 shadow-[0_22px_48px_-36px_rgba(34,211,238,0.45)]'
                          : 'border-cyan-400 bg-[linear-gradient(135deg,#ecfeff_0%,#f0fdfa_100%)] shadow-[0_24px_44px_-34px_rgba(6,182,212,0.3)]'
                        : isDarkMode
                          ? 'border-white/10 bg-white/[0.03]'
                          : 'border-[color:var(--surface-border-mid)] bg-[color:var(--design-30)] hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--design-60)]',
                      !unlocked && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                        active
                          ? isDarkMode
                            ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100'
                            : 'border-cyan-200 bg-white text-cyan-700 shadow-sm'
                          : isDarkMode
                            ? 'border-white/10 bg-slate-900/70 text-slate-200'
                            : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-60)] text-slate-600'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className={cn('mt-1 text-xs leading-5', mutedClass)}>{item.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        <div className="custom-scrollbar-group-setup min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-4 scroll-smooth md:pb-10">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : showProfileConfirm ? (
            <div className="space-y-4">
              <div className={cn(
                'rounded-[20px] border px-4 py-3',
                isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)]'
              )}>
                <p className={cn('text-sm leading-6', confirmMutedClass)}>
                  {t(
                    'groupWorkspaceProfileConfigMirror.confirm.editHint',
                    'You can still go back and edit before applying.'
                  )}
                </p>
              </div>

              <div className={cn(
                'rounded-[26px] border px-5 py-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.28)]',
                isDarkMode
                  ? 'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))]'
                  : 'border-[color:var(--surface-border-mid)] bg-[linear-gradient(180deg,var(--design-30)_0%,#f4f9ff_100%)]'
              )}>
                <div className="border-b border-inherit pb-4">
                  <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', confirmLabelClass)}>
                    {t('groupWorkspaceProfileConfigMirror.confirm.applyEyebrow', 'This group profile will be applied')}
                  </p>
                  <p className={cn('mt-2 text-sm leading-6', confirmMutedClass)}>
                    {t(
                      'groupWorkspaceProfileConfigMirror.confirm.applyDescription',
                      'Everything below will be saved as the current learning setup for this group workspace.'
                    )}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {confirmationSummarySections.map((section) => (
                    <section
                      key={section.id}
                      className={cn(
                        'rounded-[24px] border px-4 py-4 shadow-[0_18px_36px_-30px_rgba(14,165,233,0.18)] sm:px-5',
                        section.spanClass,
                        isDarkMode
                          ? 'border-cyan-400/15 bg-slate-950/70'
                          : 'border-cyan-300 bg-white'
                      )}
                    >
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', confirmLabelClass)}>
                        {section.title}
                      </p>

                      <div className={cn('mt-4', section.itemsGridClass || 'space-y-3')}>
                        {section.items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              'rounded-[20px] border px-3.5 py-3.5 shadow-sm',
                              isDarkMode
                                ? 'border-white/10 bg-white/[0.04]'
                                : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-60)]'
                            )}
                          >
                            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', confirmLabelClass)}>
                              {item.label}
                            </p>
                            <p className={cn('mt-1.5 text-sm font-semibold leading-6', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : step === 1 ? (
            <section className={cn('rounded-[30px] border p-5', panelClass)}>
              <div className="space-y-4">
                <div className={fieldShellClass}>
                  <div className="mb-4 space-y-1.5">
                    <label className={cn('text-sm font-semibold', fieldLabelClass)}>
                      {t('groupProfileConfig.stepOne.groupName')} <span className="text-rose-500">*</span>
                    </label>
                    <p className={fieldHelperClass}>{t('groupProfileConfig.stepOne.groupNameHint')}</p>
                  </div>
                  <input
                    value={groupName}
                    onChange={(e) => { setGroupName(e.target.value); setErrors((prev) => ({ ...prev, groupName: undefined })); }}
                    className={cn(inputClass, 'text-[15px] font-medium')}
                    placeholder={t('groupProfileConfig.stepOne.groupNamePlaceholder')}
                  />
                  <FieldError message={errors.groupName} />
                </div>

                <div className={fieldShellClass}>
                  <div className="mb-4 space-y-1.5">
                    <p className={fieldEyebrowClass}>{t('groupProfileConfig.stepOne.rulesEyebrow')}</p>
                    <p className={fieldHelperClass}>{t('groupProfileConfig.stepOne.rulesHint')}</p>
                  </div>
                  <textarea
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    className={textareaClass}
                    placeholder={t('groupProfileConfig.stepOne.rulesPlaceholder')}
                  />
                </div>
              </div>
            </section>
          ) : (
            <div className={cn('grid gap-5', step === 2 && 'lg:grid-cols-[minmax(0,1.2fr)_320px]')}>
              <section className={cn('rounded-[30px] border p-4 md:p-5', panelClass)}>
                <div className="space-y-5">
                  <div className="space-y-3 pb-3 md:pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.learningMode')} <span className="text-rose-500">*</span></p>
                      <span className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', mutedClass)}>
                        {t('groupProfileConfig.stepTwo.modePrompt')}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {LEARNING_MODES.map((item) => (
                        <ChoiceCard
                          key={item.value}
                          active={learningMode === item.value}
                          onClick={() => {
                            setLearningMode(item.value);
                            setErrors((prev) => ({ ...prev, learningMode: undefined, examName: undefined }));
                            if (item.value === 'STUDY_NEW') {
                              setRoadmapEnabled(true);
                            }
                            if (item.value !== 'MOCK_TEST') {
                              setExamName('');
                            }
                          }}
                          icon={item.icon}
                          title={t(item.labelKey, item.labelFallback)}
                          description={item.value === 'STUDY_NEW'
                            ? t('groupProfileConfig.stepTwo.studyNewDescription')
                            : item.value === 'REVIEW'
                              ? t('groupProfileConfig.stepTwo.reviewDescription')
                              : t('groupProfileConfig.stepTwo.mockTestDescription')}
                          disabled={loading || submitting}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                    </div>
                    <FieldError message={errors.learningMode} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.knowledgeLabel')} <span className="text-rose-500">*</span></label>
                    <textarea
                      ref={knowledgeTextareaRef}
                      value={knowledge}
                      onChange={(e) => {
                        setKnowledge(e.target.value);
                        setDomain('');
                        setErrors((prev) => ({ ...prev, knowledge: undefined, domain: undefined }));
                        autoResizeTextarea(e.target);
                      }}
                      className={compactTextareaClass}
                      placeholder={t('groupProfileConfig.stepTwo.knowledgePlaceholder')}
                    />
                    <FieldError message={errors.knowledge} />
                  </div>

                  {analysisStatus === 'loading' ? (
                    <div className={cn(
                      'flex items-center gap-3 rounded-[24px] border px-4 py-3',
                      isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                    )}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-medium">
                        {t('groupProfileConfig.stepTwo.analysis.loading')}
                      </span>
                    </div>
                  ) : null}

                  {analysisStatus === 'error' ? (
                    <div className={cn(
                      'flex flex-wrap items-center justify-between gap-3 rounded-[24px] border px-4 py-3',
                      isDarkMode ? 'border-rose-400/20 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700'
                    )}>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          {t('groupProfileConfig.stepTwo.analysis.error')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDomain('');
                          setErrors((prev) => ({ ...prev, domain: undefined }));
                          setAnalysisRetryTick((current) => current + 1);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                          isDarkMode ? 'bg-rose-500/20 hover:bg-rose-500/30' : 'bg-rose-100 hover:bg-rose-200'
                        )}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('groupProfileConfig.common.retry')}
                      </button>
                    </div>
                  ) : null}

                  {hasAnalysisSummary ? (
                    <div className={cn('rounded-[24px] border px-4 py-3', analysisToneClass)}>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          {knowledgeAnalysis?.message ? (
                            <p className="text-sm font-medium leading-6">{knowledgeAnalysis.message}</p>
                          ) : null}
                          {knowledgeAnalysis?.advice ? (
                            <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'opacity-85' : 'opacity-80')}>
                              {knowledgeAnalysis.advice}
                            </p>
                          ) : null}
                          {knowledgeAnalysis?.normalizedKnowledge ? (
                            <div className="mt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
                                {t('groupProfileConfig.stepTwo.analysis.interpretingLabel')}
                              </p>
                              <p className="mt-1 text-sm leading-6">{knowledgeAnalysis.normalizedKnowledge}</p>
                            </div>
                          ) : null}
                          {knowledgeAnalysis?.tooBroad ? (
                            <p className={cn('mt-3 text-xs font-medium leading-5', isDarkMode ? 'text-amber-100/90' : 'text-amber-900/80')}>
                              {t('groupProfileConfig.stepTwo.analysis.tooBroad')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {analysisStatus === 'success' ? (
                    <div className={cn(
                      'rounded-[24px] border p-4',
                      isDarkMode ? 'border-slate-700 bg-slate-950/50' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-60)]'
                    )}>
                      <p className="mb-3 text-sm font-semibold">
                        {t('groupProfileConfig.stepTwo.domainSuggestions')} <span className="text-rose-500">*</span>
                      </p>
                      {domainOptions.length > 0 ? (
                        <div className="space-y-4">
                          {domainOptions.map((option) => {
                            const active = domain === option.label;

                            return (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => {
                                  setDomain(option.label);
                                  setErrors((prev) => ({ ...prev, domain: undefined }));
                                }}
                                className={cn(
                                  'flex w-full items-start gap-3 rounded-[20px] border px-5 py-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
                                  active
                                    ? isDarkMode
                                      ? 'border-cyan-300/40 bg-cyan-500/12 text-cyan-50 hover:border-cyan-300/50'
                                      : 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:border-cyan-400'
                                    : isDarkMode
                                      ? 'border-white/10 bg-white/[0.03] hover:border-white/20'
                                      : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)] hover:border-[color:var(--surface-border-strong)]'
                                )}
                              >
                                <div className={cn(
                                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                  active
                                    ? isDarkMode ? 'bg-cyan-400/20 text-cyan-100' : 'bg-cyan-100 text-cyan-700'
                                    : isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-600'
                                )}>
                                  {active ? <CheckCircle2 className="h-4 w-4" /> : <Compass className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold">{option.label}</p>
                                    <span className={cn(
                                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                      active
                                        ? isDarkMode ? 'bg-cyan-400/20 text-cyan-100' : 'bg-cyan-100 text-cyan-700'
                                        : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    )}>
                                      {active ? t('groupProfileConfig.common.selected') : t('groupProfileConfig.common.select')}
                                    </span>
                                  </div>
                                  <p className={cn('mt-1.5 text-sm leading-6', active ? '' : mutedClass)}>
                                    {option.reason}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={cn(
                          'rounded-[20px] border border-dashed px-4 py-3 text-sm leading-6',
                          isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)] text-slate-600'
                        )}>
                          <p className="font-semibold">
                            {t('groupProfileConfig.stepTwo.analysis.emptyDomainTitle')}
                          </p>
                          <p className={cn('mt-1 text-sm', mutedClass)}>
                            {t('groupProfileConfig.stepTwo.analysis.emptyDomainDescription')}
                          </p>
                        </div>
                      )}
                      <FieldError message={errors.domain} />
                    </div>
                  ) : null}

                  {domain ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.selectedDomain')} <span className="text-rose-500">*</span></label>
                      <div className={cn(
                        'rounded-[22px] border px-4 py-3',
                        isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'
                      )}>
                        <p className="text-sm font-semibold">{domain}</p>
                        <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                          {selectedDomainOption?.reason
                            || t('groupProfileConfig.stepTwo.selectedDomainHint')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {analysisStatus !== 'success' ? <FieldError message={errors.domain} /> : null}

                  {learningMode === 'MOCK_TEST' ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.examName')} <span className="text-rose-500">*</span></label>
                      <input value={examName} onChange={(e) => { setExamName(e.target.value); setErrors((prev) => ({ ...prev, examName: undefined })); }} className={inputClass} placeholder={t('groupProfileConfig.stepTwo.examNamePlaceholder')} />
                      <FieldError message={errors.examName} />
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.groupGoal')} <span className="text-rose-500">*</span></label>
                    <textarea
                      ref={groupGoalTextareaRef}
                      value={groupLearningGoal}
                      onChange={(e) => {
                        setGroupLearningGoal(e.target.value);
                        setErrors((prev) => ({ ...prev, groupLearningGoal: undefined }));
                        autoResizeTextarea(e.target);
                      }}
                      className={compactTextareaClass}
                      placeholder={t('groupProfileConfig.stepTwo.groupGoalPlaceholder')}
                    />
                    <FieldError message={errors.groupLearningGoal} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.learningSwitches')}</p>
                        <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                          {t('groupProfileConfig.stepTwo.learningSwitchesHint')}
                        </p>
                      </div>
                      {isStudyNewMode ? (
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {t('groupProfileConfig.stepTwo.roadmap.studyNewBadge')}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ToggleTile
                        checked={roadmapEnabled}
                        onChange={setRoadmapEnabled}
                        title={t('groupProfileConfig.stepTwo.roadmap.title')}
                        description={isStudyNewMode
                          ? t('groupProfileConfig.stepTwo.roadmap.studyNewDescription')
                          : t('groupProfileConfig.stepTwo.roadmap.description')}
                        badge={isStudyNewMode ? t('groupProfileConfig.stepTwo.roadmap.defaultOn') : null}
                        isDarkMode={isDarkMode}
                      />
                      <ToggleTile
                        checked={preLearningRequired}
                        onChange={setPreLearningRequired}
                        title={t('groupProfileConfig.stepTwo.entryAssessment.title')}
                        description={t('groupProfileConfig.stepTwo.entryAssessment.description')}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {step === 2 && (
                <aside className={cn('rounded-[30px] border p-4 md:p-5 animate-in fade-in duration-500', panelClass)}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', mutedClass)}>
                    {t('groupProfileConfig.stepTwo.sidebar.eyebrow')}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {t('groupProfileConfig.stepTwo.sidebar.title')}
                  </h3>

                  <div className={cn(
                    'mt-4 rounded-[24px] border p-4',
                    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-60)]'
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.ready.title')}</p>
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        canFinishStepTwo
                          ? isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                      )}>
                        {canFinishStepTwo
                          ? t('groupProfileConfig.stepTwo.sidebar.readyBadge')
                          : t('groupProfileConfig.stepTwo.ready.pending')}
                      </span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {readinessItems.map((item) => (
                        <div
                          key={item.label}
                          className={cn(
                            'flex items-start gap-3 rounded-[18px] border px-3 py-3',
                            item.ready
                              ? isDarkMode
                                ? 'border-emerald-400/15 bg-emerald-500/10'
                                : 'border-emerald-100 bg-emerald-50/80'
                              : isDarkMode
                                ? 'border-white/10 bg-slate-950/50'
                                : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)]'
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            item.ready
                              ? isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                              : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'
                          )}>
                            {item.ready ? <CheckCircle2 className="h-4 w-4" /> : <Compass className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-80">{item.label}</p>
                            <p className={cn('mt-1 text-sm leading-6', item.ready ? '' : mutedClass)}>{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </aside>
              )}
            </div>
          )}
        </div>

        <DialogFooter className={cn(
          'relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-8 py-4 backdrop-blur-xl',
          isDarkMode 
            ? 'border-slate-800 bg-gradient-to-t from-[#020817] via-[#020817]/95 to-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]' 
            : 'border-[color:var(--surface-border-soft)] bg-gradient-to-t from-[var(--design-60)] via-[var(--design-60)] to-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'
        )}>
          <div className="space-y-1">
            <div className={cn('text-xs leading-5', showProfileConfirm ? confirmMutedClass : mutedClass)}>
              {showProfileConfirm
                ? '\u00A0'
                : t('groupProfileConfig.common.stepCount', { current: step, total: 2 })}
            </div>
            {saveError ? <p className="text-xs font-medium text-rose-500">{saveError}</p> : null}
            {!saveError && statusNotice ? <p className="text-xs font-medium text-emerald-500">{statusNotice}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {showProfileConfirm ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || submitting}
                  onClick={() => setShowProfileConfirm(false)}
                  className={cn(
                    'rounded-[24px] px-5',
                    isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-900' : 'border-[color:var(--surface-border-soft)] bg-[color:var(--design-30)] text-slate-700 hover:bg-[color:var(--design-60)]'
                  )}
                >
                  {t('groupWorkspaceProfileConfigMirror.confirm.backToEdit', 'Back to edit')}
                </Button>
                <Button
                  type="button"
                  disabled={loading || submitting}
                  onClick={handleConfirmSubmit}
                  className="rounded-[24px] bg-emerald-600 px-6 text-white transition-all duration-200 hover:bg-emerald-700"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {t('groupWorkspaceProfileConfigMirror.confirm.confirmButton', 'Confirm this profile')}
                </Button>
              </>
            ) : step > 1 ? (
              <Button type="button" variant="ghost" disabled={loading || submitting} onClick={() => setStep(1)} className={cn('rounded-[24px] px-5 transition-all duration-200', isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100')}>
                <ChevronLeft className="h-4 w-4" />
                {t('groupProfileConfig.common.back')}
              </Button>
            ) : null}

            {!showProfileConfirm && step === 1 ? (
              <Button type="button" disabled={loading || submitting} onClick={handleNext} className="rounded-[24px] bg-cyan-600 px-6 text-white transition-all duration-200 hover:bg-cyan-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? t('groupProfileConfig.common.saving') : t('groupProfileConfig.common.continue')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : !showProfileConfirm ? (
              <Button
                type="button"
                disabled={loading || submitting}
                onClick={() => {
                  if (!validateStepTwo()) return;
                  setShowProfileConfirm(true);
                }}
                className="rounded-[24px] bg-emerald-600 px-6 text-white transition-all duration-200 hover:bg-emerald-700"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting
                  ? t('groupProfileConfig.common.saving')
                  : canFinishStepTwo
                    ? t('groupProfileConfig.common.finish')
                    : t('groupProfileConfig.common.finishIncomplete')}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GroupWorkspaceProfileConfigMirror;
