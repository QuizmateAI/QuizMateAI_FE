import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Loader2 } from 'lucide-react';
import { createMomoPayment, createVnPayPayment } from '@/api/PaymentAPI';
import MomoLogo from '@/assets/MOMO-Logo.png';
import VnpayLogo from '@/assets/Logo-VNPAY-QR-1.webp';

const METHODS = [
  { id: 'momo', alt: 'MoMo', logo: MomoLogo },
  { id: 'vnpay', alt: 'VNPay', logo: VnpayLogo },
];

export default function PaymentMethods({ planId, planType, groupId }) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    setError('');

    try {
      const gId = planType === 'GROUP' ? groupId : null;

      if (selected === 'momo') {
        const res = await createMomoPayment(planId, gId);
        const payUrl = res?.data?.payUrl || res?.payUrl;
        if (payUrl) {
          window.location.href = payUrl;
          return;
        }
        setError(t('payment.momoError'));
      } else if (selected === 'vnpay') {
        const res = await createVnPayPayment(planId, gId);
        const payUrl = res?.data?.payUrl || res?.payUrl;
        if (payUrl) {
          window.location.href = payUrl;
          return;
        }
        setError(t('payment.vnpayError', t('payment.momoError')));
      }
    } catch {
      setError(t('payment.paymentError', t('payment.momoError')));
    } finally {
      setLoading(false);
    }
  }, [selected, planId, planType, groupId, t]);

  return (
    <div>
      <h3 className={`text-xs font-bold mb-3 uppercase tracking-widest ${
        isDarkMode ? 'text-slate-500' : 'text-slate-400'
      }`}>
        {t('payment.chooseMethod')}
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m.id)}
            className={`relative flex items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer min-w-[140px] ${
              selected === m.id
                ? isDarkMode
                  ? 'border-blue-500 bg-blue-900/25 scale-[1.02]'
                  : 'border-blue-500 bg-blue-50/80 scale-[1.02]'
                : isDarkMode
                  ? 'border-slate-700/60 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            {selected === m.id && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-blue-500" />
            )}
            <img
              src={m.logo}
              alt={m.alt}
              className="h-11 w-auto object-contain"
            />
          </button>
        ))}
      </div>

      {error && (
        <p className={`text-xs mb-3 text-center ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!selected || loading}
        onClick={handlePay}
        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all min-w-[140px] ${
          !selected || loading
            ? isDarkMode
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
        }`}
      >
        {loading
          ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('payment.processing')}</span>
          : t('payment.payNow')
        }
      </button>
    </div>
  );
}
