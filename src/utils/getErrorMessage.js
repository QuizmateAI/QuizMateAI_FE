import ERROR_CODES from '@/lib/errorCodes';

/**
 * Lookup map: numeric BE error code (HTTP trailer style) → category tiêu đề toast.
 * Được dùng khi hiển thị toast có structured title để admin biết lỗi thuộc nhóm nào.
 */
const CATEGORY_BY_CODE_RANGE = [
  { min: 1001, max: 1007, category: 'Xác thực' },
  { min: 1010, max: 1014, category: 'Workspace' },
  { min: 1015, max: 1023, category: 'Nhóm' },
  { min: 1024, max: 1031, category: 'Quiz' },
  { min: 1033, max: 1033, category: 'Mật khẩu' },
  { min: 1034, max: 1046, category: 'Thanh toán / Gói' },
  { min: 1047, max: 1047, category: 'Tài khoản' },
  { min: 1048, max: 1057, category: 'Phân quyền' },
  { min: 1060, max: 1060, category: 'Phân quyền' },
  { min: 1065, max: 1066, category: 'Tài liệu' },
  { min: 1067, max: 1082, category: 'Gói / Challenge (legacy)' },
  { min: 1083, max: 1088, category: 'Quiz / Quiz Attempt' },
  { min: 1097, max: 1109, category: 'System Config' },
  { min: 1110, max: 1117, category: 'Plan nâng cao' },
  { min: 1118, max: 1127, category: 'Credit Package / Quiz Attempt' },
  { min: 1128, max: 1139, category: 'AI Model / Credit' },
  { min: 1140, max: 1149, category: 'Feedback' },
  { min: 1150, max: 1183, category: 'Challenge / Quiz Review' },
  { min: 2001, max: 2099, category: 'Validation' },
];

function resolveCategory(code) {
  if (!code) return 'Lỗi hệ thống';
  const match = CATEGORY_BY_CODE_RANGE.find((r) => code >= r.min && code <= r.max);
  return match ? match.category : 'Lỗi hệ thống';
}

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

/**
 * Build structured toast payload for admin-facing errors.
 *
 * Output:
 *   {
 *     title:       e.g. "Phân quyền",
 *     description: e.g. "Vai trò đã tồn tại",
 *     meta:        e.g. "Mã lỗi #1051" — giúp admin copy cho support,
 *   }
 *
 * Sử dụng:
 *   showError(buildAdminErrorPayload(t, err, 'Không lưu được gói'))
 */
export function buildAdminErrorPayload(t, error, fallbackTitle = 'Thao tác thất bại') {
  const code = resolveBusinessErrorCode(error);
  const description = getErrorMessage(t, error);
  const category = resolveCategory(code);
  const title = category || fallbackTitle;
  const meta = code ? `Mã lỗi #${code}` : null;

  return {
    title,
    description: description || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    meta,
    code: code || null,
  };
}
