import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ShieldCheck } from 'lucide-react';
import PaymentMethods from './PaymentMethods';

export default function PaymentSidebar({ plan, groupId }) {
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
      <div className="p-6">
        {/* Order summary */}
        <h2 className={`text-lg font-bold tracking-tight mb-5 ${
          isDarkMode ? 'text-slate-50' : 'text-slate-900'
        }`}>
          {t('payment.orderSummary')}
        </h2>

        {/* Line items */}
        <div className={`space-y-3 pb-4 border-b border-dashed ${
          isDarkMode ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-sm">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              {plan.planName}
            </span>
            <span className={`font-semibold tabular-nums ${
              isDarkMode ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {formattedPrice}₫
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              {t('payment.duration')}
            </span>
            <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {plan.durationInDay} {t('payment.days')}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-4 mb-5">
          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t('payment.total')}
          </span>
          <span className={`text-2xl font-extrabold tracking-tight ${
            isDarkMode ? 'text-slate-50' : 'text-slate-900'
          }`}>
            {formattedPrice}₫
          </span>
        </div>

        {/* Payment methods */}
        <PaymentMethods planId={plan.planId} planType={plan.type} groupId={groupId} />

        {/* Security note */}
        <div className={`flex items-center justify-center gap-1.5 mt-5 text-xs ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('payment.secureNote')}
        </div>
      </div>
    </div>
  );
}
