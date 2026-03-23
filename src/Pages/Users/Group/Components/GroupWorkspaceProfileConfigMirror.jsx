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

function GroupWorkspaceProfileConfigMirror({ open, onOpenChange, isDarkMode, workspaceId, onComplete }) {
  const { i18n } = useTranslation();
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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

  const summary = useMemo(() => {
    const role = ROLE_OPTIONS.find((item) => item.value === defaultRoleOnJoin);
    const mode = LEARNING_MODES.find((item) => item.value === learningMode);
    return {
      role: role ? (isVi ? role.labelVi : role.labelEn) : 'MEMBER',
      mode: mode ? (isVi ? mode.labelVi : mode.labelEn) : (isVi ? 'Chưa chọn' : 'Not set'),
    };
  }, [defaultRoleOnJoin, learningMode, isVi]);

  const selectedDomainOption = useMemo(
    () => domainOptions.find((option) => option.label === domain) || null,
    [domainOptions, domain]
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
        setRoadmapEnabled(Boolean(profile.roadmapEnabled));
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
      setIsConfirmOpen(false);
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
      nextErrors.groupName = isVi ? 'Vui lòng nhập tên nhóm.' : 'Please enter a group name.';
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors = {};
    if (!knowledge.trim()) nextErrors.knowledge = isVi ? 'Vui lòng mô tả phạm vi kiến thức chung.' : 'Please describe the shared knowledge scope.';
    if (knowledge.trim()) {
      if (analysisStatus === 'loading') {
        nextErrors.domain = isVi ? 'Quizmate AI đang phân tích lĩnh vực. Vui lòng đợi một chút.' : 'Quizmate AI is still analyzing the domain. Please wait a moment.';
      } else if (analysisStatus === 'error') {
        nextErrors.domain = isVi ? 'Quizmate AI chưa suy ra được lĩnh vực. Hãy thử phân tích lại.' : 'Quizmate AI could not infer the domain yet. Please retry the analysis.';
      } else if (analysisStatus !== 'success') {
        nextErrors.domain = isVi ? 'Vui lòng nhập knowledge để Quizmate AI suy ra lĩnh vực.' : 'Please enter the knowledge scope so Quizmate AI can infer the domain.';
      } else if (!domain.trim()) {
        nextErrors.domain = isVi ? 'Vui lòng chọn một lĩnh vực từ gợi ý của Quizmate AI.' : 'Please select one domain from the Quizmate AI suggestions.';
      }
    }
    if (!learningMode) nextErrors.learningMode = isVi ? 'Vui lòng chọn chế độ học tập.' : 'Please select a learning mode.';
    if (learningMode === 'MOCK_TEST' && !examName.trim()) {
      nextErrors.examName = isVi ? 'Vui lòng nhập tên kỳ thi.' : 'Please enter the exam name.';
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
      setStatusNotice(isVi ? 'Đã lưu thông tin nhóm.' : 'Group basics saved.');
    } catch (error) {
      setSaveError(getErrorMessage(error, isVi ? 'Không thể lưu thông tin nhóm.' : 'Unable to save the group basics.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowConfirmDialog = () => {
    if (!validateStepTwo()) return;
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!workspaceId || loading || submitting) {
      setIsConfirmOpen(false);
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
      setIsConfirmOpen(false);
      await Promise.resolve(onComplete?.());
      onOpenChange(false);
    } catch (error) {
      setSaveError(getErrorMessage(error, isVi ? 'Không thể xác nhận cấu hình nhóm.' : 'Unable to confirm the group setup.'));
      setIsConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className={cn('max-h-[92vh] max-w-6xl overflow-hidden rounded-[32px] border p-0 shadow-2xl', shellClass, fontClass)}>
        <DialogHeader className="border-b border-inherit px-8 pb-5 pt-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[24px] font-bold">
                {step === 1
                  ? (isVi ? 'Thiết lập thông tin nhóm và quyền tham gia' : 'Set the group basics and join access')
                  : (isVi ? 'Thiết lập hồ sơ học tập chung' : 'Configure the shared learning profile')}
              </DialogTitle>
              <DialogDescription className={cn('mt-2 max-w-3xl text-sm leading-6', mutedClass)}>
                {step === 1
                  ? (isVi ? 'Sức chứa tối đa được đồng bộ theo gói group leader đã mua nên chỉ hiển thị để tham chiếu.' : 'The maximum seat limit is managed by the active group plan, so it is shown here as read-only information.')
                  : (isVi ? 'Bước này chỉ thiết lập mặt bằng chung cho nhóm, không thay thế hồ sơ cá nhân của từng member.' : 'This step defines the shared baseline for the room, not each member profile.')}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-600')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[1, 2].map((item) => {
              const active = step === item;
              const unlocked = item <= maxUnlockedStep;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!unlocked || loading || submitting}
                  onClick={() => setStep(item)}
                  className={cn(
                    'rounded-[24px] border px-4 py-4 text-left transition-all duration-200',
                    active
                      ? isDarkMode ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-50'
                      : isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
                  )}
                >
                  <p className="text-sm font-semibold">{item === 1 ? 'Basic & Access' : 'Shared Learning Config'}</p>
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
                  <label className="text-sm font-semibold">{isVi ? 'Tên nhóm' : 'Group Name'} <span className="text-rose-500">*</span></label>
                  <input value={groupName} onChange={(e) => { setGroupName(e.target.value); setErrors((prev) => ({ ...prev, groupName: undefined })); }} className={inputClass} />
                  <FieldError message={errors.groupName} />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">{isVi ? 'Vai trò mặc định khi tham gia' : 'Default Role On Join'}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {ROLE_OPTIONS.map((item) => (
                      <ChoiceCard
                        key={item.value}
                        active={defaultRoleOnJoin === item.value}
                        onClick={() => setDefaultRoleOnJoin(item.value)}
                        icon={item.icon}
                        title={isVi ? item.labelVi : item.labelEn}
                        description={item.value === 'MEMBER'
                          ? (isVi ? 'Phù hợp cho phần lớn người tham gia học.' : 'Best for most learners joining the room.')
                          : (isVi ? 'Phù hợp cho người cùng đóng góp tài liệu và nội dung.' : 'Best for people who will contribute sources and content.')}
                        disabled={loading || submitting}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">{isVi ? 'Luật lệ nhóm' : 'Group Rules'}</label>
                  <textarea value={rules} onChange={(e) => setRules(e.target.value)} className={cn(inputClass, 'min-h-[140px] resize-none')} />
                </div>
              </div>
            </section>
          ) : (
            <div className={cn('grid gap-8', step === 2 && 'lg:grid-cols-[minmax(0,1.2fr)_320px]')}>
              <section className={cn('rounded-[30px] border p-5', panelClass)}>
                <div className="space-y-7">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold">{isVi ? 'Phạm vi kiến thức chung' : 'Shared Knowledge Scope'} <span className="text-rose-500">*</span></label>
                    <textarea
                      value={knowledge}
                      onChange={(e) => {
                        setKnowledge(e.target.value);
                        setDomain('');
                        setErrors((prev) => ({ ...prev, knowledge: undefined, domain: undefined }));
                      }}
                      className={cn(inputClass, 'min-h-[140px] resize-none')}
                    />
                    <p className={cn('text-xs leading-5', mutedClass)}>
                      {isVi
                        ? 'Nhập phần knowledge chung mà cả nhóm sẽ học. Quizmate AI sẽ dùng nội dung này để suy ra domain phù hợp.'
                        : 'Enter the shared knowledge your group will study. Quizmate AI will use it to infer the most relevant domain.'}
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
                        {isVi ? 'Quizmate AI đang phân tích knowledge để suy ra domain...' : 'Quizmate AI is analyzing the knowledge scope to infer the domain...'}
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
                          {isVi ? 'Quizmate AI phân tích knowledge thất bại. Hãy thử lại.' : 'Quizmate AI could not analyze the knowledge scope. Please retry.'}
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
                        {isVi ? 'Thử lại' : 'Retry'}
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
                                {isVi ? 'AI đang hiểu knowledge này là' : 'AI is interpreting this knowledge as'}
                              </p>
                              <p className="mt-1 text-sm leading-6">{knowledgeAnalysis.normalizedKnowledge}</p>
                            </div>
                          ) : null}
                          {knowledgeAnalysis?.tooBroad ? (
                            <p className={cn('mt-3 text-xs font-medium leading-5', isDarkMode ? 'text-amber-100/90' : 'text-amber-900/80')}>
                              {isVi
                                ? 'Knowledge này vẫn còn khá rộng. Nếu domain gợi ý chưa đúng, hãy nhập cụ thể hơn về kỹ năng, tài liệu, chủ đề hoặc kỳ thi.'
                                : 'This knowledge scope is still broad. If the suggested domain is not accurate, refine it with more specific skills, materials, topics, or exams.'}
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
                        {isVi ? 'Domain được Quizmate AI gợi ý' : 'Quizmate AI suggested domains'} <span className="text-rose-500">*</span>
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
                                      {active ? (isVi ? 'Đã chọn' : 'Selected') : (isVi ? 'Chọn' : 'Select')}
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
                            {isVi ? 'Quizmate AI chưa có đủ dữ liệu để gợi ý domain.' : 'Quizmate AI does not have enough signal to suggest a domain yet.'}
                          </p>
                          <p className={cn('mt-1 text-sm', mutedClass)}>
                            {isVi
                              ? 'Hãy nhập cụ thể hơn về phạm vi kiến thức, tài liệu, kỹ năng hoặc kỳ thi mà nhóm muốn học chung.'
                              : 'Try describing the knowledge scope with more specific materials, skills, topics, or exams.'}
                          </p>
                        </div>
                      )}
                      <FieldError message={errors.domain} />
                    </div>
                  ) : null}

                  {domain ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold">{isVi ? 'Domain đã chọn' : 'Selected Domain'} <span className="text-rose-500">*</span></label>
                      <div className={cn(
                        'rounded-[22px] border px-4 py-3',
                        isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'
                      )}>
                        <p className="text-sm font-semibold">{domain}</p>
                        <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                          {selectedDomainOption?.reason
                            || (isVi ? 'Domain này sẽ được lưu làm mặt bằng học tập chung của nhóm.' : 'This domain will be stored as the shared learning baseline for the group.')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {analysisStatus !== 'success' ? <FieldError message={errors.domain} /> : null}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">{isVi ? 'Chế độ học tập' : 'Learning Mode'} <span className="text-rose-500">*</span></p>
                    <div className="grid gap-3">
                      {LEARNING_MODES.map((item) => (
                        <ChoiceCard
                          key={item.value}
                          active={learningMode === item.value}
                          onClick={() => { setLearningMode(item.value); setErrors((prev) => ({ ...prev, learningMode: undefined, examName: undefined })); if (item.value !== 'MOCK_TEST') setExamName(''); }}
                          icon={item.icon}
                          title={isVi ? item.labelVi : item.labelEn}
                          description={item.value === 'STUDY_NEW'
                            ? (isVi ? 'Dùng nhóm để học dần theo flow chung.' : 'Use the room to learn progressively with a shared flow.')
                            : item.value === 'REVIEW'
                              ? (isVi ? 'Dùng nhóm để ôn tập và vá lỗ hổng.' : 'Use the room for review sessions and gap filling.')
                              : (isVi ? 'Dùng nhóm để luyện đề và đo tiến độ bằng bài test.' : 'Use the room for mock tests and exam-style progress checks.')}
                          disabled={loading || submitting}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                    </div>
                    <FieldError message={errors.learningMode} />
                  </div>

                  {learningMode === 'MOCK_TEST' ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold">{isVi ? 'Tên kỳ thi' : 'Exam Name'} <span className="text-rose-500">*</span></label>
                      <input value={examName} onChange={(e) => { setExamName(e.target.value); setErrors((prev) => ({ ...prev, examName: undefined })); }} className={inputClass} />
                      <FieldError message={errors.examName} />
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <label className="text-sm font-semibold">{isVi ? 'Mục tiêu nhóm' : 'Group Goal'}</label>
                    <textarea value={groupLearningGoal} onChange={(e) => setGroupLearningGoal(e.target.value)} className={cn(inputClass, 'min-h-[120px] resize-none')} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={cn('rounded-[22px] border p-4', panelClass)}>
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={roadmapEnabled} onChange={(e) => setRoadmapEnabled(e.target.checked)} />
                        <span>
                          <span className="block text-sm font-semibold">{isVi ? 'Bật roadmap chung' : 'Enable Shared Roadmap'}</span>
                          <span className={cn('block text-xs leading-5', mutedClass)}>{isVi ? 'Tạo nhịp học chung rõ ràng hơn.' : 'Create a clearer shared progression.'}</span>
                        </span>
                      </span>
                    </label>
                    <label className={cn('rounded-[22px] border p-4', panelClass)}>
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={preLearningRequired} onChange={(e) => setPreLearningRequired(e.target.checked)} />
                        <span>
                          <span className="block text-sm font-semibold">{isVi ? 'Yêu cầu đánh giá đầu vào' : 'Require Entry Assessment'}</span>
                          <span className={cn('block text-xs leading-5', mutedClass)}>{isVi ? 'Áp cho thành viên mới vào nhóm.' : 'Apply this to new members joining the room.'}</span>
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {step === 2 && (
                <aside className={cn('rounded-[30px] border p-5 animate-in fade-in duration-500', panelClass)}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', mutedClass)}>{isVi ? 'Tóm tắt nhanh' : 'Quick Snapshot'}</p>
                  
                  <div className="mt-4 space-y-3">
                    <SummaryItem 
                      label={isVi ? 'Vai trò mặc định' : 'Default Role'} 
                      value={summary.role} 
                      isDarkMode={isDarkMode} 
                    />
                    
                    <SummaryItem 
                      label={isVi ? 'Chế độ học tập' : 'Learning Mode'} 
                      value={summary.mode} 
                      isDarkMode={isDarkMode} 
                    />
                    
                    {domain && (
                      <SummaryItem 
                        label={isVi ? 'Lĩnh vực' : 'Domain'} 
                        value={domain} 
                        isDarkMode={isDarkMode} 
                      />
                    )}
                  </div>

                  <p className={cn('mt-4 text-xs leading-5', mutedClass)}>
                    {analysisStatus === 'loading'
                      ? (isVi ? 'Quizmate AI đang suy ra domain từ knowledge.' : 'Quizmate AI is inferring the domain from the knowledge scope.')
                      : analysisStatus === 'error'
                        ? (isVi ? 'Cần phân tích lại knowledge để có domain đáng tin cậy.' : 'Retry the knowledge analysis to get a reliable domain.')
                        : domain
                          ? (isVi ? 'Domain này sẽ được dùng làm baseline chung cho group workspace.' : 'This domain will be used as the shared baseline for the group workspace.')
                          : (isVi ? 'Nhập knowledge để Quizmate AI gợi ý domain phù hợp.' : 'Enter the knowledge scope so Quizmate AI can suggest a suitable domain.')}
                  </p>
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
            <div className={cn('text-xs leading-5', mutedClass)}>{isVi ? `Bước ${step} trên 2` : `Step ${step} of 2`}</div>
            {saveError ? <p className="text-xs font-medium text-rose-500">{saveError}</p> : null}
            {!saveError && statusNotice ? <p className="text-xs font-medium text-emerald-500">{statusNotice}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {step > 1 ? (
              <Button type="button" variant="ghost" disabled={loading || submitting} onClick={() => setStep(1)} className={cn('rounded-[24px] px-5 transition-all duration-200', isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100')}>
                <ChevronLeft className="h-4 w-4" />
                {isVi ? 'Quay lại' : 'Back'}
              </Button>
            ) : null}

            {step === 1 ? (
              <Button type="button" disabled={loading || submitting} onClick={handleNext} className="rounded-[24px] bg-cyan-600 px-6 text-white transition-all duration-200 hover:bg-cyan-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Tiếp tục' : 'Continue')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" disabled={loading || submitting} onClick={handleShowConfirmDialog} className="rounded-[24px] bg-emerald-600 px-6 text-white transition-all duration-200 hover:bg-emerald-700">
                {isVi ? 'Xác nhận' : 'Confirm'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className={cn('max-w-3xl rounded-[32px] border p-0 shadow-2xl', isDarkMode ? 'border-slate-700 bg-[#020817] text-white' : 'border-slate-200 bg-white text-slate-900', fontClass)}>
          <DialogHeader className="px-6 pb-3 pt-6 text-left">
            <DialogTitle className="text-xl font-bold">{isVi ? 'Xác nhận áp dụng cấu hình nhóm' : 'Confirm this group setup'}</DialogTitle>
            <DialogDescription className={cn('pt-2 text-sm leading-6', mutedClass)}>
              {isVi ? 'Sau khi xác nhận, cấu hình này sẽ trở thành mặt bằng chung cho cả nhóm.' : 'Once confirmed, this setup becomes the shared baseline for the room.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 pb-6">
            {/* Basic Info Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className={cn('h-4 w-4', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')} />
                <h3 className="text-sm font-bold uppercase tracking-wider">{isVi ? 'Thông tin cơ bản' : 'Basic Info'}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryItem label={isVi ? 'Tên nhóm' : 'Group Name'} value={groupName || '-'} isDarkMode={isDarkMode} />
                <SummaryItem label={isVi ? 'Vai trò mặc định khi tham gia' : 'Default Role On Join'} value={summary.role} isDarkMode={isDarkMode} />
                <SummaryItem label={isVi ? 'Sức chứa tối đa' : 'Seat Limit'} value={formatSeatLimit(maxMemberOverride, isVi)} isDarkMode={isDarkMode} />
                <SummaryItem label={isVi ? 'Luật lệ nhóm' : 'Group Rules'} value={rules || (isVi ? 'Chưa thiết lập' : 'Not configured')} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Learning Config Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className={cn('h-4 w-4', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')} />
                <h3 className="text-sm font-bold uppercase tracking-wider">{isVi ? 'Cấu hình học tập' : 'Learning Config'}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryItem label={isVi ? 'Lĩnh vực' : 'Domain'} value={domain || '-'} isDarkMode={isDarkMode} />
                <SummaryItem label={isVi ? 'Chế độ học tập' : 'Learning Mode'} value={summary.mode} isDarkMode={isDarkMode} />
                {learningMode === 'MOCK_TEST' && (
                  <SummaryItem label={isVi ? 'Tên kỳ thi' : 'Exam Name'} value={examName || (isVi ? 'Không áp dụng' : 'Not applicable')} isDarkMode={isDarkMode} />
                )}
                <SummaryItem label={isVi ? 'Roadmap chung' : 'Shared Roadmap'} value={roadmapEnabled ? (isVi ? 'Đang bật' : 'Enabled') : (isVi ? 'Đang tắt' : 'Disabled')} isDarkMode={isDarkMode} />
                <SummaryItem label={isVi ? 'Đánh giá đầu vào' : 'Entry Assessment'} value={preLearningRequired ? (isVi ? 'Yêu cầu' : 'Required') : (isVi ? 'Không yêu cầu' : 'Not required')} isDarkMode={isDarkMode} />
              </div>
              <div className="md:col-span-2">
                <SummaryItem label={isVi ? 'Phạm vi kiến thức' : 'Knowledge Scope'} value={knowledge || '-'} isDarkMode={isDarkMode} />
              </div>
              {groupLearningGoal && (
                <div className="md:col-span-2">
                  <SummaryItem label={isVi ? 'Mục tiêu nhóm' : 'Group Goal'} value={groupLearningGoal} isDarkMode={isDarkMode} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className={cn('flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end', isDarkMode ? 'border-slate-700 bg-[#020817]' : 'border-slate-200 bg-white')}>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={submitting} className={cn('rounded-[24px] px-5 transition-all duration-200', isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700')}>
              {isVi ? 'Hủy' : 'Cancel'}
            </Button>
            <Button type="button" onClick={handleConfirmSubmit} disabled={loading || submitting} className="rounded-[24px] bg-emerald-600 px-5 text-white transition-all duration-200 hover:bg-emerald-700">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Áp dụng cấu hình này' : 'Apply this setup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default GroupWorkspaceProfileConfigMirror;
