import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { subscribeRateLimit } from '@/lib/rateLimitBus';

/**
 * Cầu nối giữa axios interceptor (ngoài cây React) và ToastContext.
 * Mount 1 lần ở top-level (dưới ToastProvider) — listen `rateLimitBus` rồi
 * gọi `showError`. ToastContext đã dedup 1.2s nên trùng emit không spam.
 */
export default function RateLimitToastBridge() {
  const { showError } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const off = subscribeRateLimit(() => {
      showError(
        t('error.rateLimited', {
          defaultValue: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.',
        }),
      );
    });
    return off;
  }, [showError, t]);

  return null;
}
