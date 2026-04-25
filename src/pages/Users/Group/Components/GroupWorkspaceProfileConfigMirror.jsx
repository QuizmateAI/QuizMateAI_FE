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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

function FieldError({ message }) {
  if (!message) return null;
  return <p className="group-profile-field-error mt-2 text-xs font-medium text-rose-500">{message}</p>;
}

function ChoiceCard({ active, onClick, icon: Icon, title, description, disabled, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-full rounded-xl border px-4 py-4 text-left transition-all duration-200',
        active
          ? isDarkMode
            ? 'border-cyan-300/60 bg-[linear-gradient(135deg,rgba(8,145,178,0.22),rgba(16,185,129,0.14))] shadow-[0_18px_36px_-24px_rgba(34,211,238,0.45)] ring-1 ring-cyan-300/20'
            : 'border-cyan-300 bg-[linear-gradient(135deg,#dff7ff_0%,#e7fbf3_100%)] shadow-[0_22px_42px_-28px_rgba(6,182,212,0.32)] ring-1 ring-cyan-200'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
            : 'border-slate-200 bg-white/88 hover:border-slate-300 hover:bg-white',
        !disabled && 'hover:-translate-y-0.5',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="flex h-full items-start gap-3">
        <div className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl border',
          active
            ? isDarkMode ? 'border-cyan-300/35 bg-cyan-400/20 text-cyan-100' : 'border-cyan-200 bg-white text-cyan-700 shadow-[0_12px_24px_-18px_rgba(6,182,212,0.45)]'
            : isDarkMode ? 'border-white/10 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{title}</p>
            {active ? (
              <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', isDarkMode ? 'text-cyan-200' : 'text-cyan-600')} />
            ) : null}
          </div>
          <p className={cn('mt-1.5 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
            {description}
          </p>
        </div>
      </div>
    </button>
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        hideClose
        onEscapeKeyDown={canClose ? undefined : (event) => event.preventDefault()}
        onInteractOutside={canClose ? undefined : (event) => event.preventDefault()}
        className={cn('flex max-h-[92vh] max-w-[1180px] flex-col overflow-hidden rounded-2xl border p-0 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.35)]', shellClass, fontClass)}
      >
        <DialogHeader className={cn(
          'border-b px-6 py-5 text-left sm:px-7',
          sectionDividerClass,
          isDarkMode ? 'bg-[#020817]/95' : 'bg-[linear-gradient(180deg,rgba(244,251,255,0.92),rgba(255,255,255,0.96))]'
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
                  showProfileConfirm
                    ? (isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700')
                    : (isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600')
                )}
              >
                {showProfileConfirm ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t('groupWorkspaceProfileConfigMirror.confirm.badge', 'PROFILE CONFIRMATION')}
                  </>
                ) : (
                  t('groupProfileConfig.common.stepCount', { current: displayStep, total: totalSteps })
                )}
              </div>
              {showProfileConfirm ? (
                <>
                  <DialogTitle className="text-[28px] font-bold leading-tight">
                    {confirmTitle}
                  </DialogTitle>
                  <DialogDescription className={cn('max-w-4xl text-sm leading-6', confirmMutedClass)}>
                    {confirmDescription}
                  </DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle className="text-[28px] font-bold leading-tight">
                    {wizardTitle}
                  </DialogTitle>
                  <DialogDescription className={cn('max-w-3xl text-sm leading-6', mutedClass)}>
                    {wizardDescription}
                  </DialogDescription>
                </>
              )}
            </div>
            {canTemporarilyClose ? (
              <button
                type="button"
                onClick={handleHeaderClose}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors',
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            ) : canClose ? (
              <button
                type="button"
                onClick={handleHeaderClose}
                className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg border', isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                aria-label={t('groupProfileConfig.common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {showProfileConfirm ? (
            <div className="mt-5">
              <div className={cn(
                'rounded-xl border px-5 py-5',
                isDarkMode
                  ? 'border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(8,47,73,0.78),rgba(6,78,59,0.78))]'
                  : 'border-[color:var(--surface-border-mid)] bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(239,246,255,1),rgba(236,253,245,0.98))]'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
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
            <div className={cn('mt-6 rounded-2xl border p-2', stepRailClass)}>
              <div className="grid gap-2 md:grid-cols-2">
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
                        'rounded-xl border px-4 py-4 text-left transition-all duration-200',
                        active
                          ? isDarkMode
                            ? 'border-cyan-400/40 bg-cyan-500/10 shadow-[0_18px_36px_-28px_rgba(34,211,238,0.35)]'
                            : 'border-cyan-200 bg-[linear-gradient(135deg,#effbff_0%,#f0fdf8_100%)] shadow-[0_24px_40px_-34px_rgba(6,182,212,0.28)]'
                          : isDarkMode
                            ? 'border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.03]'
                            : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white/70',
                        !unlocked && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                          active
                            ? isDarkMode
                              ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100'
                              : 'border-cyan-200 bg-white text-cyan-700 shadow-[0_10px_20px_-16px_rgba(6,182,212,0.45)]'
                            : isDarkMode
                              ? 'border-white/10 bg-slate-900/70 text-slate-200'
                              : 'border-slate-200 bg-white text-slate-600'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                        </div>
                          <p className={cn('mt-1.5 text-xs leading-5', mutedClass)}>{item.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="custom-scrollbar-group-setup min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-5 scroll-smooth sm:px-7 md:pb-10">
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
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className={cn('rounded-2xl border p-6', panelClass)}>
                <div className={cn('mb-6 h-1 w-16 rounded-full', accentBarClass)} />
                <div className="space-y-8">
                  <div className={cn('border-b pb-8', sectionDividerClass)}>
                    <p className={fieldEyebrowClass}>
                      {t('groupProfileConfig.stepOne.groupNameEyebrow', t('groupProfileConfig.stepOne.groupName'))}
                    </p>
                    <div className="mt-2 max-w-2xl space-y-1.5">
                      <label className={cn('text-base font-semibold', fieldLabelClass)}>
                        {t('groupProfileConfig.stepOne.groupName')} <span className="text-rose-500">*</span>
                      </label>
                      <p className={fieldHelperClass}>{t('groupProfileConfig.stepOne.groupNameHint')}</p>
                    </div>
                    <div className="mt-4">
                      <input
                        value={groupName}
                        onChange={(e) => { setGroupName(e.target.value); setErrors((prev) => ({ ...prev, groupName: undefined })); }}
                        className={cn(inputClass, 'text-[15px] font-medium')}
                        placeholder={t('groupProfileConfig.stepOne.groupNamePlaceholder')}
                      />
                      <FieldError message={errors.groupName} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="max-w-2xl space-y-1.5">
                      <p className={fieldEyebrowClass}>{t('groupProfileConfig.stepOne.rulesEyebrow')}</p>
                      <p className={fieldHelperClass}>{t('groupProfileConfig.stepOne.rulesHint')}</p>
                    </div>
                    <div>
                      <textarea
                        value={rules}
                        onChange={(e) => setRules(e.target.value)}
                        className={textareaClass}
                        placeholder={t('groupProfileConfig.stepOne.rulesPlaceholder')}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <aside className={cn('rounded-2xl border p-5 xl:sticky xl:top-4 xl:self-start', subtlePanelClass)}>
                <div className={cn('mb-5 h-1 w-12 rounded-full', accentBarClass)} />
                <p className={fieldEyebrowClass}>{t('groupWorkspaceProfileConfigMirror.stepOne.previewEyebrow')}</p>
                <h3 className="mt-2 text-lg font-semibold">
                  {t('groupWorkspaceProfileConfigMirror.stepOne.previewTitle')}
                </h3>
                <p className={cn('mt-2 text-sm leading-6', mutedClass)}>
                  {t('groupWorkspaceProfileConfigMirror.stepOne.previewDescription')}
                </p>

                <div className={cn('mt-5 border-t pt-4', sectionDividerClass)}>
                  <div className="space-y-4">
                    {stepOnePreviewItems.map((item) => (
                      <div key={item.id} className={cn('border-b pb-4 last:border-b-0 last:pb-0', sectionDividerClass)}>
                        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.12em]', mutedClass)}>
                          {item.label}
                        </p>
                        <p className="mt-1.5 text-sm font-medium leading-6">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className={cn('rounded-2xl border p-6', panelClass)}>
                <div className={cn('mb-6 h-1 w-16 rounded-full', accentBarClass)} />
                <div className="space-y-8">
                  <div className={cn('border-b pb-8', sectionDividerClass)}>
                    <div className="max-w-2xl space-y-1.5">
                      <p className={fieldEyebrowClass}>{t('groupProfileConfig.stepTwo.modePrompt')}</p>
                      <p className="text-base font-semibold">
                        {t('groupProfileConfig.stepTwo.learningMode')} <span className="text-rose-500">*</span>
                      </p>
                      <p className={cn('text-sm leading-6', mutedClass)}>
                        {t('groupProfileConfig.stepTwo.workflow.modeDescription')}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {LEARNING_MODES.map((item) => (
                        <ChoiceCard
                          key={item.value}
                          active={learningMode === item.value}
                          onClick={() => {
                            setLearningMode(item.value);
                            setErrors((prev) => ({ ...prev, learningMode: undefined }));
                          }}
                          icon={item.icon}
                          title={t(item.labelKey, item.labelFallback)}
                          description={item.value === 'STUDY_NEW'
                            ? t('groupProfileConfig.stepTwo.studyNewDescription')
                            : t('groupProfileConfig.stepTwo.reviewDescription')}
                          disabled={loading || submitting}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                    </div>
                    <FieldError message={errors.learningMode} />
                  </div>

                  <div className={cn('border-b pb-8', sectionDividerClass)}>
                    <div className="max-w-2xl space-y-1.5">
                      <label className="text-base font-semibold">{t('groupProfileConfig.stepTwo.knowledgeLabel')} <span className="text-rose-500">*</span></label>
                      <p className={cn('text-sm leading-6', mutedClass)}>
                        {t('groupProfileConfig.stepTwo.workflow.describeDescription')}
                      </p>
                    </div>
                    <div className="mt-4 space-y-4">
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
                      'flex items-center gap-3 rounded-lg border px-4 py-3',
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
                      'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3',
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
                          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                          isDarkMode ? 'bg-rose-500/20 hover:bg-rose-500/30' : 'bg-rose-100 hover:bg-rose-200'
                        )}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('groupProfileConfig.common.retry')}
                      </button>
                    </div>
                  ) : null}

                  {hasAnalysisSummary ? (
                    <div className={cn('rounded-lg border px-4 py-3', analysisToneClass)}>
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
                      'rounded-lg border p-4',
                      subtlePanelClass
                    )}>
                      <div className="mb-3 max-w-2xl space-y-1">
                        <p className="text-sm font-semibold">
                        {t('groupProfileConfig.stepTwo.domainSuggestions')} <span className="text-rose-500">*</span>
                        </p>
                        <p className={cn('text-xs leading-5', mutedClass)}>
                          {t('groupProfileConfig.stepTwo.workflow.domainDescription')}
                        </p>
                      </div>
                      {domainOptions.length > 0 ? (
                        <div className="space-y-3">
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
                                  'flex w-full items-start gap-3 rounded-lg border px-4 py-4 text-left transition-all duration-200',
                                  active
                                    ? isDarkMode
                                      ? 'border-cyan-300/40 bg-cyan-500/12 text-cyan-50'
                                      : 'border-cyan-300 bg-cyan-50 text-cyan-900'
                                    : isDarkMode
                                      ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                )}
                              >
                                <div className={cn(
                                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
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
                                      'shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold',
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
                          'rounded-lg border border-dashed px-4 py-3 text-sm leading-6',
                          isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-white text-slate-600'
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
                        'rounded-lg border px-4 py-3',
                        accentPanelClass
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
                  </div>

                  <div className="space-y-3">
                    <div className="max-w-xl space-y-1.5">
                      <label className="text-base font-semibold">{t('groupProfileConfig.stepTwo.groupGoal')} <span className="text-rose-500">*</span></label>
                      <p className={cn('text-sm leading-6', mutedClass)}>
                        {t('groupProfileConfig.stepTwo.groupGoalPlaceholder')}
                      </p>
                    </div>
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
                    {goalSuggestionStatus === 'loading' ? (
                      <div className={cn(
                        'rounded-lg border px-4 py-3 text-sm',
                        isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                      )}>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            {translateOrFallback(
                              'groupWorkspaceProfileConfigMirror.goalSuggestionLoading',
                              'QuizMate AI đang gợi ý mục tiêu học tập phù hợp cho nhóm.'
                            )}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {groupGoalSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em]', mutedClass)}>
                          {translateOrFallback(
                            'groupWorkspaceProfileConfigMirror.goalSuggestionLabel',
                            'QuizMate AI gợi ý mục tiêu'
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {groupGoalSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setGroupLearningGoal(suggestion);
                                setErrors((prev) => ({ ...prev, groupLearningGoal: undefined }));
                                requestAnimationFrame(() => autoResizeTextarea(groupGoalTextareaRef.current));
                              }}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                                isDarkMode
                                  ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:border-cyan-300/40 hover:bg-cyan-500/20'
                                  : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100'
                              )}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {goalSuggestionMessage ? (
                      <p className={cn(
                        'text-xs leading-5',
                        goalSuggestionStatus === 'error'
                          ? 'text-rose-500'
                          : mutedClass
                      )}>
                        {goalSuggestionMessage}
                      </p>
                    ) : null}
                    <FieldError message={errors.groupLearningGoal} />
                  </div>
                </div>
              </section>

              {step === 2 && (
                <aside className={cn('rounded-2xl border p-5 animate-in fade-in duration-500 xl:sticky xl:top-4 xl:self-start', subtlePanelClass)}>
                  <div className={cn('mb-5 h-1 w-12 rounded-full', accentBarClass)} />
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', mutedClass)}>
                    {t('groupProfileConfig.stepTwo.sidebar.eyebrow')}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {t('groupProfileConfig.stepTwo.sidebar.title')}
                  </h3>

                  <div className={cn('mt-5 border-t pt-4', sectionDividerClass)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.ready.title')}</p>
                      <span className={cn(
                        'rounded-md px-2 py-1 text-[11px] font-semibold',
                        canFinishStepTwo
                          ? isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                      )}>
                        {canFinishStepTwo
                          ? t('groupProfileConfig.stepTwo.sidebar.readyBadge')
                          : t('groupProfileConfig.stepTwo.ready.pending')}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {readinessItems.map((item) => (
                        <div
                          key={item.label}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border px-3 py-3',
                            item.ready
                              ? isDarkMode
                                ? 'border-emerald-400/15 bg-emerald-500/10'
                                : 'border-emerald-100 bg-emerald-50/80'
                              : isDarkMode
                                ? 'border-white/10 bg-slate-950/50'
                                : 'border-slate-200 bg-white'
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
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
          'relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-6 py-4 backdrop-blur-xl sm:px-7',
          isDarkMode 
            ? 'border-slate-800 bg-gradient-to-t from-[#020817] via-[#020817]/95 to-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]' 
            : 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.96))] shadow-[0_-8px_28px_-18px_rgba(15,23,42,0.08)]'
        )}>
          <div className="space-y-1">
            <div className={cn('text-xs leading-5', showProfileConfirm ? confirmMutedClass : mutedClass)}>
              {showProfileConfirm
                ? '\u00A0'
                : t('groupProfileConfig.common.stepCount', { current: displayStep, total: totalSteps })}
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
                    'rounded-xl px-5',
                    isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-900' : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white'
                  )}
                >
                  {t('groupWorkspaceProfileConfigMirror.confirm.backToEdit', 'Back to edit')}
                </Button>
                <Button
                  type="button"
                  disabled={loading || submitting}
                  onClick={handleConfirmSubmit}
                  className="rounded-xl bg-[linear-gradient(135deg,#10b981,#059669)] px-6 text-white shadow-[0_18px_36px_-24px_rgba(5,150,105,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {confirmActionLabel}
                </Button>
              </>
            ) : step > 1 && !isPostOnboardingEdit ? (
              <Button type="button" variant="ghost" disabled={loading || submitting} onClick={() => setStep(1)} className={cn('rounded-xl px-5 transition-all duration-200', isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-white/80')}>
                <ChevronLeft className="h-4 w-4" />
                {t('groupProfileConfig.common.back')}
              </Button>
            ) : null}

            {!showProfileConfirm && step === 1 ? (
              <Button type="button" disabled={loading || submitting} onClick={handleNext} className="rounded-xl bg-[linear-gradient(135deg,#06b6d4,#0f9fbd)] px-6 text-white shadow-[0_18px_36px_-24px_rgba(8,145,178,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105">
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
                className="rounded-xl bg-[linear-gradient(135deg,#10b981,#059669)] px-6 text-white shadow-[0_18px_36px_-24px_rgba(5,150,105,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting
                  ? t('groupProfileConfig.common.saving')
                  : finishLabel}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GroupWorkspaceProfileConfigMirror;
