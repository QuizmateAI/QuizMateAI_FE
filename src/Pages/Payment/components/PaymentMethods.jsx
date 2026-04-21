import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import MomoLogo from '@/assets/MOMO-Logo.png';
import VnpayLogo from '@/assets/Logo-VNPAY-QR-1.webp';
import StripeLogo from '@/assets/Stripe-Logo.svg';

const METHODS = [
  {
    id: 'momo',
    alt: 'MoMo',
    logo: MomoLogo,
    logoClassName: 'h-9 sm:h-10',
    logoSlotClassName: 'w-[110px] sm:w-[124px]',
    label: 'MoMo wallet',
  },
  {
    id: 'vnpay',
    alt: 'VNPay',
    logo: VnpayLogo,
    logoClassName: 'h-8 sm:h-9',
    logoSlotClassName: 'w-[110px] sm:w-[124px]',
    label: 'VNPay QR',
  },
  {
    id: 'stripe',
    alt: 'Stripe',
    logo: StripeLogo,
    logoClassName: 'h-7 sm:h-8',
    logoSlotClassName: 'w-[110px] sm:w-[124px]',
    label: 'Stripe checkout',
  },
];

export default function PaymentMethods({
  selectedMethod = null,
  onSelectMethod,
  disabled = false,
}) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  return (
    <section className={`overflow-hidden rounded-[30px] border ${
      isDarkMode
        ? 'border-slate-700/70 bg-slate-900/95 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.9)]'
        : 'border-slate-200/80 bg-white shadow-[0_28px_80px_-46px_rgba(37,99,235,0.18)]'
    }`}>
      <div className={`border-b px-6 py-5 sm:px-8 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-[0.22em] ${
          isDarkMode ? 'text-slate-500' : 'text-sky-600'
        }`}>
          {t('payment.chooseMethod')}
        </h3>
        <p className={`mt-2 text-sm ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {t(
            'payment.methodSectionHint',
            'Choose a payment method below to continue with secure checkout.'
          )}
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="space-y-3">
          {METHODS.map((m) => (
            <div
              key={m.id}
              className={`overflow-hidden rounded-[24px] border transition-all ${
                selectedMethod === m.id
                  ? isDarkMode
                    ? 'border-sky-400/30 bg-slate-900'
                    : 'border-sky-200 bg-sky-50/40'
                  : isDarkMode
                    ? 'border-slate-800 bg-slate-950/40'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectMethod?.(m.id)}
                aria-pressed={selectedMethod === m.id}
                disabled={disabled}
                className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors cursor-pointer ${
                  disabled ? 'opacity-70' : ''
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectedMethod === m.id
                    ? isDarkMode
                      ? 'border-sky-400'
                      : 'border-sky-500'
                    : isDarkMode
                      ? 'border-slate-600'
                      : 'border-slate-300'
                }`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    selectedMethod === m.id
                      ? isDarkMode
                        ? 'bg-sky-400'
                        : 'bg-sky-500'
                      : 'bg-transparent'
                  }`} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${
                    isDarkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {m.label}
                  </p>
                  <p className={`mt-1 text-xs ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {t(
                      `payment.methodDescription.${m.id}`,
                      `Complete your purchase securely with ${m.alt}.`
                    )}
                  </p>
                </div>

                <span className={`flex h-10 shrink-0 items-center justify-center ${m.logoSlotClassName}`}>
                  <img
                    src={m.logo}
                    alt={m.alt}
                    className={`w-auto max-w-full object-contain ${m.logoClassName}`}
                  />
                </span>
              </button>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
