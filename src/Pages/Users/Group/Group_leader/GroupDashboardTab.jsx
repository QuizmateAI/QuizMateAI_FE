import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Shield,
  Upload,
  TrendingUp,
  BookOpen,
  Clock,
  BarChart3,
  Activity,
} from 'lucide-react';

// Tab Dashboard: Tổng quan tình trạng & tiến độ nhóm
function GroupDashboardTab({ isDarkMode, group, members = [], membersLoading }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  // Thống kê thành viên
  const totalMembers = members.length;
  const leaders = members.filter((m) => m.role === 'LEADER').length;
  const contributors = members.filter((m) => m.role === 'CONTRIBUTOR').length;
  const regularMembers = members.filter((m) => m.role === 'MEMBER').length;
  const canUploadCount = members.filter((m) => m.canUpload).length;

  // Card thống kê nhanh
  const statsCards = [
    {
      label: t('groupManage.dashboard.totalMembers'),
      value: totalMembers,
      icon: Users,
      color: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      bgColor: isDarkMode ? 'bg-blue-950/40' : 'bg-blue-50',
    },
    {
      label: t('groupManage.dashboard.contributors'),
      value: contributors,
      icon: Shield,
      color: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      bgColor: isDarkMode ? 'bg-purple-950/40' : 'bg-purple-50',
    },
    {
      label: t('groupManage.dashboard.canUpload'),
      value: canUploadCount,
      icon: Upload,
      color: isDarkMode ? 'text-green-400' : 'text-green-600',
      bgColor: isDarkMode ? 'bg-green-950/40' : 'bg-green-50',
    },
    {
      label: t('groupManage.dashboard.progress'),
      value: '—',
      icon: TrendingUp,
      color: isDarkMode ? 'text-amber-400' : 'text-amber-600',
      bgColor: isDarkMode ? 'bg-amber-950/40' : 'bg-amber-50',
    },
  ];

  // Phân bổ vai trò (progress bar)
  const roleDistribution = [
    { role: 'LEADER', count: leaders, color: 'bg-amber-500', label: t('home.group.leader') },
    { role: 'CONTRIBUTOR', count: contributors, color: 'bg-purple-500', label: t('home.group.contributor') },
    { role: 'MEMBER', count: regularMembers, color: 'bg-slate-400', label: t('home.group.member') },
  ];

  // Hoạt động gần đây (placeholder)
  const recentActivities = [
    { icon: Users, text: t('groupManage.dashboard.activityJoined'), time: '2h', color: isDarkMode ? 'text-blue-400' : 'text-blue-500' },
    { icon: Upload, text: t('groupManage.dashboard.activityUploaded'), time: '5h', color: isDarkMode ? 'text-green-400' : 'text-green-500' },
    { icon: BookOpen, text: t('groupManage.dashboard.activityQuiz'), time: '1d', color: isDarkMode ? 'text-purple-400' : 'text-purple-500' },
    { icon: Shield, text: t('groupManage.dashboard.activityRole'), time: '2d', color: isDarkMode ? 'text-amber-400' : 'text-amber-500' },
  ];

  const cardClass = `rounded-2xl border transition-colors duration-300 ${
    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
  }`;

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${fontClass}`}>
      {/* Thông tin nhóm */}
      {group && (
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-blue-950/50' : 'bg-blue-50'}`}>
              <Users className={`w-7 h-7 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {group.groupName}
              </h2>
              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {group.description || t('groupManage.dashboard.noDescription')}
              </p>
            </div>
            <div className={`text-right`}>
              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('groupManage.dashboard.topic')}</p>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {group.topicName || '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`${cardClass} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {membersLoading ? '...' : stat.value}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grid 2 cột: Phân bổ vai trò + Hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phân bổ vai trò */}
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('groupManage.dashboard.roleDistribution')}
            </h3>
          </div>

          {/* Progress bar tổng hợp */}
          {totalMembers > 0 && (
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 flex overflow-hidden mb-5">
              {roleDistribution.map((r) =>
                r.count > 0 ? (
                  <div
                    key={r.role}
                    className={`h-full ${r.color} transition-all duration-500`}
                    style={{ width: `${(r.count / totalMembers) * 100}%` }}
                  />
                ) : null
              )}
            </div>
          )}

          <div className="space-y-3">
            {roleDistribution.map((r) => (
              <div key={r.role} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${r.color}`} />
                  <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {r.label}
                  </span>
                </div>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {membersLoading ? '...' : r.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <Activity className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('groupManage.dashboard.recentActivity')}
            </h3>
          </div>

          <div className="space-y-4">
            {recentActivities.map((act, idx) => {
              const Icon = act.icon;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode ? 'bg-slate-800' : 'bg-gray-50'
                  }`}>
                    <Icon className={`w-4 h-4 ${act.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      {act.text}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>
                      {act.time} {t('groupManage.dashboard.ago')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tiến độ học tập nhóm (placeholder) */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('groupManage.dashboard.learningProgress')}
          </h3>
        </div>
        <div className={`h-48 rounded-xl border-2 border-dashed flex items-center justify-center ${
          isDarkMode ? 'border-slate-700 text-slate-600' : 'border-gray-200 text-gray-300'
        }`}>
          <div className="text-center">
            <BarChart3 className={`w-10 h-10 mx-auto mb-2 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('groupManage.dashboard.progressPlaceholder')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupDashboardTab;
