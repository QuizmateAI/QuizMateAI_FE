import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Loader2,
  RefreshCw,
  ScrollText,
  ShieldCheck,
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
import { analyzeKnowledge } from '@/api/StudyProfileAPI';
import {
  confirmGroupWorkspaceProfile,
  getGroupWorkspaceProfile,
  normalizeGroupWorkspaceProfile,
  saveGroupBasicStep,
  saveGroupConfigStep,
} from '@/api/WorkspaceAPI';

const ROLE_OPTIONS = [
  { value: 'MEMBER', labelVi: 'Thành viên', labelEn: 'Member', icon: Users },
  { value: 'CONTRIBUTOR', labelVi: 'Cộng tác viên', labelEn: 'Contributor', icon: ShieldCheck },
];

const LEARNING_MODES = [
  { value: 'STUDY_NEW', labelVi: 'Học kiến thức mới', labelEn: 'Study New', icon: BrainCircuit },
  { value: 'REVIEW', labelVi: 'Ôn tập theo nhóm', labelEn: 'Group Review', icon: Sparkles },
  { value: 'MOCK_TEST', labelVi: 'Thi thử cùng nhóm', labelEn: 'Group Mock Test', icon: ScrollText },
];

const GROUP_NAME_PLACEHOLDERS = new Set(['group name null']);
const ANALYSIS_DEBOUNCE_MS = 800;

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function getErrorMessage(error, fallback) {
  return error?.message || error?.response?.data?.message || fallback;
}

function formatSeatLimit(value, isVi) {
  const safeValue = Number(value);
  if (Number.isFinite(safeValue) && safeValue > 0) {
    return isVi ? `${safeValue} thành viên` : `${safeValue} members`;
  }
  return isVi ? 'Theo gói group hiện tại' : 'Managed by the active group plan';
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

function buildFallbackDomainReason(label, knowledge, index, isVi) {
  const normalizedLabel = normalizeReasonText(label);

  if (normalizedLabel.includes('dich')) {
    return isVi
      ? 'Phù hợp với hướng học dịch, chuyển nghĩa và đối chiếu ngữ cảnh mà nhóm mô tả.'
      : 'Matches the translation-focused direction your group described.';
  }

  if (normalizedLabel.includes('bang')) {
    return isVi
      ? 'Phù hợp nếu nhóm đang học theo hướng so sánh hoặc bắc cầu giữa hai hệ kiến thức.'
      : 'Fits a comparison or bridge-style learning scope across two knowledge systems.';
  }

  if (isEnglishVietnamesePairSignal(knowledge)) {
    return isVi
      ? 'Phù hợp với phạm vi học chung xoay quanh cặp ngôn ngữ Anh - Việt.'
      : 'Fits a shared learning scope centered on the English-Vietnamese language pair.';
  }

  const viReasons = [
    'Đây là hướng khớp gần nhất với phạm vi kiến thức nhóm đang chia sẻ.',
    'Đây là mảng liên quan mà AI nhận thấy từ nội dung kiến thức bạn nhập.',
    'Đây là ngữ cảnh mở rộng có thể phù hợp với mục tiêu học chung của nhóm.',
  ];
  const enReasons = [
    'This is the closest match to the knowledge scope your group described.',
    'This is a related area the AI inferred from the knowledge you entered.',
    'This is a broader context that may still fit your group learning goal.',
  ];

  return (isVi ? viReasons : enReasons)[index] || (isVi ? viReasons[0] : enReasons[0]);
}

function buildDomainOptionsFromApi({ domainSuggestions, domainSuggestionDetails, knowledge, isVi }) {
  const normalizedDetails = (Array.isArray(domainSuggestionDetails) ? domainSuggestionDetails : [])
    .map(normalizeDomainSuggestionDetail)
    .filter(Boolean);

  if (normalizedDetails.length > 0) {
    return normalizedDetails.slice(0, 5).map((item, index) => ({
      label: item.label,
      reason: item.reason || buildFallbackDomainReason(item.label, knowledge, index, isVi),
    }));
  }

  if (!Array.isArray(domainSuggestions) || domainSuggestions.length === 0) {
    return [];
  }

  return domainSuggestions.slice(0, 5).map((label, index) => ({
    label,
    reason: buildFallbackDomainReason(label, knowledge, index, isVi),
  }));
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-rose-500">{message}</p>;
}

function ChoiceCard({ active, onClick, icon: Icon, title, description, disabled, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-[22px] border p-4 text-left transition-all duration-200 hover:scale-[1.02]',
        active
          ? isDarkMode
            ? 'border-cyan-400/40 bg-cyan-500/10'
            : 'border-cyan-300 bg-cyan-50'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.03] hover:border-white/20'
            : 'border-slate-200 bg-white hover:border-slate-300',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl border',
          active
            ? isDarkMode ? 'border-cyan-300/35 bg-cyan-400/20 text-cyan-100' : 'border-cyan-200 bg-white text-cyan-700'
            : isDarkMode ? 'border-white/10 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600'
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

function SummaryItem({ label, value, isDarkMode }) {
  return (
    <div className={cn(
      'rounded-[18px] border border-l-4 px-3 py-3',
      isDarkMode ? 'border-white/10 border-l-cyan-400 bg-white/[0.04]' : 'border-slate-200 border-l-cyan-300 bg-slate-50/90'
    )}>
      <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
        {label}
      </p>
      <p className={cn('mt-1.5 text-sm font-medium leading-6', isDarkMode ? 'text-slate-100' : 'text-slate-800')}>
        {value}
      </p>
    </div>
  );
}

function WorkflowStepCard({ stepLabel, title, description, active, complete, icon: Icon, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 transition-all duration-200',
        complete
          ? isDarkMode
            ? 'border-emerald-400/25 bg-emerald-500/10'
            : 'border-emerald-200 bg-emerald-50/90'
          : active
            ? isDarkMode
              ? 'border-cyan-400/30 bg-cyan-500/10'
              : 'border-cyan-200 bg-cyan-50/90'
            : isDarkMode
              ? 'border-white/10 bg-white/[0.03]'
              : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
          complete
            ? isDarkMode ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100' : 'border-emerald-200 bg-white text-emerald-700'
            : active
              ? isDarkMode ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100' : 'border-cyan-200 bg-white text-cyan-700'
              : isDarkMode ? 'border-white/10 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600'
        )}>
          {complete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-75">{stepLabel}</p>
          <p className="mt-1 text-sm font-semibold">{title}</p>
          <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
            {description}
          </p>
        </div>
      </div>
    </div>
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
            : 'border-slate-200 bg-white',
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
}) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const inputClass = cn(
    'w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-400/20',
    isDarkMode
      ? 'border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 focus:border-cyan-400'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
  );

  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [errors, setErrors] = useState({});

  const [groupName, setGroupName] = useState('');
  const [rules, setRules] = useState('');
  const [defaultRoleOnJoin, setDefaultRoleOnJoin] = useState('MEMBER');
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
  const isStudyNewMode = learningMode === 'STUDY_NEW';

  const summary = useMemo(() => {
    const role = ROLE_OPTIONS.find((item) => item.value === defaultRoleOnJoin);
    const mode = LEARNING_MODES.find((item) => item.value === learningMode);
    return {
      role: role ? (isVi ? role.labelVi : role.labelEn) : (isVi ? ROLE_OPTIONS[0].labelVi : ROLE_OPTIONS[0].labelEn),
      mode: mode ? (isVi ? mode.labelVi : mode.labelEn) : (isVi ? 'Chưa chọn' : 'Not set'),
    };
  }, [defaultRoleOnJoin, learningMode, isVi]);

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

  const workflowSteps = useMemo(() => ([
    {
      id: 1,
      icon: BrainCircuit,
      title: t('groupProfileConfig.stepTwo.workflow.describeTitle'),
      description: t('groupProfileConfig.stepTwo.workflow.describeDescription'),
    },
    {
      id: 2,
      icon: Compass,
      title: t('groupProfileConfig.stepTwo.workflow.domainTitle'),
      description: t('groupProfileConfig.stepTwo.workflow.domainDescription'),
    },
    {
      id: 3,
      icon: Sparkles,
      title: t('groupProfileConfig.stepTwo.workflow.modeTitle'),
      description: t('groupProfileConfig.stepTwo.workflow.modeDescription'),
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
  ]), [domain, knowledge, learningMode, summary.mode, t]);

  const selectedDomainOption = useMemo(
    () => domainOptions.find((option) => option.label === domain) || null,
    [domainOptions, domain]
  );
  const canFinishStepTwo = Boolean(
    knowledge.trim()
    && domain.trim()
    && learningMode
    && (learningMode !== 'MOCK_TEST' || examName.trim())
  );

  const hasAnalysisSummary = analysisStatus === 'success' && Boolean(
    knowledgeAnalysis?.message
    || knowledgeAnalysis?.advice
    || knowledgeAnalysis?.normalizedKnowledge
  );

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
        setDefaultRoleOnJoin(profile.defaultRoleOnJoin || 'MEMBER');
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
          isVi,
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
  }, [open, knowledge, analysisRetryTick, isVi]);

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
    if (learningMode === 'MOCK_TEST' && !examName.trim()) {
      nextErrors.examName = t('groupProfileConfig.validation.examName');
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!workspaceId || loading || submitting || !validateStepOne()) return;
    setSubmitting(true);
    setSaveError('');
    setStatusNotice('');
    try {
      await saveGroupBasicStep(workspaceId, { groupName, rules, defaultRoleOnJoin });
      setStep(2);
      setMaxUnlockedStep(2);
      setStatusNotice(t('groupProfileConfig.messages.basicsSaved'));
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
      setStatusNotice(t('groupProfileConfig.messages.completed'));
      if (onComplete) {
        await Promise.resolve(onComplete());
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      setSaveError(getErrorMessage(error, t('groupProfileConfig.messages.confirmSaveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (!canClose && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  const shellClass = isDarkMode ? 'border-slate-800 bg-gradient-to-br from-[#020817] via-[#020817] to-slate-900/50 text-white' : 'border-slate-200 bg-[#f8fbff] text-slate-900';
  const panelClass = isDarkMode ? 'border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02]' : 'border-slate-200 bg-white';
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
        className={cn('max-h-[92vh] max-w-6xl overflow-hidden rounded-[32px] border p-0 shadow-2xl', shellClass, fontClass)}
      >
        <DialogHeader className="border-b border-inherit px-8 pb-5 pt-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
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
            </div>
            {canClose ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-600')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
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
                      ? isDarkMode ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-50'
                      : isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
                    !unlocked && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                      active
                        ? isDarkMode ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100' : 'border-cyan-200 bg-white text-cyan-700'
                        : isDarkMode ? 'border-white/10 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600'
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
        </DialogHeader>

        <div className="custom-scrollbar-group-setup max-h-[64vh] overflow-y-auto px-8 py-5 scroll-smooth">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : step === 1 ? (
            <section className={cn('rounded-[30px] border p-5', panelClass)}>
              <div className="space-y-7">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">{t('groupProfileConfig.stepOne.groupName')} <span className="text-rose-500">*</span></label>
                  <input value={groupName} onChange={(e) => { setGroupName(e.target.value); setErrors((prev) => ({ ...prev, groupName: undefined })); }} className={inputClass} />
                  <FieldError message={errors.groupName} />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t('groupProfileConfig.stepOne.defaultRole')}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {ROLE_OPTIONS.map((item) => (
                      <ChoiceCard
                        key={item.value}
                        active={defaultRoleOnJoin === item.value}
                        onClick={() => setDefaultRoleOnJoin(item.value)}
                        icon={item.icon}
                        title={isVi ? item.labelVi : item.labelEn}
                        description={item.value === 'MEMBER'
                          ? t('groupProfileConfig.stepOne.memberDescription')
                          : t('groupProfileConfig.stepOne.contributorDescription')}
                        disabled={loading || submitting}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">{t('groupProfileConfig.stepOne.rules')}</label>
                  <textarea value={rules} onChange={(e) => setRules(e.target.value)} className={cn(inputClass, 'min-h-[140px] resize-none')} />
                </div>
              </div>
            </section>
          ) : (
            <div className={cn('grid gap-8', step === 2 && 'lg:grid-cols-[minmax(0,1.2fr)_320px]')}>
              <section className={cn('rounded-[30px] border p-5', panelClass)}>
                <div className="space-y-7">
                  <div className={cn(
                    'rounded-[26px] border p-5',
                    isDarkMode ? 'border-cyan-400/20 bg-cyan-500/8' : 'border-cyan-100 bg-[linear-gradient(135deg,#f0fbff,#f8fdff)]'
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', mutedClass)}>
                            {t('groupProfileConfig.stepTwo.workflow.eyebrow')}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold">{t('groupProfileConfig.stepTwo.workflow.title')}</h3>
                          <p className={cn('mt-2 text-sm leading-6', mutedClass)}>
                            {t('groupProfileConfig.stepTwo.workflow.description')}
                          </p>
                        </div>
                        {isStudyNewMode ? (
                          <span className={cn(
                            'rounded-full px-3 py-1.5 text-xs font-semibold',
                            isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                          )}>
                            {t('groupProfileConfig.stepTwo.roadmap.studyNewBadge')}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {workflowSteps.map((item, index) => (
                          <WorkflowStepCard
                            key={item.id}
                            stepLabel={`${t('groupProfileConfig.common.step')} ${index + 1}`}
                            title={item.title}
                            description={item.description}
                            active={(index === 0 && Boolean(knowledge.trim())) || (index === 1 && Boolean(domain.trim())) || (index === 2 && Boolean(learningMode))}
                            complete={(index === 0 && Boolean(knowledge.trim())) || (index === 1 && Boolean(domain.trim())) || (index === 2 && Boolean(learningMode))}
                            icon={item.icon}
                            isDarkMode={isDarkMode}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.knowledgeLabel')} <span className="text-rose-500">*</span></label>
                    <textarea
                      value={knowledge}
                      onChange={(e) => {
                        setKnowledge(e.target.value);
                        setDomain('');
                        setErrors((prev) => ({ ...prev, knowledge: undefined, domain: undefined }));
                      }}
                      className={cn(inputClass, 'min-h-[168px] resize-none')}
                      placeholder={t('groupProfileConfig.stepTwo.knowledgePlaceholder')}
                    />
                    <p className={cn('text-xs leading-5', mutedClass)}>
                      {t('groupProfileConfig.stepTwo.knowledgeHint')}
                    </p>
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
                      isDarkMode ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'
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
                                      : 'border-slate-200 bg-white hover:border-slate-300'
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

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.learningMode')} <span className="text-rose-500">*</span></p>
                      <span className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', mutedClass)}>
                        {t('groupProfileConfig.stepTwo.modePrompt')}
                      </span>
                    </div>
                    <div className="grid gap-3">
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
                          title={isVi ? item.labelVi : item.labelEn}
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

                  {learningMode === 'MOCK_TEST' ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.examName')} <span className="text-rose-500">*</span></label>
                      <input value={examName} onChange={(e) => { setExamName(e.target.value); setErrors((prev) => ({ ...prev, examName: undefined })); }} className={inputClass} placeholder={t('groupProfileConfig.stepTwo.examNamePlaceholder')} />
                      <FieldError message={errors.examName} />
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <label className="text-sm font-semibold">{t('groupProfileConfig.stepTwo.groupGoal')}</label>
                    <textarea value={groupLearningGoal} onChange={(e) => setGroupLearningGoal(e.target.value)} className={cn(inputClass, 'min-h-[120px] resize-none')} placeholder={t('groupProfileConfig.stepTwo.groupGoalPlaceholder')} />
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
                <aside className={cn('rounded-[30px] border p-5 animate-in fade-in duration-500', panelClass)}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', mutedClass)}>
                    {t('groupProfileConfig.stepTwo.sidebar.eyebrow')}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold">
                    {t('groupProfileConfig.stepTwo.sidebar.title')}
                  </h3>

                  <div className={cn(
                    'mt-5 rounded-[24px] border p-4',
                    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
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
                    <div className="mt-4 space-y-3">
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
                                : 'border-slate-200 bg-white'
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

                  <div className="mt-5 space-y-3">
                    <SummaryItem
                      label={t('groupProfileConfig.stepTwo.sidebar.role')}
                      value={summary.role}
                      isDarkMode={isDarkMode}
                    />
                    <SummaryItem
                      label={t('groupProfileConfig.stepTwo.sidebar.mode')}
                      value={summary.mode}
                      isDarkMode={isDarkMode}
                    />
                    <SummaryItem
                      label={t('groupProfileConfig.stepTwo.sidebar.domain')}
                      value={domain || t('groupProfileConfig.stepTwo.ready.pending')}
                      isDarkMode={isDarkMode}
                    />
                    <SummaryItem
                      label={t('groupProfileConfig.stepTwo.sidebar.roadmap')}
                      value={roadmapEnabled
                        ? t('groupProfileConfig.common.enabled')
                        : t('groupProfileConfig.common.disabled')}
                      isDarkMode={isDarkMode}
                    />
                  </div>

                  <div className={cn(
                    'mt-5 rounded-[24px] border p-4',
                    isDarkMode ? 'border-cyan-400/15 bg-cyan-500/10' : 'border-cyan-100 bg-cyan-50/80'
                  )}>
                    <p className="text-sm font-semibold">
                      {selectedDomainOption?.label || t('groupProfileConfig.stepTwo.sidebar.domainPlaceholder')}
                    </p>
                    <p className={cn('mt-2 text-xs leading-5', mutedClass)}>
                      {analysisStatus === 'loading'
                        ? t('groupProfileConfig.stepTwo.sidebar.loading')
                        : analysisStatus === 'error'
                          ? t('groupProfileConfig.stepTwo.sidebar.error')
                          : domain
                            ? t('groupProfileConfig.stepTwo.sidebar.ready')
                            : t('groupProfileConfig.stepTwo.sidebar.default')}
                    </p>
                    {selectedDomainOption?.reason ? (
                      <p className={cn('mt-3 text-sm leading-6', mutedClass)}>
                        {selectedDomainOption.reason}
                      </p>
                    ) : null}
                  </div>

                  <div className={cn(
                    'mt-5 rounded-[24px] border p-4',
                    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
                  )}>
                    <p className="text-sm font-semibold">
                      {t('groupProfileConfig.stepTwo.sidebar.afterSaveTitle')}
                    </p>
                    <div className="mt-3 space-y-2">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-start gap-3">
                          <div className={cn(
                            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                            isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'
                          )}>
                            {item}
                          </div>
                          <p className={cn('text-sm leading-6', mutedClass)}>
                            {t(`groupProfileConfig.stepTwo.sidebar.afterSaveItem${item === 1 ? 'One' : item === 2 ? 'Two' : 'Three'}`)}
                          </p>
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
          'sticky bottom-0 left-0 right-0 flex flex-wrap items-center justify-between gap-3 border-t px-8 py-4 backdrop-blur-xl',
          isDarkMode 
            ? 'border-slate-800 bg-gradient-to-t from-[#020817] via-[#020817]/95 to-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]' 
            : 'border-slate-200 bg-gradient-to-t from-[#f8fbff] via-[#f8fbff]/95 to-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'
        )}>
          <div className="space-y-1">
            <div className={cn('text-xs leading-5', mutedClass)}>
              {t('groupProfileConfig.common.stepCount', { current: step, total: 2 })}
            </div>
            {saveError ? <p className="text-xs font-medium text-rose-500">{saveError}</p> : null}
            {!saveError && statusNotice ? <p className="text-xs font-medium text-emerald-500">{statusNotice}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {step > 1 ? (
              <Button type="button" variant="ghost" disabled={loading || submitting} onClick={() => setStep(1)} className={cn('rounded-[24px] px-5 transition-all duration-200', isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100')}>
                <ChevronLeft className="h-4 w-4" />
                {t('groupProfileConfig.common.back')}
              </Button>
            ) : null}

            {step === 1 ? (
              <Button type="button" disabled={loading || submitting} onClick={handleNext} className="rounded-[24px] bg-cyan-600 px-6 text-white transition-all duration-200 hover:bg-cyan-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? t('groupProfileConfig.common.saving') : t('groupProfileConfig.common.continue')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" disabled={loading || submitting} onClick={handleConfirmSubmit} className="rounded-[24px] bg-emerald-600 px-6 text-white transition-all duration-200 hover:bg-emerald-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting
                  ? t('groupProfileConfig.common.saving')
                  : canFinishStepTwo
                    ? t('groupProfileConfig.common.finish')
                    : t('groupProfileConfig.common.finishIncomplete')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GroupWorkspaceProfileConfigMirror;
