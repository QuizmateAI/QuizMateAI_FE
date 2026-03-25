import React, { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock3, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function GroupNotificationsTab({
  isDarkMode,
  roleKey = 'MEMBER',
  notifications = [],
  onCreateNotification,
  onApproveNotification,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const isLeader = roleKey === 'LEADER';
  const isContributor = roleKey === 'CONTRIBUTOR';
  const canCreate = isLeader || isContributor;

  const roleLabelMap = {
    LEADER: t('home.group.leader'),
    CONTRIBUTOR: t('home.group.contributor'),
    MEMBER: t('home.group.member'),
  };

  const publishedNotifications = useMemo(
    () => notifications.filter((item) => item.status === 'PUBLISHED'),
    [notifications]
  );
  const pendingNotifications = useMemo(
    () => notifications.filter((item) => item.status === 'PENDING'),
    [notifications]
  );

  const visibleNotifications = roleKey === 'MEMBER' ? publishedNotifications : notifications;

  const handleCreate = () => {
    const safeTitle = title.trim();
    const safeContent = content.trim();
    if (!safeTitle || !safeContent || !canCreate) return;
    onCreateNotification?.({ title: safeTitle, content: safeContent, roleKey });
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-4">
      <section className={`rounded-xl border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('groupManage.notifications.title')}
            </h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('groupManage.notifications.subtitle')}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
            <Bell className="h-3.5 w-3.5" />
            {roleLabelMap[roleKey] || roleKey}
          </span>
        </div>
      </section>

      {canCreate ? (
        <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {t('groupManage.notifications.createTitle')}
          </h4>
          <div className="mt-3 space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('groupManage.notifications.titlePlaceholder')}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${isDarkMode ? 'border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'}`}
            />
            <textarea
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t('groupManage.notifications.contentPlaceholder')}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none ${isDarkMode ? 'border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'}`}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!title.trim() || !content.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isLeader
                ? t('groupManage.notifications.publishNow')
                : t('groupManage.notifications.submitForApproval')}
            </button>
          </div>
        </section>
      ) : null}

      {isLeader ? (
        <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {t('groupManage.notifications.pendingApprovals')}
          </h4>
          <div className="mt-3 space-y-2">
            {pendingNotifications.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('groupManage.notifications.noPending')}
              </p>
            ) : (
              pendingNotifications.map((item) => (
                <article key={item.id} className={`rounded-lg border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.title}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.content}</p>
                      <p className={`mt-2 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('groupManage.notifications.by')} {roleLabelMap[item.authorRole] || item.authorRole} • {new Date(item.createdAt).toLocaleString()}
                      </p>
                      <p className={`mt-1 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('groupManage.notifications.publisher')}: {item.publisherRole ? (roleLabelMap[item.publisherRole] || item.publisherRole) : t('groupManage.notifications.waitingForApproval')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApproveNotification?.(item.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('groupManage.notifications.approve')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
        <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {t('groupManage.notifications.publishedTitle')}
        </h4>
        <div className="mt-3 space-y-2">
          {visibleNotifications.filter((item) => item.status === 'PUBLISHED').length === 0 ? (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('groupManage.notifications.noPublished')}
            </p>
          ) : (
            visibleNotifications
              .filter((item) => item.status === 'PUBLISHED')
              .map((item) => (
                <article key={item.id} className={`rounded-lg border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.title}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.content}</p>
                      <p className={`mt-2 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      <p className={`mt-1 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('groupManage.notifications.publisher')}: {item.publisherRole ? (roleLabelMap[item.publisherRole] || item.publisherRole) : '—'}
                        {item.publishedAt ? ` • ${new Date(item.publishedAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('groupManage.notifications.publishedBadge')}
                    </span>
                  </div>
                </article>
              ))
          )}
        </div>
      </section>

      {!isLeader && isContributor && pendingNotifications.length > 0 ? (
        <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {t('groupManage.notifications.awaitingApproval')}
          </h4>
          <div className="mt-3 space-y-2">
            {pendingNotifications.map((item) => (
              <article key={item.id} className={`rounded-lg border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.title}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
                    <Clock3 className="h-3.5 w-3.5" />
                    {t('groupManage.notifications.pendingBadge')}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default GroupNotificationsTab;
