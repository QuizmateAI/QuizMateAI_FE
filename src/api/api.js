import axios from 'axios';
import i18n from '@/i18n';
import { clearUserCache } from '@/Utils/userCache';
import { clearPlanPurchaseState } from '@/Utils/planPurchaseState';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/Utils/tokenStorage';

function readEnvString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeParseUrl(value) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

const configuredBaseUrl = readEnvString(import.meta.env.VITE_API_BASE_URL);
export const baseURL = import.meta.env.DEV
  ? '/api'
  : (configuredBaseUrl || '/api');

export function getApiOrigin() {
  const parsedApiUrl = safeParseUrl(configuredBaseUrl);

  if (parsedApiUrl) {
    return parsedApiUrl.origin;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

export function getWebSocketUrl() {
  const configuredWebSocketUrl = readEnvString(import.meta.env.VITE_WS_URL);
  if (configuredWebSocketUrl) {
    return configuredWebSocketUrl;
  }

  const parsedApiUrl = safeParseUrl(configuredBaseUrl);
  if (parsedApiUrl) {
    const normalizedPath = parsedApiUrl.pathname.replace(/\/+$/, '').replace(/\/api$/, '');
    return `${parsedApiUrl.origin}${normalizedPath}/ws-quiz`;
  }

  return '/ws-quiz';
}

const isNgrokUrl = /ngrok-free\.(app|dev)/i.test(configuredBaseUrl || baseURL);

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(isNgrokUrl ? { 'ngrok-skip-browser-warning': 'true' } : {}),
  },
  timeout: 10000, // 10 giây timeout
});

// Interceptor cho request - thêm token vào header nếu có
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== Token refresh single-flight =====
// Khi access token hết hạn (60 phút), thay vì kick user về /login,
// thử dùng refresh token (TTL 7 ngày) gọi POST /auth/refresh để lấy
// access token mới rồi retry request gốc. Chỉ logout khi refresh fail.
const REFRESH_SKIP_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/google-login',
  '/auth/firebase-login',
  '/auth/logout',
];

function shouldSkipRefresh(config) {
  const url = (config?.url || '').split('?')[0];
  return REFRESH_SKIP_PATHS.some((path) => url === path || url.endsWith(path));
}

function clearAuthState() {
  clearTokens();
  localStorage.removeItem('user');
  clearUserCache();
  clearPlanPurchaseState();
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location?.pathname === '/login') return;
  window.location.href = '/login';
}

let refreshPromise = null;

async function performTokenRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // Dùng axios trần (không qua instance api) để bypass interceptor:
  // tránh recursion và tránh gắn Bearer token cũ đã hết hạn.
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(isNgrokUrl ? { 'ngrok-skip-browser-warning': 'true' } : {}),
  };
  const rawResponse = await axios.post(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { headers, timeout: 15000 },
  );

  const body = rawResponse?.data;
  const isOk = body?.statusCode === 200 || body?.statusCode === 0;
  const data = body?.data;
  if (!isOk || !data?.accessToken) {
    throw new Error(body?.message || 'Refresh token failed');
  }

  const newAccessToken = data.accessToken;
  const newRefreshToken = data.refreshToken || refreshToken;
  setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });

  // Cập nhật snapshot user trong localStorage vì role/email có thể đổi.
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({
      ...stored,
      userID: data.userID ?? stored.userID,
      username: data.username ?? stored.username,
      role: data.role ?? stored.role,
      email: data.email ?? stored.email,
      authProvider: data.authProvider ?? stored.authProvider,
    }));
  } catch {
    // localStorage user lỗi parse — bỏ qua, tokens vẫn được cập nhật.
  }

  return newAccessToken;
}

function getRefreshPromise() {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
// ===== /Token refresh =====

// Interceptor cho response - xử lý lỗi chung
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Xử lý 401 / 403.
    //
    // BE chuẩn (sau Cách B) trả:
    //   401 + code=TOKEN_EXPIRED  → token hết hạn, FE refresh.
    //   401 + code=TOKEN_INVALID  → token chết, login lại.
    //   401 + code=TOKEN_MISSING  → chưa đăng nhập, login lại.
    //   403 + code=FORBIDDEN      → user thiếu quyền thật, KHÔNG refresh.
    //
    // Safety net cho BE cũ chưa kịp deploy: 403 không có code rõ ràng vẫn
    // thử refresh 1 lần (vì Spring mặc định trả 403 khi JWT expired).
    const errorBody = error.response?.data;
    const errorCode = errorBody?.data?.code ?? errorBody?.code;
    const isExplicitForbidden = errorCode === 'FORBIDDEN';
    const isAuthRetryable = (status === 401 || status === 403) && !isExplicitForbidden;
    if (
      isAuthRetryable
      && original
      && !original._retry
      && !shouldSkipRefresh(original)
    ) {
      const skipAuthRedirect = Boolean(original.skipAuthRedirect);
      const hasRefreshToken = !!getRefreshToken();
      const isExpiredTokenLikely = status === 401 || errorCode === 'TOKEN_EXPIRED';

      if (hasRefreshToken) {
        original._retry = true;
        try {
          await getRefreshPromise();
          // Request interceptor sẽ tự gắn accessToken mới từ localStorage.
          // Nếu sau refresh vẫn 403 → permission denial thật, surface lỗi.
          return await api(original);
        } catch (refreshOrRetryError) {
          // Phân biệt: lỗi đến từ refresh hay từ retry?
          // refreshOrRetryError có thể là lỗi raw từ axios (refresh) hoặc
          // lỗi đã unwrap (retry qua interceptor).
          const retryStatus = refreshOrRetryError?.statusCode
            ?? refreshOrRetryError?.response?.status;
          const retryFailedDueToPermission = retryStatus === 403;

          // 403 + retry sau refresh vẫn 403 → user thật sự không có quyền.
          // Không redirect, không clear auth — chỉ trả lỗi để UI xử lý.
          if (status === 403 && retryFailedDueToPermission) {
            return Promise.reject({
              statusCode: 403,
              code: refreshOrRetryError?.code ?? refreshOrRetryError?.response?.data?.code,
              message: refreshOrRetryError?.message
                ?? refreshOrRetryError?.response?.data?.message
                ?? i18n.t('error.forbidden', 'Bạn không có quyền thực hiện hành động này.'),
              data: refreshOrRetryError?.data ?? refreshOrRetryError?.response?.data,
            });
          }

          // 401 hoặc refresh fail → token chết hẳn → logout flow.
          if (isExpiredTokenLikely && !skipAuthRedirect) {
            clearAuthState();
            redirectToLogin();
          }
          return Promise.reject({
            statusCode: isExpiredTokenLikely ? 401 : status,
            code: refreshOrRetryError?.response?.data?.code ?? refreshOrRetryError?.code,
            message: refreshOrRetryError?.message || i18n.t('error.unknown'),
            data: refreshOrRetryError?.response?.data ?? refreshOrRetryError?.data,
          });
        }
      }

      // Không có refresh token:
      // - 401: chắc chắn cần login lại.
      // - 403: có thể user đã login nhưng chưa từng có refresh token (corner case),
      //   hoặc thật sự không có quyền → KHÔNG kick về /login, để UI hiển thị 403.
      if (isExpiredTokenLikely && !skipAuthRedirect) {
        clearAuthState();
        redirectToLogin();
      }
    }

    const isTimeoutError = error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''));

    if (isTimeoutError) {
      return Promise.reject({
        statusCode: 408,
        code: 'REQUEST_TIMEOUT',
        message: i18n.t('error.requestTimeout'),
        data: error?.response?.data,
      });
    }

    // Trả về lỗi - ưu tiên chi tiết validation (data.errors) nếu có.
    // BE trả ApiResponse: { statusCode, message, data: {...}, dateTime }
    // Một số endpoint đặt `code` ở top-level (legacy), số khác đặt trong `data.code`
    // (chuẩn mới — auth filter, access denied handler). Đọc cả hai shape.
    const data = error.response?.data;
    const validationErrors = data?.data;
    const errorMessage = data?.message || (validationErrors && typeof validationErrors === 'object'
      ? Object.values(validationErrors).join(', ')
      : null) || i18n.t('error.unknown');

    const resolvedCode = data?.code ?? data?.data?.code;

    // Phát sự kiện toàn cục khi BE trả về lỗi giới hạn gói (safety net cho UI guards)
    if (resolvedCode === 1066 || resolvedCode === 1056) {
      window.dispatchEvent(new CustomEvent('planUpgradeRequired', {
        detail: { message: data?.message, code: resolvedCode },
      }));
    }

    return Promise.reject({
      statusCode: error.response?.status,
      code: resolvedCode,
      message: errorMessage,
      data: data
    });
  }
);

export default api;
