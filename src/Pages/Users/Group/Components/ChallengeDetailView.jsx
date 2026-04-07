import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Users, Calendar, Shield, Swords, Play,
  UserPlus, XCircle, CheckCircle, Loader2
} from 'lucide-react';
import {
  getChallengeDetail, registerForChallenge, acceptChallengeInvitation,
  startChallengeAttempt, cancelChallenge
} from '../../../../api/ChallengeAPI';
import ChallengeLeaderboard from './ChallengeLeaderboard';

function formatDateTime(dt) {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChallengeDetailView({ workspaceId, eventId, isDarkMode, isLeader, onBack }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['challenge-detail', workspaceId, eventId],
    queryFn: async () => {
      const res = await getChallengeDetail(workspaceId, eventId);
      return res.data;
    },
    enabled: Boolean(workspaceId && eventId),
    refetchInterval: 10000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['challenge-detail', workspaceId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['challenges', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard', workspaceId, eventId] });
  }, [queryClient, workspaceId, eventId]);

  const handleAction = useCallback(async (action, label) => {
    setActionLoading(label);
    setError('');
    try {
      await action();
      invalidate();
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  }, [invalidate]);

  const handleRegister = () => handleAction(
    () => registerForChallenge(workspaceId, eventId), 'register');

  const handleAcceptInvite = () => handleAction(
    () => acceptChallengeInvitation(workspaceId, eventId), 'accept');

  const handleCancel = () => {
    if (!window.confirm('Bạn có chắc muốn huỷ challenge này?')) return;
    handleAction(() => cancelChallenge(workspaceId, eventId), 'cancel');
  };

  const handleStartAttempt = useCallback(async () => {
    setActionLoading('start');
    setError('');
    try {
      const res = await startChallengeAttempt(workspaceId, eventId);
      const attempt = res.data;
      navigate(`/quiz/exam/${attempt.quizId}`, {
        state: {
          autoStart: true,
          challengeContext: { workspaceId, eventId, participantId: attempt.participantId },
          challengeAttempt: {
            attemptId: attempt.attemptId,
            startedAt: attempt.startedAt,
            timeoutAt: attempt.timeoutAt,
          },
          sourceWorkspaceId: workspaceId,
          sourceView: 'challenge',
        },
      });
    } catch (err) {
      setError(err?.message || 'Không thể bắt đầu làm bài');
      setActionLoading(null);
    }
  }, [workspaceId, eventId, navigate]);

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const canRegister = detail.status === 'SCHEDULED'
    && !detail.myParticipantStatus
    && (detail.registrationMode === 'PUBLIC_GROUP' || detail.myInvitationStatus === 'PENDING');

  const canAcceptInvite = detail.status === 'SCHEDULED'
    && detail.myInvitationStatus === 'PENDING'
    && !detail.myParticipantStatus;

  const canStart = detail.status === 'LIVE'
    && detail.myParticipantStatus
    && detail.myParticipantStatus !== 'FINISHED';

  const canCancel = isLeader && detail.status === 'SCHEDULED';

  const cardCls = `rounded-2xl border p-6 ${
    isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
  }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className={`rounded-xl p-2 transition-colors ${
            isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
          }`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Swords className={`h-6 w-6 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {detail.title}
        </h2>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Info card */}
      <div className={cardCls}>
        {detail.description && (
          <p className={`mb-4 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
            {detail.description}
          </p>
        )}

        <div className={`grid grid-cols-2 gap-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div>
              <div className="text-xs opacity-60">Bắt đầu</div>
              <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatDateTime(detail.startTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div>
              <div className="text-xs opacity-60">Kết thúc</div>
              <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatDateTime(detail.endTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{detail.participantCount} người tham gia</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>{detail.registrationMode === 'INVITE_ONLY' ? 'Mời riêng' : 'Công khai'}</span>
          </div>
        </div>

        {detail.snapshotQuizTitle && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${
            isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Quiz</div>
            <div className={`mt-0.5 font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {detail.snapshotQuizTitle}
            </div>
            {detail.snapshotQuizDuration > 0 && (
              <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {detail.snapshotQuizDuration} phút · {detail.snapshotQuizTotalQuestion || 0} câu hỏi
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {canRegister && !canAcceptInvite && (
            <button
              onClick={handleRegister}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'register' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Đăng ký
            </button>
          )}

          {canAcceptInvite && (
            <button
              onClick={handleAcceptInvite}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Chấp nhận lời mời
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartAttempt}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {detail.myParticipantStatus === 'PLAYING' ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={!!actionLoading}
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Huỷ challenge
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className={`mb-3 flex items-center gap-2 text-base font-semibold ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Bảng xếp hạng
        </h3>
        <ChallengeLeaderboard workspaceId={workspaceId} eventId={eventId} isDarkMode={isDarkMode} />
      </div>

      {/* Participants */}
      {detail.participants && detail.participants.length > 0 && (
        <div className={cardCls}>
          <h3 className={`mb-3 text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Người tham gia ({detail.participants.length})
          </h3>
          <div className="flex flex-col gap-2">
            {detail.participants.map((p) => (
              <div
                key={p.userId}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  isDarkMode ? 'bg-slate-700/30' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {p.avatar ? (
                    <img src={p.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {(p.fullName || p.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {p.fullName || p.username}
                  </span>
                </div>
                <span className={`text-xs ${
                  p.status === 'FINISHED' ? 'text-green-500' : p.status === 'PLAYING' ? 'text-blue-500' : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
                }`}>
                  {p.status === 'FINISHED' ? 'Hoàn thành' : p.status === 'PLAYING' ? 'Đang làm' : 'Chờ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
