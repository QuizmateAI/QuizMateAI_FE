import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Check, Calendar, CreditCard } from 'lucide-react';
import PlanDetails from './PlanDetails';

export default function PlanInfoCard({ plan }) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  const formattedPrice = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(plan.price),
    [plan.price]
  );

  return (
    <div className={`rounded-3xl overflow-hidden transition-colors ${
      isDarkMode
        ? 'bg-slate-900 ring-1 ring-slate-700/50'
        : 'bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-300/30'
    }`}>
      {/* Gradient accent top bar */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <div className="p-6 sm:p-8">
        {/* Plan header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold tracking-tight ${
            isDarkMode ? 'text-slate-50' : 'text-slate-900'
          }`}>
            {t('payment.planInfo')}
          </h2>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            isDarkMode
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          }`}>
            <Check className="w-3.5 h-3.5" /> {plan.status}
          </span>
        </div>

        {/* Plan card */}
        <div className={`rounded-2xl p-5 mb-6 ${
          isDarkMode
            ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/20 ring-1 ring-blue-500/20'
            : 'bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`font-bold text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {plan.planName}
              </span>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
              isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>
              {plan.type}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-extrabold tracking-tight ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {formattedPrice}₫
            </span>
          </div>
          <div className={`flex items-center gap-1.5 mt-2 text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <Calendar className="w-3.5 h-3.5" />
            {plan.durationInDay} {t('payment.days')}
          </div>
        </div>

        {/* Limits & Features */}
        <PlanDetails plan={plan} />
      </div>
    </div>
  );
}
