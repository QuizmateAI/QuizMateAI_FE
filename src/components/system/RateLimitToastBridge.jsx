import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { subscribeRateLimit } from '@/lib/rateLimitBus';

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
