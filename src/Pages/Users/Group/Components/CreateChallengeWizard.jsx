import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, ChevronRight, ChevronLeft, Check, Clock, Users,
  FileText, Loader2, Search, Calendar, Shield,
} from 'lucide-react';
import { getQuizzesByScope } from '../../../../api/QuizAPI';
import { getGroupMembers } from '../../../../api/GroupAPI';
import { createChallenge } from '../../../../api/ChallengeAPI';

const STEPS = [
  { key: 'quiz', label: 'Chọn Quiz' },
  { key: 'schedule', label: 'Lịch trình' },
  { key: 'registration', label: 'Đăng ký' },
  { key: 'review', label: 'Xác nhận' },
];

function StepIndicator({ currentStep, isDarkMode }) {
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
            {step.label}
          </span>
          {idx < STEPS.length - 1 && (
            <div className={`h-px w-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function toLocalDatetimeString(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(dt) {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function CreateChallengeWizard({ workspaceId, isDarkMode, onClose, onCreated }) {
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
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return toLocalDatetimeString(now);
  });
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 3, 0, 0, 0);
    return toLocalDatetimeString(now);
  });

  // Step 3: Registration
  const [registrationMode, setRegistrationMode] = useState('PUBLIC_GROUP');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Fetch quizzes
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ['workspace-quizzes', workspaceId],
    queryFn: async () => {
      const res = await getQuizzesByScope('WORKSPACE', workspaceId);
      return res.data || [];
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

  const filteredQuizzes = quizzes.filter((q) =>
    !quizSearch || q.title?.toLowerCase().includes(quizSearch.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    !memberSearch || (m.fullName || m.username || m.email || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const selectedQuiz = quizzes.find((q) => q.quizId === selectedQuizId);

  const toggleMember = useCallback((userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const canNext = () => {
    switch (step) {
      case 0: return sourceMode === 'NEW_CHALLENGE_QUIZ' || selectedQuizId != null;
      case 1: return title.trim() && startTime && endTime && new Date(endTime) > new Date(startTime);
      case 2: return registrationMode === 'PUBLIC_GROUP' || selectedUserIds.length > 0;
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
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        sourceQuizId: sourceMode === 'EXISTING_SNAPSHOT' ? selectedQuizId : null,
        invitedUserIds: registrationMode === 'INVITE_ONLY' ? selectedUserIds : [],
      });
      onCreated();
    } catch (err) {
      setError(err?.message || 'Không thể tạo challenge');
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
                { key: 'EXISTING_SNAPSHOT', label: 'Quiz có sẵn', desc: 'Tạo bản sao từ quiz đã có' },
                { key: 'NEW_CHALLENGE_QUIZ', label: 'Quiz mới', desc: 'Tạo quiz mới cho challenge' },
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
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder="Tìm quiz..."
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>

                <div className="min-h-[18rem] max-h-80 overflow-y-auto rounded-xl border p-1" style={{ borderColor: isDarkMode ? '#334155' : '#e5e7eb' }}>
                  {quizzesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    </div>
                  ) : filteredQuizzes.length === 0 ? (
                    <div className={`py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Không tìm thấy quiz nào
                    </div>
                  ) : (
                    filteredQuizzes.map((q) => (
                      <button
                        key={q.quizId}
                        onClick={() => setSelectedQuizId(q.quizId)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                          selectedQuizId === q.quizId
                            ? (isDarkMode ? 'bg-orange-500/15 text-orange-300' : 'bg-orange-50 text-orange-700')
                            : (isDarkMode ? 'text-white hover:bg-slate-700/50' : 'text-slate-900 hover:bg-gray-50')
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 opacity-50" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{q.title}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                              {q.totalQuestions || 0} câu · {q.totalTime || 0} phút
                            </div>
                          </div>
                          {selectedQuizId === q.quizId && <Check className="h-4 w-4 text-orange-500" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {sourceMode === 'NEW_CHALLENGE_QUIZ' && (
              <div className={`rounded-xl border p-6 text-center ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
                <FileText className={`mx-auto mb-2 h-8 w-8 ${isDarkMode ? 'text-orange-300/60' : 'text-orange-400'}`} />
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Quiz mới sẽ được tạo tự động khi bạn hoàn tất wizard.
                </p>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  Bạn có thể chỉnh sửa nội dung quiz sau khi tạo challenge.
                </p>
              </div>
            )}
          </div>
        );

      case 1: // Schedule
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Tên Challenge *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Kiểm tra kiến thức Chương 3"
                className={inputCls}
                maxLength={200}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn về challenge..."
                rows={3}
                className={inputCls}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={`mb-1.5 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <Calendar className="mr-1 inline h-3.5 w-3.5" />
                  Bắt đầu *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  Kết thúc *
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {startTime && endTime && new Date(endTime) <= new Date(startTime) && (
              <p className="text-xs text-red-500">Thời gian kết thúc phải sau thời gian bắt đầu</p>
            )}
          </div>
        );

      case 2: // Registration
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { key: 'PUBLIC_GROUP', label: 'Công khai', desc: 'Mọi thành viên nhóm có thể đăng ký', icon: Users },
                { key: 'INVITE_ONLY', label: 'Mời riêng', desc: 'Chỉ người được mời mới tham gia', icon: Shield },
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
                    placeholder="Tìm thành viên..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>

                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Đã chọn {selectedUserIds.length} thành viên
                </div>

                <div className="min-h-[16rem] max-h-72 overflow-y-auto rounded-xl border p-1" style={{ borderColor: isDarkMode ? '#334155' : '#e5e7eb' }}>
                  {filteredMembers.length === 0 ? (
                    <div className={`py-6 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Không tìm thấy thành viên
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const userId = m.userId || m.groupMemberId;
                      const isSelected = selectedUserIds.includes(userId);
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
                              {m.fullName || m.username}
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
                Thông tin Challenge
              </h4>
              <dl className={`space-y-1.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <div className="flex items-start justify-between gap-4">
                  <dt className="opacity-60">Tên:</dt>
                  <dd className="max-w-[70%] text-right font-medium break-words">{title}</dd>
                </div>
                {description && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="opacity-60">Mô tả:</dt>
                    <dd className="max-w-[70%] text-right break-words">{description}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <dt className="opacity-60">Bắt đầu:</dt>
                  <dd className="text-right">{formatDateTime(startTime)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="opacity-60">Kết thúc:</dt>
                  <dd className="text-right">{formatDateTime(endTime)}</dd>
                </div>
              </dl>
            </div>

            <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`mb-2 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Quiz
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {sourceMode === 'EXISTING_SNAPSHOT'
                  ? (selectedQuiz ? `${selectedQuiz.title} (bản sao)` : 'Chưa chọn')
                  : 'Quiz mới (sẽ tạo khi hoàn tất)'}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`mb-2 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Đăng ký
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {registrationMode === 'PUBLIC_GROUP'
                  ? 'Công khai - mọi thành viên đều có thể đăng ký'
                  : `Mời riêng - ${selectedUserIds.length} thành viên được mời`}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4 lg:p-6">
      <div className={`${cardCls} flex max-h-[92vh] w-full max-w-3xl flex-col shadow-2xl sm:min-h-[36rem] lg:max-w-4xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-5 py-4 sm:px-6 lg:px-8 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <StepIndicator currentStep={step} isDarkMode={isDarkMode} />
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
            {step === 0 ? 'Huỷ' : 'Quay lại'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              Tiếp theo
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canNext()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Tạo Challenge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
