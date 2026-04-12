import ERROR_CODES from '@/Constants/errorCodes';

/**
 * Resolve the i18n key for a BE error code.
 * Priority: mapped i18n key -> original server message -> default fallback.
 *
 * @param {object} error - Axios-style error object { statusCode, message, data }
 * @returns {{ key: string|null, fallbackMessage: string }} Resolved i18n key and fallback message
 */
/**
 * BE ApiResponse often puts the business error code in `data.statusCode` (e.g. 1036), not `data.code`.
 */
function resolveBusinessErrorCode(error) {
  const body = error?.data;
  const fromBody = body?.statusCode;
  if (typeof fromBody === 'number' && fromBody >= 1000 && fromBody < 10000) {
    return fromBody;
  }
  const fromCode = body?.code ?? error?.code;
  if (typeof fromCode === 'number' && fromCode >= 1000 && fromCode < 10000) {
    return fromCode;
  }
  return null;
}

export function getErrorInfo(error) {
  const code = resolveBusinessErrorCode(error);
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
  const httpStatus = Number(error?.statusCode);

  if (key) {
    const translated = t(key);
    // If i18n returns the key unchanged, fall back to the server message.
    if (translated !== key) return translated;
  }

  // Normalize common BE/HTTP technical errors to a friendlier message.
  if (!Number.isNaN(httpStatus) && httpStatus >= 500) {
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
