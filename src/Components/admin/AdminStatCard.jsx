import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';

/**
 * Thẻ KPI thống nhất cho admin + super-admin.
 *
 * Quy tắc màu 60-30-10:
 *  - 60% slate (bề mặt + chữ)
 *  - 30% ocean (top-bar gradient, icon bg)
 *  - 10% glitter (reserved cho `highlight`: shimmer kim tuyến)
 *
 * Props:
 *  - label: string
 *  - value: string | number | node
 *  - icon: lucide icon component
 *  - isDarkMode: boolean
 *  - highlight: boolean — khi true, card dùng accent glitter + shimmer (dùng cho KPI quan trọng nhất)
 *  - helper?: string — hiển thị phụ đề nhỏ
 */
function AdminStatCard({ label, value, icon: Icon, isDarkMode, highlight = false, helper = null }) {
  const topBarCls = highlight
    ? 'bg-ocean-cta animate-glitter-sheen bg-[length:200%_100%]'
    : 'bg-gradient-to-r from-ocean-500 to-ocean-700';
  const iconWrapCls = highlight
    ? (isDarkMode ? 'bg-glitter-500/20 text-glitter-300' : 'bg-glitter-100 text-glitter-700')
    : (isDarkMode ? 'bg-ocean-800/40 text-ocean-200' : 'bg-ocean-50 text-ocean-700');

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 hover:shadow-lg ${
        isDarkMode
          ? 'bg-slate-900 border-slate-800 hover:border-ocean-700'
          : 'bg-white border-slate-200 hover:border-ocean-300'
      }`}
    >
      <div className={`h-1 ${topBarCls}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
        <CardTitle className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </CardTitle>
        {Icon ? (
          <div className={`p-2.5 rounded-xl ${iconWrapCls}`}>
            <Icon className="w-5 h-5" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {value}
        </div>
        {helper ? (
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default AdminStatCard;
