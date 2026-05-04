import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Trophy, UserCircle2 } from 'lucide-react';
import GroupProfileSettingsDialog from './GroupProfileSettingsDialog';
import GroupRankingPointsDialog from './GroupRankingPointsDialog';

/**
 * Settings page action row — replaces the old "tràn ra" inline profile panel
 * with discrete buttons that open scoped dialogs. Owns its own dialog state
 * so the host page stays focused on top-level layout.
 */
function GroupSettingsActionsCard({
  group,
  isLeader,
  isDarkMode,
  onOpenProfileConfig,
  profileEditLocked = false,
  variant = 'full',
}) {
  const { t } = useTranslation();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [rankingPointsDialogOpen, setRankingPointsDialogOpen] = useState(false);

  const isCompact = variant === 'compact';
  const sectionPadding = isCompact ? 'p-4' : 'p-5';
  const shellClass = isDarkMode
    ? 'border-white/10 bg-[#08131a]/92 text-white'
    : 'border-white/80 bg-white/82 text-slate-900';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  const actions = [
    {
      key: 'profile',
      icon: UserCircle2,
      title: t('groupManage.settings.actions.profile.title', 'Hồ sơ nhóm'),
      subtitle: t('groupManage.settings.actions.profile.subtitle', 'Tên, mục tiêu, knowledge và rules.'),
      onClick: () => setProfileDialogOpen(true),
    },
    {
      key: 'rankingPoints',
      icon: Trophy,
      title: t('groupManage.settings.actions.rankingPoints.title', 'Cấu hình điểm RP'),
      subtitle: t(
        'groupManage.settings.actions.rankingPoints.subtitle',
        'Tinh chỉnh base + bonus theo từng loại quiz.',
      ),
      onClick: () => setRankingPointsDialogOpen(true),
    },
  ];

  return (
    <>
      <section className={`rounded-2xl border ${sectionPadding} ${shellClass}`}>
        <div className="flex items-start gap-2">
          <Settings className={`mt-0.5 h-4 w-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          <div>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('groupManage.settings.actions.title', 'Quản lý cấu hình')}
            </h3>
            <p className={`mt-1 text-xs ${subtleTextClass}`}>
              {t(
                'groupManage.settings.actions.subtitle',
                'Mở từng nhóm cấu hình ở dạng dialog để giữ trang gọn.',
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
                    isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {action.title}
                  </span>
                  <span className={`mt-0.5 block text-xs ${subtleTextClass}`}>{action.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <GroupProfileSettingsDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        group={group}
        isLeader={isLeader}
        isDarkMode={isDarkMode}
        onOpenProfileConfig={onOpenProfileConfig}
        profileEditLocked={profileEditLocked}
      />
      <GroupRankingPointsDialog
        open={rankingPointsDialogOpen}
        onOpenChange={setRankingPointsDialogOpen}
        workspaceId={group?.workspaceId}
        isLeader={isLeader}
        isDarkMode={isDarkMode}
      />
    </>
  );
}

export default GroupSettingsActionsCard;
