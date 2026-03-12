import ERROR_CODES from '@/Constants/errorCodes';

/**
 * Lấy i18n key tương ứng với error code từ BE.
 * Ưu tiên: i18n key (nếu có mapping) → message gốc từ server → fallback mặc định.
 *
 * @param {object} error - Object lỗi từ axios interceptor { statusCode, message, data }
 * @returns {{ key: string|null, fallbackMessage: string }} i18n key và message dự phòng
 */
export function getErrorInfo(error) {
  const code = error?.data?.code;
  const serverMessage = error?.data?.message || error?.message;
  const key = code && ERROR_CODES[code] ? ERROR_CODES[code] : null;

  return { key, fallbackMessage: serverMessage || 'error.unknown' };
}

/**
 * Trả về message hiển thị cho người dùng, tự động dùng i18n nếu có.
 *
 * @param {Function} t - Hàm t() từ react-i18next
 * @param {object} error - Object lỗi từ axios interceptor
 * @returns {string} Chuỗi thông báo lỗi
 */
export function getErrorMessage(t, error) {
  const { key, fallbackMessage } = getErrorInfo(error);
  const rawMessage = String(fallbackMessage || '').trim();
  const lowerMessage = rawMessage.toLowerCase();
  const statusCode = Number(error?.statusCode || error?.data?.statusCode || error?.status || error?.data?.status);

  if (key) {
    const translated = t(key);
    // Nếu i18n trả về chính key (chưa có bản dịch) → dùng message gốc
    if (translated !== key) return translated;
  }

  // Chuẩn hóa các lỗi kỹ thuật phổ biến từ BE/HTTP về message thân thiện.
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
