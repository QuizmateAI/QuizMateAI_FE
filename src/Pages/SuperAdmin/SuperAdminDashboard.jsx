import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UsersRound,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Shield,
  Activity,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';
import { getSystemOverviewStats } from '@/api/ManagementSystemAPI';

function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    userCount: 0,
    adminCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await getSystemOverviewStats();
      const data = res?.data ?? res ?? {};
      setStats({
        totalAdmins: Number(data.totalAdmins || 0),
        totalUsers: Number(data.totalUsers || 0),
        userCount: Number(data.userCount || 0),
        adminCount: Number(data.adminCount || 0),
      });
    } catch (err) {
      console.error('Fetch stats error:', err);
      setStats({ totalAdmins: 0, totalUsers: 0, userCount: 0, adminCount: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      labelKey: 'dashboard.totalAdmins',
      value: isLoading ? '...' : stats.totalAdmins.toLocaleString(),
      icon: ShieldCheck,
      gradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      labelKey: 'dashboard.totalUsers',
      value: isLoading ? '...' : stats.totalUsers.toLocaleString(),
      icon: Users,
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      labelKey: 'dashboard.userCount',
      value: isLoading ? '...' : stats.userCount.toLocaleString(),
      icon: Users,
      subLabel: 'USER',
      gradient: 'from-slate-500 to-slate-600',
      bgLight: 'bg-slate-50 dark:bg-slate-800/50',
      iconColor: 'text-slate-600 dark:text-slate-400',
    },
  ];

  const quickActions = [
    {
      title: t('sidebar.users'),
      desc: t('userPage.desc'),
      icon: Users,
      path: '/super-admin/users',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: t('sidebar.groups'),
      desc: t('groupPage.desc'),
      icon: UsersRound,
      path: '/super-admin/groups',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: t('sidebar.subscriptions'),
      desc: t('subscription.desc'),
      icon: CreditCard,
      path: '/super-admin/plan',
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      title: t('sidebar.adminAccounts'),
      desc: t('adminManagement.desc'),
      icon: Shield,
      path: '/super-admin/admins',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 p-6 ${fontClass}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className={`text-3xl font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t('sidebar.dashboard')}
          </h1>
          <p
            className={`mt-1 font-medium ${
              isDarkMode ? 'text-slate-400' : 'text-gray-500'
            }`}
          >
            {t('dashboard.superAdminDesc')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={isLoading}
          className="rounded-xl shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((stat) => (
          <Card
            key={stat.labelKey}
            className={`overflow-hidden border transition-all duration-300 hover:shadow-lg ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle
                className={`text-sm font-medium ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}
              >
                {t(stat.labelKey)}
                {stat.subLabel && (
                  <span className="ml-2 text-xs font-normal opacity-75">({stat.subLabel})</span>
                )}
              </CardTitle>
              <div
                className={`p-2.5 rounded-xl ${stat.bgLight}`}
              >
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                className={`text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card
          className={`lg:col-span-2 border transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-800'
            }`}>
              <Activity className="w-5 h-5 text-amber-500" />
              {t('dashboard.quickActions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                  isDarkMode
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className={`p-3 rounded-xl ${action.bgColor}`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {action.title}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {action.desc}
                  </p>
                </div>
                <ArrowRight className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Role Overview */}
        <Card
          className={`border transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-800'
            }`}>
              <Shield className="w-5 h-5 text-indigo-500" />
              {t('dashboard.roleOverview')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                USER
              </span>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isLoading ? '...' : stats.userCount}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                ADMIN
              </span>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isLoading ? '...' : stats.adminCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
