import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { useDarkMode } from '@/hooks/useDarkMode';

const stats = [
  { labelKey: 'dashboard.totalAdmins', value: '12', icon: ShieldCheck, color: 'text-blue-600' },
  { labelKey: 'dashboard.totalUsers', value: '12,540', icon: Users, color: 'text-green-600' },
  { labelKey: 'dashboard.systemLoad', value: '45%', icon: TrendingUp, color: 'text-amber-600' },
];

function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 p-6 ${fontClass}`}>
      <div>
        <h1 className={`text-3xl font-black tracking-tight ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}>{t('sidebar.dashboard')}</h1>
        <p className={`font-medium ${
          isDarkMode ? 'text-slate-400' : 'text-gray-500'
        }`}>{t('dashboard.superAdminDesc')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.labelKey} className={`border shadow-sm transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={`text-sm font-medium ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}>{t(stat.labelKey)}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

       <div className="grid grid-cols-1 gap-6">
        <Card className={`h-[400px] flex items-center justify-center border-dashed border-2 transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-white border-slate-300 text-gray-400'
        }`}>
            System Monitoring Chart Placeholder
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
