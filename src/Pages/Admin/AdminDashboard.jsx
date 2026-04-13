import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Zap, CreditCard,
  RefreshCw, ArrowRight, Activity, Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAdminOverviewStats } from '@/api/ManagementSystemAPI';
import AdminStatCard from '@/Components/admin/AdminStatCard';

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlans: 0,
    activeSubs: 0,
    aiTokensUsed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminOverviewStats();
      const data = res?.data ?? res ?? {};

      setStats({
        totalUsers: Number(data.totalUsers || 0),
        totalPlans: Number(data.totalPlans || 0),
        activeSubs: Number(data.activePlans || 0),
        aiTokensUsed: Number(data.aiTokensUsed || 0),
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      labelKey: 'dashboard.totalUsers',
      value: isLoading ? '...' : stats.totalUsers.toLocaleString(),
      icon: Users,
      highlight: true,
    },
    {
      labelKey: 'subscription.stats.totalPlans',
      value: isLoading ? '...' : stats.totalPlans.toLocaleString(),
      icon: Package,
      highlight: false,
    },
    {
      labelKey: 'subscription.stats.activeSubs',
      value: isLoading ? '...' : stats.activeSubs.toLocaleString(),
      icon: CreditCard,
      highlight: false,
    },
    {
      labelKey: 'dashboard.aiTokensUsed',
      value: isLoading ? '...' : stats.aiTokensUsed.toLocaleString(),
      icon: Zap,
      highlight: false,
    },
  ];

  const quickActions = [
    {
      title: t('sidebar.users'),
      desc: t('userPage.desc'),
      icon: Users,
      path: '/admin/users',
    },
    {
      title: t('sidebar.subscriptions'),
      desc: t('subscription.desc'),
      icon: CreditCard,
      path: '/admin/plans',
    },
    {
      title: t('sidebar.groups'),
      desc: t('groupPage.desc'),
      icon: Users,
      path: '/admin/groups',
    },
  ];

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 p-6 ${fontClass}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>{t('dashboard.systemOverview')}</h1>
          <p className={`mt-1 font-medium ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>{t('dashboard.welcomeBack')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={isLoading}
          className="rounded-xl shrink-0 border-ocean-200 text-ocean-700 hover:bg-ocean-50 dark:border-ocean-800 dark:text-ocean-200 dark:hover:bg-ocean-900/40"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* KPI Cards — chuẩn 60-30-10 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <AdminStatCard
            key={stat.labelKey}
            label={t(stat.labelKey)}
            value={stat.value}
            icon={stat.icon}
            isDarkMode={isDarkMode}
            highlight={stat.highlight}
          />
        ))}
      </div>

      {/* Quick Actions & Chart Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className={`lg:col-span-2 border transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-800'
            }`}>
              <Activity className="w-5 h-5 text-ocean-500" />
              {t('dashboard.quickActions') || 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                  isDarkMode
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-ocean-900/20 hover:border-ocean-700'
                    : 'bg-slate-50 border-slate-100 hover:bg-ocean-50 hover:border-ocean-200'
                }`}
              >
                <div className={`p-3 rounded-xl ${
                  isDarkMode ? 'bg-ocean-800/40 text-ocean-200' : 'bg-ocean-100 text-ocean-700'
                }`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {action.title}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {action.desc}
                  </p>
                </div>
                <ArrowRight className={`w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={`h-[400px] flex items-center justify-center border-dashed border-2 transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-white border-slate-300 text-slate-400'
        }`}>
          {t('dashboard.userGrowthChart')}
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;
