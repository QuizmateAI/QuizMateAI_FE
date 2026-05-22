import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  listWorkspaceReviewBans,
  unbanWorkspaceReviewer,
} from '@/api/WorkspaceReviewBanAPI';

function WorkspaceReviewBanPanel({ workspaceId, isDarkMode = false }) {
  const { t } = useTranslation();
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unbanLoadingUserId, setUnbanLoadingUserId] = useState(null);

  const fetchBans = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const res = await listWorkspaceReviewBans(workspaceId);
      const data = res.data?.data ?? res.data ?? [];
      setBans(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || t('common.loadFailed', 'Không tải được dữ liệu.'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    fetchBans();
  }, [fetchBans]);

  const handleUnban = useCallback(async (userId) => {
    if (!userId || !workspaceId) return;
    setUnbanLoadingUserId(userId);
    try {
      await unbanWorkspaceReviewer(workspaceId, userId);
      setBans((prev) => prev.filter((b) => Number(b?.userId) !== Number(userId)));
    } catch (err) {
      setError(err?.response?.data?.message || t('workspace.settings.reviewBans.unbanFailed', 'Không gỡ block được.'));
    } finally {
      setUnbanLoadingUserId(null);
    }
  }, [workspaceId, t]);

  const cardClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04] text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const subtleText = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <section className={`rounded-2xl border px-5 py-4 ${cardClass}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`} />
          <div>
            <h3 className="text-base font-semibold">
              {t('workspace.settings.reviewBans.tabTitle', 'Reviewer bị block trong workspace')}
            </h3>
            <p className={`mt-0.5 text-xs ${subtleText}`}>
              {t(
                'workspace.settings.reviewBans.description',
                'Member bị block sẽ không xuất hiện trong picker mời reviewer cho các quiz challenge mới.',
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchBans}
          disabled={loading}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
            isDarkMode ? 'bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          {t('common.refresh', 'Làm mới')}
        </button>
      </header>

      {error ? (
        <p className="mt-3 text-xs text-rose-500">{error}</p>
      ) : null}

      {!loading && bans.length === 0 && !error ? (
        <p className={`mt-3 rounded-lg border border-dashed px-3 py-3 text-xs ${
          isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          {t('workspace.settings.reviewBans.empty', 'Chưa có reviewer nào bị block.')}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {bans.map((ban) => (
          <li
            key={ban.banId}
            className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs ${
              isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-sm font-semibold">{ban.userName || `User #${ban.userId}`}</span>
                {ban.userEmail ? (
                  <span className={subtleText}>· {ban.userEmail}</span>
                ) : null}
              </div>
              <p className={`mt-1 ${subtleText}`}>
                {t('workspace.settings.reviewBans.bannedAt', 'Bị block')}: {ban.bannedAt ? new Date(ban.bannedAt).toLocaleString() : '-'}
                {ban.bannedByName ? ` · ${t('workspace.settings.reviewBans.by', 'Bởi')} ${ban.bannedByName}` : ''}
              </p>
              {ban.banNote ? (
                <p className={`mt-1 italic ${subtleText}`}>"{ban.banNote}"</p>
              ) : null}
              {ban.relatedQuizId ? (
                <p className={`mt-0.5 font-mono text-[10px] ${subtleText}`}>
                  {t('workspace.settings.reviewBans.relatedQuiz', 'Quiz liên quan')}: #{ban.relatedQuizId}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => handleUnban(ban.userId)}
              disabled={unbanLoadingUserId === ban.userId}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode ? 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30' : 'bg-white text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {unbanLoadingUserId === ban.userId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              {t('workspace.settings.reviewBans.unban', 'Gỡ block')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WorkspaceReviewBanPanel;
