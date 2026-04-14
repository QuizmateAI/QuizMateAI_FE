import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  X, ChevronRight, ChevronLeft, Check, Clock, Users,
  FileText, Loader2, Search, Shield,
  ListChecks,
} from 'lucide-react';
import { getQuizzesByScope } from '../../../../api/QuizAPI';
import { getGroupMembers } from '../../../../api/GroupAPI';
import { createChallenge } from '../../../../api/ChallengeAPI';
import { getDurationInMinutes } from '@/lib/quizDurationDisplay';
import {
  combineToBackendPayload,
  defaultEndPartsFromStart,
  defaultStartParts,
  getScheduleValidationIssues,
} from '@/lib/challengeSchedule';
import UserDisplayName from '@/Components/users/UserDisplayName';
import ChallengeScheduleFields from './ChallengeScheduleFields';

function getQuizSummaryLine(q) {
  const questionCount = Number(q?.totalQuestion ?? q?.totalQuestions ?? q?.questionCount ?? 0) || 0;
  const durationMinutes = getDurationInMinutes(q) || Number(q?.totalTime ?? 0) || 0;
  return { questionCount, durationMinutes };
}

/** Challenge chỉ dùng quiz chung — loại quiz giao riêng (SELECTED_MEMBERS / có assignee). */
function isQuizEligibleForChallengeSource(quiz) {
  const mode = String(quiz?.groupAudienceMode ?? '').toUpperCase();
  if (mode === 'SELECTED_MEMBERS') return false;
  const assignees = quiz?.assignedUserIds;
  if (Array.isArray(assignees) && assignees.length > 0) return false;
  return true;
}

const STEPS = [
  { key: 'quiz', labelKey: 'createChallengeWizard.steps.quiz', labelFallback: 'Select quiz' },
  { key: 'schedule', labelKey: 'createChallengeWizard.steps.schedule', labelFallback: 'Schedule' },
  { key: 'registration', labelKey: 'createChallengeWizard.steps.registration', labelFallback: 'Registration' },
  { key: 'review', labelKey: 'createChallengeWizard.steps.review', labelFallback: 'Review' },
];

function StepIndicator({ currentStep, isDarkMode, t }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            idx < currentStep
              ? 'bg-green-500 text-white'
              : idx === currentStep
                ? 'bg-orange-500 text-white'
                : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500')
          }`}>
            {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
          </div>
          <span className={`hidden text-sm font-medium sm:inline ${
            idx === currentStep
              ? (isDarkMode ? 'text-white' : 'text-slate-900')
              : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
          }`}>
            {t(step.labelKey, step.labelFallback)}
          </span>
          {idx < STEPS.length - 1 && (
            <div className={`h-px w-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function formatDateTime(dt, language) {
  if (!dt) return '-';
  const d = new Date(dt);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export default function CreateChallengeWizard({ workspaceId, isDarkMode, onClose, onCreated, currentUserId }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Quiz selection
  const [sourceMode, setSourceMode] = useState('EXISTING_SNAPSHOT');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizSearch, setQuizSearch] = useState('');

  // Step 2: Schedule
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => defaultStartParts().dateStr);
  const [startTime, setStartTime] = useState(() => defaultStartParts().timeStr);
  const [endDate, setEndDate] = useState(() => {
    const s = defaultStartParts();
    return defaultEndPartsFromStart(s.dateStr, s.timeStr).dateStr;
  });
  const [endTime, setEndTime] = useState(() => {
    const s = defaultStartParts();
    return defaultEndPartsFromStart(s.dateStr, s.timeStr).timeStr;
  });

  // Step 3: Registration
  const [registrationMode, setRegistrationMode] = useState('PUBLIC_GROUP');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  /** Leader tham gia thi — một suất, sau ACTIVE không xem trước đề */
  const [leaderParticipates, setLeaderParticipates] = useState(false);

  // Fetch quizzes
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ['workspace-quizzes', workspaceId],
    queryFn: async () => {
      const res = await getQuizzesByScope('WORKSPACE', workspaceId);
      const list = res.data || [];
      // Challenge wizard chỉ áp dụng cho quiz thường, không pick mock test.
      return list.filter((q) => String(q?.quizIntent || '').toUpperCase() !== 'MOCK_TEST');
    },
    enabled: Boolean(workspaceId),
  });

  // Fetch members (for invite-only)
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const res = await getGroupMembers(workspaceId, 0, 200);
      return res.data?.content || res.data || [];
    },
    enabled: Boolean(workspaceId) && registrationMode === 'INVITE_ONLY',
  });
  const members = membersData || [];

  const membersForInvite = useMemo(() => {
    const uid = Number(currentUserId);
    if (!Number.isInteger(uid) || uid <= 0) return members;
    return members.filter((m) => Number(m.userId ?? m.groupMemberId) !== uid);
  }, [members, currentUserId]);

  /** Không gửi / không đếm leader trong danh sách mời (đồng bộ với UI đã ẩn bản thân). */
  const sanitizedSelectedUserIds = useMemo(() => {
    const uid = Number(currentUserId);
    if (!Number.isInteger(uid) || uid <= 0) return selectedUserIds;
    return selectedUserIds.filter((id) => Number(id) !== uid);
  }, [selectedUserIds, currentUserId]);

  const challengeEligibleQuizzes = useMemo(
    () => quizzes.filter((q) => isQuizEligibleForChallengeSource(q)),
    [quizzes],
  );

  /** Quiz đã chọn có thể không còn hợp lệ khi danh sách quiz đổi — dùng giá trị đã kiểm tra, không cần effect. */
  const validSelectedQuizId = useMemo(() => {
    if (selectedQuizId == null) return null;
    return challengeEligibleQuizzes.some((q) => q.quizId === selectedQuizId)
      ? selectedQuizId
      : null;
  }, [challengeEligibleQuizzes, selectedQuizId]);

  const filteredQuizzes = challengeEligibleQuizzes.filter((q) =>
    !quizSearch || q.title?.toLowerCase().includes(quizSearch.toLowerCase())
  );

  const filteredMembers = membersForInvite.filter((m) =>
    !memberSearch || (m.fullName || m.username || m.email || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const selectedQuiz = challengeEligibleQuizzes.find((q) => q.quizId === validSelectedQuizId);

  const toggleMember = useCallback((userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const canNext = () => {
    switch (step) {
      case 0: return sourceMode === 'NEW_CHALLENGE_QUIZ' || validSelectedQuizId != null;
      case 1: {
        if (!title.trim() || !startDate || !startTime || !endDate || !endTime) return false;
        return getScheduleValidationIssues(startDate, startTime, endDate, endTime).length === 0;
      }
      case 2: return registrationMode === 'PUBLIC_GROUP' || sanitizedSelectedUserIds.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await createChallenge(workspaceId, {
        title: title.trim(),
        description: description.trim() || null,
        registrationMode,
        sourceMode,
        startTime: combineToBackendPayload(startDate, startTime),
        endTime: combineToBackendPayload(endDate, endTime),
        sourceQuizId: sourceMode === 'EXISTING_SNAPSHOT' ? validSelectedQuizId : null,
        invitedUserIds: registrationMode === 'INVITE_ONLY' ? sanitizedSelectedUserIds : [],
        leaderParticipates,
      });
      onCreated();
    } catch (err) {
      setError(err?.message || t('createChallengeWizard.errors.createFailed', 'Unable to create challenge'));
      setSubmitting(false);
    }
  };

  const cardCls = `rounded-2xl border ${isDarkMode ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-white'}`;
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
    isDarkMode
      ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:border-orange-500'
      : 'border-gray-300 bg-white text-slate-900 placeholder-gray-400 focus:border-orange-500'
  }`;

  const renderStep = () => {
    switch (step) {
      case 0: // Quiz Source
        return (
          <div className="flex flex-col gap-4">
            {/* Source mode selection */}
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { key: 'EXISTING_SNAPSHOT', label: t('createChallengeWizard.sourceMode.existingLabel', 'Existing quiz'), desc: t('createChallengeWizard.sourceMode.existingDesc', 'Create a snapshot from an existing quiz') },
                { key: 'NEW_CHALLENGE_QUIZ', label: t('createChallengeWizard.sourceMode.newLabel', 'New quiz'), desc: t('createChallengeWizard.sourceMode.newDesc', 'Compose the quiz later in the challenge detail') },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSourceMode(opt.key); setSelectedQuizId(null); }}
                  className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                    sourceMode === opt.key
                      ? (isDarkMode ? 'border-orange-500 bg-orange-500/10' : 'border-orange-500 bg-orange-50')
                      : (isDarkMode ? 'border-slate-700 bg-slate-800/60 hover:border-slate-600' : 'border-gray-200 bg-white hover:border-gray-300')
                  }`}
                >
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{opt.label}</div>
                  <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {sourceMode === 'EXISTING_SNAPSHOT' && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className={`h-4 w-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('createChallengeWizard.quizList.sectionTitle', 'Shared workspace quizzes')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                      title={t('createChallengeWizard.quizList.countTitle', 'Only shared (non-assigned) quizzes can be used for a challenge')}
                    >
                      {quizzesLoading ? '…' : challengeEligibleQuizzes.length}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder={t('createChallengeWizard.quizList.searchPlaceholder', 'Search by quiz name...')}
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    className={`${inputCls} pl-10 shadow-sm`}
                    aria-label={t('createChallengeWizard.quizList.searchAriaLabel', 'Search quizzes')}
                  />
                </div>

                <div
                  className={`min-h-[16rem] max-h-[22rem] overflow-y-auto rounded-2xl border p-2 sm:p-3 ${
                    isDarkMode ? 'border-slate-600/80 bg-slate-900/40' : 'border-slate-200/90 bg-slate-50/80'
                  }`}
                >
                  {quizzesLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-14">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('createChallengeWizard.quizList.loading', 'Loading list…')}</span>
                    </div>
                  ) : filteredQuizzes.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center gap-2 px-4 py-14 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <FileText className={`h-10 w-10 opacity-40 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <p className="text-sm font-medium">
                        {quizzes.length === 0
                          ? t('createChallengeWizard.quizList.emptyNoQuizzes', 'No quizzes in this workspace yet')
                          : challengeEligibleQuizzes.length === 0
                            ? t('createChallengeWizard.quizList.emptyNoEligible', 'No shared quizzes available for a challenge')
                            : t('createChallengeWizard.quizList.emptyNoMatches', 'No matches for your search')}
                      </p>
                      <p className="max-w-xs text-xs opacity-90">
                        {quizzes.length === 0
                          ? t('createChallengeWizard.quizList.emptyNoQuizzesHint', 'Create a quiz in the workspace first, or choose "New quiz" above.')
                          : challengeEligibleQuizzes.length === 0
                            ? t('createChallengeWizard.quizList.emptyNoEligibleHint', 'Quizzes assigned to specific members cannot be used. Publish the quiz as shared for the whole group or remove the per-member assignment first.')
                            : t('createChallengeWizard.quizList.emptyNoMatchesHint', 'Try a different keyword or clear the search box.')}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {filteredQuizzes.map((q) => {
                        const { questionCount, durationMinutes } = getQuizSummaryLine(q);
                        const isSelected = validSelectedQuizId === q.quizId;
                        return (
                          <li key={q.quizId}>
                            <button
                              type="button"
                              onClick={() => setSelectedQuizId(q.quizId)}
                              className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all sm:px-4 sm:py-3.5 ${
                                isSelected
                                  ? isDarkMode
                                    ? 'border-orange-500/60 bg-orange-500/15 ring-2 ring-orange-500/40'
                                    : 'border-orange-300 bg-white shadow-md shadow-orange-500/10 ring-2 ring-orange-400/30'
                                  : isDarkMode
                                    ? 'border-slate-600/60 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                                    : 'border-transparent bg-white hover:border-slate-200 hover:shadow-sm'
                              }`}
                            >
                              <div
                                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                                  isSelected
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : isDarkMode
                                      ? 'bg-slate-700 text-slate-300'
                                      : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                <FileText className="h-5 w-5 opacity-90" />
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <div
                                  className={`truncate text-sm font-semibold sm:text-base ${
                                    isSelected
                                      ? isDarkMode
                                        ? 'text-orange-100'
                                        : 'text-orange-800'
                                      : isDarkMode
                                        ? 'text-white'
                                        : 'text-slate-900'
                                  }`}
                                >
                                  {q.title}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                                      isDarkMode ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    <ListChecks className="h-3 w-3 opacity-70" />
                                    {t('createChallengeWizard.quizList.questionCount', '{{count}} questions', { count: questionCount })}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                                      isDarkMode ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    <Clock className="h-3 w-3 opacity-70" />
                                    {t('createChallengeWizard.quizList.durationMinutes', '{{minutes}} min', { minutes: durationMinutes })}
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : isDarkMode
                                      ? 'border-slate-500 bg-transparent group-hover:border-slate-400'
                                      : 'border-slate-200 bg-white group-hover:border-slate-300'
                                }`}
                                aria-hidden
                              >
                                {isSelected ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}

            {sourceMode === 'NEW_CHALLENGE_QUIZ' && (
              <div className={`rounded-xl border p-6 text-center ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
                <FileText className={`mx-auto mb-2 h-8 w-8 ${isDarkMode ? 'text-orange-300/60' : 'text-orange-400'}`} />
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  {t('createChallengeWizard.newQuizNotice.leadBefore', 'After creating the challenge, open its detail page and click ')}
                  <strong className="font-medium">{t('createChallengeWizard.newQuizNotice.composeLabel', 'Compose quiz')}</strong>
                  {t('createChallengeWizard.newQuizNotice.leadAfter', ' to launch the quiz editor (Quiz tab).')}
                </p>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('createChallengeWizard.newQuizNotice.hint', 'The start date must be at least 3 days from now; after creation, open the challenge detail to compose the quiz before the challenge starts.')}
                </p>
              </div>
            )}
          </div>
        );

      case 1: // Schedule
        { const schedIssues = getScheduleValidationIssues(startDate, startTime, endDate, endTime);
        const bumpEndToWindow = (dStr, tStr) => {
          const next = defaultEndPartsFromStart(dStr, tStr);
          setEndDate(next.dateStr);
          setEndTime(next.timeStr);
        };
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('createChallengeWizard.schedule.titleLabel', 'Challenge name *')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('createChallengeWizard.schedule.titlePlaceholder', 'e.g. Chapter 3 knowledge check')}
                className={inputCls}
                maxLength={200}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('createChallengeWizard.schedule.descriptionLabel', 'Description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('createChallengeWizard.schedule.descriptionPlaceholder', 'A short description of the challenge...')}
                rows={3}
                className={inputCls}
                style={{ resize: 'none' }}
              />
            </div>

            <ChallengeScheduleFields
              isDarkMode={isDarkMode}
              startDate={startDate}
              startTime={startTime}
              endDate={endDate}
              endTime={endTime}
              onStartDateChange={(v) => {
                setStartDate(v);
                bumpEndToWindow(v, startTime);
              }}
              onStartTimeChange={(v) => {
                setStartTime(v);
                bumpEndToWindow(startDate, v);
              }}
              onEndDateChange={setEndDate}
              onEndTimeChange={setEndTime}
              validationIssues={schedIssues}
            />

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                isDarkMode ? 'border-slate-600 bg-slate-800/40' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={leaderParticipates}
                onChange={(e) => setLeaderParticipates(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
              />
              <span>
                <span className={`block text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  {t('createChallengeWizard.schedule.leaderParticipatesLabel', 'I will take the test with everyone')}
                </span>
                <span className={`mt-1 block text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  {t('createChallengeWizard.schedule.leaderParticipatesDesc', 'You get a slot in the participant list. After the quiz is published, you cannot preview questions (for fairness to members). While the quiz is still a draft (DRAFT), you can still author and test it.')}
                </span>
              </span>
            </label>
          </div>
        ); }

      case 2: // Registration
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { key: 'PUBLIC_GROUP', label: t('createChallengeWizard.registration.publicLabel', 'Public'), desc: t('createChallengeWizard.registration.publicDesc', 'Any group member can register'), icon: Users },
                { key: 'INVITE_ONLY', label: t('createChallengeWizard.registration.inviteLabel', 'Invite only'), desc: t('createChallengeWizard.registration.inviteDesc', 'Only invited members can join'), icon: Shield },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setRegistrationMode(opt.key)}
                    className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                      registrationMode === opt.key
                        ? (isDarkMode ? 'border-orange-500 bg-orange-500/10' : 'border-orange-500 bg-orange-50')
                        : (isDarkMode ? 'border-slate-700 bg-slate-800/60 hover:border-slate-600' : 'border-gray-200 bg-white hover:border-gray-300')
                    }`}
                  >
                    <Icon className={`mb-1 h-4 w-4 ${registrationMode === opt.key ? 'text-orange-500' : (isDarkMode ? 'text-slate-400' : 'text-gray-400')}`} />
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{opt.label}</div>
                    <div className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {registrationMode === 'INVITE_ONLY' && (
              <>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder={t('createChallengeWizard.registration.memberSearchPlaceholder', 'Search members...')}
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>

                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('createChallengeWizard.registration.selectedCount', 'Selected {{count}} members', { count: sanitizedSelectedUserIds.length })}
                </div>

                <div className="min-h-[16rem] max-h-72 overflow-y-auto rounded-xl border p-1" style={{ borderColor: isDarkMode ? '#334155' : '#e5e7eb' }}>
                  {filteredMembers.length === 0 ? (
                    <div className={`py-6 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {t('createChallengeWizard.registration.noMembers', 'No members found')}
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const userId = m.userId || m.groupMemberId;
                      const isSelected = sanitizedSelectedUserIds.includes(userId);
                      return (
                        <button
                          key={userId}
                          onClick={() => toggleMember(userId)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? (isDarkMode ? 'bg-orange-500/15' : 'bg-orange-50')
                              : (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50')
                          }`}
                        >
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {(m.fullName || m.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              <UserDisplayName user={m} fallback={t('createChallengeWizard.registration.memberFallback', 'Member')} isDarkMode={isDarkMode} />
                            </div>
                            {m.email && (
                              <div className={`truncate text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{m.email}</div>
                            )}
                          </div>
                          <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : (isDarkMode ? 'border-slate-600' : 'border-gray-300')
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 3: // Review
        return (
          <div className="grid gap-3 xl:grid-cols-2">
            <div className={`rounded-xl border p-4 xl:col-span-2 ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`mb-2 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('createChallengeWizard.review.challengeInfo', 'Challenge info')}
              </h4>
              <dl className={`space-y-1.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <div className="flex items-start justify-between gap-4">
                  <dt className="opacity-60">{t('createChallengeWizard.review.fieldName', 'Name:')}</dt>
                  <dd className="max-w-[70%] text-right font-medium break-words">{title}</dd>
                </div>
                {description && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="opacity-60">{t('createChallengeWizard.review.fieldDescription', 'Description:')}</dt>
                    <dd className="max-w-[70%] text-right break-words">{description}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <dt className="opacity-60">{t('createChallengeWizard.review.fieldStart', 'Start:')}</dt>
                  <dd className="text-right">{formatDateTime(combineToBackendPayload(startDate, startTime), i18n.language)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="opacity-60">{t('createChallengeWizard.review.fieldEnd', 'End:')}</dt>
                  <dd className="text-right">{formatDateTime(combineToBackendPayload(endDate, endTime), i18n.language)}</dd>
                </div>
              </dl>
            </div>

            <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`mb-2 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('createChallengeWizard.review.quizHeading', 'Quiz')}
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {sourceMode === 'EXISTING_SNAPSHOT'
                  ? (selectedQuiz
                      ? t('createChallengeWizard.review.quizExistingSelected', '{{title}} (shared quiz snapshot)', { title: selectedQuiz.title })
                      : t('createChallengeWizard.review.quizNotChosen', 'Not selected'))
                  : t('createChallengeWizard.review.quizNewNotice', 'New quiz (author the questions in the challenge detail after creation)')}
              </p>
              {sourceMode === 'EXISTING_SNAPSHOT' && selectedQuiz ? (
                <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('createChallengeWizard.review.snapshotNote', 'The snapshot is not assigned per member; all challenge participants share this same content.')}
                </p>
              ) : null}
            </div>

            <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`mb-2 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('createChallengeWizard.review.registrationHeading', 'Registration')}
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {registrationMode === 'PUBLIC_GROUP'
                  ? t('createChallengeWizard.review.registrationPublic', 'Public — any member can register')
                  : t('createChallengeWizard.review.registrationInvite', 'Invite only — {{count}} members invited', { count: sanitizedSelectedUserIds.length })}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4 lg:p-6">
      <div className={`${cardCls} flex max-h-[92vh] w-full max-w-3xl flex-col shadow-2xl sm:min-h-[36rem] lg:max-w-4xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-5 py-4 sm:px-6 lg:px-8 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <StepIndicator currentStep={step} isDarkMode={isDarkMode} t={t} />
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between border-t px-5 py-4 sm:px-6 lg:px-8 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? t('createChallengeWizard.footer.cancel', 'Cancel') : t('createChallengeWizard.footer.back', 'Back')}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {t('createChallengeWizard.footer.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canNext()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('createChallengeWizard.footer.submit', 'Create challenge')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
