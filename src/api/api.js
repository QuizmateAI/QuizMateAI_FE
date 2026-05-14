import axios from 'axios';
import i18n from '@/i18n';
import { clearUserCache } from '@/utils/userCache';
import { clearPlanPurchaseState } from '@/utils/planPurchaseState';
import { clearCurrentUser } from '@/lib/currentUser';
import { emitPlanUpgrade } from '@/lib/planUpgradeBus';
import { emitRateLimit } from '@/lib/rateLimitBus';
import { applyPaginationBounds } from '@/utils/pagination';
import {
  clearTokens,
  configureRefresh,
  getAccessToken,
  refresh as refreshTokenStorage,
  setAccessToken,
} from '@/utils/tokenStorage';
import { getDeviceId } from '@/utils/deviceId';

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
//
// withCredentials: true is required so the browser sends the httpOnly refresh
// cookie on /auth/refresh and clears it on /auth/logout. CORS on the BE side
// must explicitly allow the origin (no wildcard) — see CORS config there.
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(isNgrokUrl ? { 'ngrok-skip-browser-warning': 'true' } : {}),
  },
  timeout: 10000, // 10 giây timeout
  withCredentials: true,
});

// Interceptor cho request - thêm token vào header nếu có
api.interceptors.request.use(
  (config) => {
    // X-Device-Id: BE dùng để phân biệt browser instance cho device-aware logout.
    // Gắn cho mọi request (kể cả /auth/login) để BE biết device khi cấp token.
    try {
      const deviceId = getDeviceId();
      if (deviceId) {
        config.headers['X-Device-Id'] = deviceId;
      }
    } catch {
      /* no-op: thiếu header chỉ khiến BE fallback sang User-Agent hash */
    }

    // BE enforce `1 ≤ size ≤ 100` và `page ≥ 0`, trả 400 khi vượt biên.
    // Clamp ở client để tránh user-facing 400 do default state hoặc UI bug.
    // Opt-out per-request bằng `skipPaginationClamp: true` trong config.
    applyPaginationBounds(config);

    if (config.skipAuthHeader) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 JWT Token in Request:', token);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== Refresh-token: gọi /auth/refresh khi access token hết hạn =====
// The refresh token now lives in an httpOnly cookie set by the BE — JS cannot
// read it. We just POST /auth/refresh with credentials; the browser attaches
// the cookie automatically. BE rotates the cookie and returns the new access
// token in the JSON body, which we put back into the in-memory token store.
//
// Single-flight is owned by tokenStorage.refresh() so that this interceptor and
// the app-start bootstrap share one in-flight refresh request.
function refreshAccessToken() {
  // Dùng axios "trần" (không qua instance `api`) để tránh interceptor lồng nhau.
  // withCredentials forces the browser to send the refresh cookie even though
  // we're using the bare axios — no interceptor would do it for us here.
  // X-Device-Id phải gắn thủ công vì bare axios không qua request interceptor.
  let deviceIdHeader = {};
  try {
    const deviceId = getDeviceId();
    if (deviceId) deviceIdHeader = { 'X-Device-Id': deviceId };
  } catch {
    /* no-op */
  }

  return axios
    .post(
      `${baseURL}/auth/refresh`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(isNgrokUrl ? { 'ngrok-skip-browser-warning': 'true' } : {}),
          ...deviceIdHeader,
        },
        timeout: 30000,
        withCredentials: true,
      },
    )
    .then((response) => {
      const payload = response?.data?.data;
      const newAccessToken = payload?.accessToken;
      if (!newAccessToken) {
        throw new Error('INVALID_REFRESH_RESPONSE');
      }
      setAccessToken(newAccessToken);
      // BE may also rotate the refresh cookie via Set-Cookie — that is handled
      // by the browser. No JS work needed for the refresh token itself.
      return newAccessToken;
    });
}

// Wire the refresh function into tokenStorage so its bootstrap() and refresh()
// can recover the access token at app start (and from the interceptor) without
// importing axios. tokenStorage.refresh() also serializes concurrent callers.
configureRefresh(refreshAccessToken);

function extractErrorCode(data) {
  // BE trả 2 loại code: top-level numeric (business) và nested string (auth filter).
  return data?.code ?? data?.data?.code;
}

function shouldAttemptRefresh(error, originalRequest) {
  if (!originalRequest || originalRequest._retry) return false;
  if (originalRequest.skipAuthRedirect) return false;

  const url = String(originalRequest.url || '');
  // Tránh loop: chính request /auth/refresh không được trigger refresh.
  if (url.includes('/auth/refresh')) return false;

  // Refresh token now lives in an httpOnly cookie that JS cannot read, so we
  // can't pre-check its presence. Always attempt refresh on a relevant 401/403
  // — if the cookie is missing/expired the BE returns 401 and we redirect.

  const status = error?.response?.status;
  if (status !== 401 && status !== 403) return false;

  const code = extractErrorCode(error?.response?.data);
  if (status === 403) {
    return code === 'TOKEN_EXPIRED';
  }

  // Permission denial thật sự — refresh vô nghĩa.
  if (code === 'FORBIDDEN') return false;
  // Token bị thu hồi/không hợp lệ — refresh không cứu được.
  if (code === 'TOKEN_INVALID') return false;

  return true;
}

function clearAuthAndRedirect() {
  clearTokens();
  // 'user' was a separate localStorage entry holding the lightweight identity
  // snapshot — still safe to wipe even now that tokens are no longer there.
  clearCurrentUser();
  clearUserCache();
  clearPlanPurchaseState();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// Interceptor cho response - xử lý lỗi chung
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const skipAuthRedirect = Boolean(originalRequest?.skipAuthRedirect);
    if (shouldAttemptRefresh(error, originalRequest)) {
      originalRequest._retry = true;
      try {
        await refreshTokenStorage();
        // Request interceptor sẽ gắn access token mới từ in-memory store.
        return await api(originalRequest);
      } catch {
        // Refresh thất bại — chỉ clear+redirect khi original là 401 (giữ behavior cũ).
        if (status === 401 && !skipAuthRedirect) {
          clearAuthAndRedirect();
        }
        // Tiếp tục format-and-reject lỗi gốc bên dưới.
      }
    } else if (status === 401 && !skipAuthRedirect) {
      // Không refresh được (không có refresh token, hoặc đã retry) — kick về login.
      clearAuthAndRedirect();
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

    // BE rate-limit trả 429 với body text/plain "Too Many Requests".
    // Emit qua bus để bridge component show toast (caller vẫn nhận reject như
    // thường — có thể opt-out global toast bằng `skipRateLimitToast: true`).
    if (status === 429) {
      const rawBody = error.response?.data;
      const messageFromBody = typeof rawBody === 'string' && rawBody.trim() ? rawBody.trim() : null;
      if (!originalRequest?.skipRateLimitToast) {
        emitRateLimit({
          url: originalRequest?.url,
          message: messageFromBody,
        });
      }
      return Promise.reject({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: i18n.t('error.rateLimited', { defaultValue: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.' }),
        data: rawBody,
      });
    }

    // Trả về lỗi - ưu tiên chi tiết validation (data.errors) nếu có
    const data = error.response?.data;
    const validationErrors = data?.data;
    const validationMessage = validationErrors && typeof validationErrors === 'object'
      ? Object.entries(validationErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ')
      : null;
    const errorMessage = validationMessage || data?.message || i18n.t('error.unknown');

    // Phát sự kiện qua planUpgradeBus khi BE trả về lỗi giới hạn gói
    // (safety net cho UI guards). Bus tự re-dispatch window event để giữ
    // tương thích với listener cũ trong quá trình migrate.
    const businessCode = data?.code;
    if (businessCode === 1066 || businessCode === 1056) {
      emitPlanUpgrade({ message: data?.message, code: businessCode });
    }

    return Promise.reject({
      statusCode: error.response?.status,
      code: extractErrorCode(data),
      message: errorMessage,
      data: data
    });
  }
);

export default api;
