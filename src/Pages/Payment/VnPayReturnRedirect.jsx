import { useEffect, useState } from 'react';

/**
 * When VNPay redirects back to /api/vnpay/return but the SPA handles that route,
 * forward the browser to the backend return handler instead.
 */
function buildResultUrlFromParams(search) {
  const params = new URLSearchParams(search);
  const responseCode = params.get('vnp_ResponseCode') || '';
  const orderId = params.get('vnp_TxnRef') || '';
  const vnpAmount = params.get('vnp_Amount') || '0';
  const amount = Math.floor(Number(vnpAmount) / 100);
  const status = responseCode === '00' ? 'success' : 'failed';
  const message = responseCode === '00' ? 'Thanh toan thanh cong' : `Thanh toan that bai (ma: ${responseCode})`;
  const q = new URLSearchParams({ status, orderId, amount: String(amount), message, resultCode: responseCode });
  return `/payment/result?${q.toString()}`;
}

export default function VnPayReturnRedirect() {
  const [showFallback, setShowFallback] = useState(false);
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const apiOrigin = typeof window === 'undefined'
    ? ''
    : base.startsWith('http')
      ? new URL(base).origin
      : window.location.origin;
  const error = typeof window !== 'undefined' && apiOrigin === window.location.origin
    ? 'Cấu hình proxy: /api phải trỏ về backend. Hoặc đặt VITE_API_BASE_URL trỏ sang domain API.'
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
        <a href={buildResultUrlFromParams(search)} className="text-blue-400 hover:underline text-sm">
          Về trang kết quả thanh toán
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white p-6">
      <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-base text-slate-200 font-medium">Đang chuyển đến trang kết quả thanh toán...</p>
      {showFallback && (
        <a
          href={buildResultUrlFromParams(search)}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Nếu không tự chuyển, bấm vào đây
        </a>
      )}
    </div>
  );
}
