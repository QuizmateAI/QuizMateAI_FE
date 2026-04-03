import ERROR_CODES from '@/Constants/errorCodes';

/**
 * Resolve the i18n key for a BE error code.
 * Priority: mapped i18n key -> original server message -> default fallback.
 *
 * @param {object} error - Axios-style error object { statusCode, message, data }
 * @returns {{ key: string|null, fallbackMessage: string }} Resolved i18n key and fallback message
 */
export function getErrorInfo(error) {
  const code = error?.data?.code;
  const serverMessage = error?.data?.message || error?.message;
  const key = code && ERROR_CODES[code] ? ERROR_CODES[code] : null;

  return { key, fallbackMessage: serverMessage || 'error.unknown' };
}

/**
 * Build the error message shown to the user, preferring i18n when available.
 *
 * @param {Function} t - react-i18next t() function
 * @param {object} error - Axios-style error object
 * @returns {string} User-facing error message
 */
export function getErrorMessage(t, error) {
  const { key, fallbackMessage } = getErrorInfo(error);
  const rawMessage = String(fallbackMessage || '').trim();
  const lowerMessage = rawMessage.toLowerCase();
  const statusCode = Number(error?.statusCode || error?.data?.statusCode || error?.status || error?.data?.status);

  if (key) {
    const translated = t(key);
    // If i18n returns the key unchanged, fall back to the server message.
    if (translated !== key) return translated;
  }

  // Normalize common BE/HTTP technical errors to a friendlier message.
  if (!Number.isNaN(statusCode) && statusCode >= 500) {
    return t('error.internalServer');
  }

  if (
    lowerMessage === 'internal server error' ||
    lowerMessage.includes('internal server error') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network error') ||
    lowerMessage.includes('timeout')
  ) {
    return t('error.internalServer');
  }

  return fallbackMessage;
}
