import { useEffect, useState } from 'react';
import i18n from '@/i18n';
import { getApiOrigin } from '@/api/api';
import { buildPaymentResultsPath } from '@/lib/routePaths';

function buildResultUrlFromParams(search, t) {
  const params = new URLSearchParams(search);
  const responseCode = params.get('vnp_ResponseCode') || '';
  const orderId = params.get('vnp_TxnRef') || '';
  const vnpAmount = params.get('vnp_Amount') || '0';
  const amount = Math.floor(Number(vnpAmount) / 100);
  const status = responseCode === '00' ? 'success' : 'failed';
  const message = responseCode === '00'
    ? t('common.paymentRedirect.vnpaySuccessMessage', {
      defaultValue: 'Payment successful',
    })
    : t('common.paymentRedirect.vnpayFailedMessage', {
      defaultValue: 'Payment failed (code: {{code}})',
      code: responseCode,
    });

  return buildPaymentResultsPath({ status, orderId, amount, message, resultCode: responseCode });
}

export default function VnPayReturnRedirect() {
  const [showFallback, setShowFallback] = useState(false);
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const apiOrigin = getApiOrigin();
  const t = i18n.getFixedT(i18n.language?.startsWith('en') ? 'en' : 'vi');
  const error = typeof window !== 'undefined' && apiOrigin === window.location.origin
    ? t('common.paymentRedirect.proxyError', {
      defaultValue: 'Proxy is misconfigured: /api must point to the backend. Or set VITE_API_BASE_URL to the API domain.',
    })
    : null;

  useEffect(() => {
    if (typeof window === 'undefined' || error) {
      return;
    }

    const returnUrl = `${apiOrigin}/api/vnpay/return${window.location.search}`;
    window.location.replace(returnUrl);

    const timeoutId = setTimeout(() => setShowFallback(true), 4000);
    return () => clearTimeout(timeoutId);
  }, [apiOrigin, error]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 text-white p-4">
        <p className="text-sm text-red-400 text-center">{error}</p>
        <a href={buildResultUrlFromParams(search, t)} className="text-blue-400 hover:underline text-sm">
          {t('common.paymentRedirect.backToResults', {
            defaultValue: 'Go to payment results',
          })}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white p-6">
      <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-base text-slate-200 font-medium">
        {t('common.paymentRedirect.redirectingToResults', {
          defaultValue: 'Redirecting to the payment result page...',
        })}
      </p>
      {showFallback && (
        <a
          href={buildResultUrlFromParams(search, t)}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          {t('common.paymentRedirect.fallbackLink', {
            defaultValue: 'If the redirect does not start automatically, click here.',
          })}
        </a>
      )}
    </div>
  );
}
