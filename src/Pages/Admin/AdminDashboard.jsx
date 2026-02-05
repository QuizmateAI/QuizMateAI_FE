import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";

// Stats với key để lấy translation
const stats = [
  { labelKey: 'dashboard.totalUsers', value: '12,540', icon: Users, color: 'text-blue-600' },
  { labelKey: 'dashboard.monthlyRevenue', value: '$45,200', icon: TrendingUp, color: 'text-green-600' },
  { labelKey: 'dashboard.aiTokensUsed', value: '1.2M', icon: Zap, color: 'text-amber-600' },
  { labelKey: 'dashboard.violationReports', value: '14', icon: AlertTriangle, color: 'text-red-600' },
];

function AdminDashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#313131]">{t('dashboard.systemOverview')}</h1>
        <p className="text-gray-500">{t('dashboard.welcomeBack')}</p>
      </div>

      {/* Grid thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.labelKey} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">{t(stat.labelKey)}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-500 font-medium">{t('dashboard.comparedToLastMonth')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder cho Biểu đồ & Bảng dữ liệu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 h-[400px] flex items-center justify-center text-gray-400 border-dashed border-2">
           {t('dashboard.userGrowthChart')}
        </Card>
        <Card className="h-[400px] flex items-center justify-center text-gray-400 border-dashed border-2">
           {t('dashboard.newUsersList')}
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;