import axios from 'axios';
import i18n from '@/i18n';
import { clearUserCache } from '@/utils/userCache';
import { clearPlanPurchaseState } from '@/utils/planPurchaseState';

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
    if (config.skipAuthHeader) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== Refresh-token: gọi /auth/refresh khi access token hết hạn =====
// Single-flight: nếu nhiều request fail cùng lúc, chỉ 1 lần gọi /auth/refresh,
// các request còn lại cùng share promise. Sau khi có token mới, retry request gốc.
let refreshPromise = null;

function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return Promise.reject(new Error('NO_REFRESH_TOKEN'));
  }

  // Dùng axios "trần" (không qua instance `api`) để tránh interceptor lồng nhau.
  return axios
    .post(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(isNgrokUrl ? { 'ngrok-skip-browser-warning': 'true' } : {}),
        },
        timeout: 30000,
      },
    )
    .then((response) => {
      const payload = response?.data?.data;
      const newAccessToken = payload?.accessToken;
      if (!newAccessToken) {
        throw new Error('INVALID_REFRESH_RESPONSE');
      }
      localStorage.setItem('accessToken', newAccessToken);
      if (payload.refreshToken) {
        localStorage.setItem('refreshToken', payload.refreshToken);
      }
      return newAccessToken;
    });
}

function getOrStartRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

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

  if (!localStorage.getItem('refreshToken')) return false;

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
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
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
    const code = extractErrorCode(error?.response?.data);

    // BE trả 403 + USER_BANNED khi user đang bị ban → đẩy về /account-suspended.
    // Bỏ qua nếu đang ở chính trang đó để tránh loop.
    if (status === 403 && code === 'USER_BANNED' && typeof window !== 'undefined'
        && !window.location.pathname.startsWith('/account-suspended')
        && !originalRequest?.skipBanRedirect) {
      window.location.href = '/account-suspended';
    }

    if (shouldAttemptRefresh(error, originalRequest)) {
      originalRequest._retry = true;
      try {
        await getOrStartRefresh();
        // Request interceptor sẽ gắn access token mới từ localStorage.
        return await api(originalRequest);
      } catch (refreshError) {
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

    // Trả về lỗi - ưu tiên chi tiết validation (data.errors) nếu có
    const data = error.response?.data;
    const validationErrors = data?.data;
    const validationMessage = validationErrors && typeof validationErrors === 'object'
      ? Object.entries(validationErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ')
      : null;
    const errorMessage = validationMessage || data?.message || i18n.t('error.unknown');

    // Phát sự kiện toàn cục khi BE trả về lỗi giới hạn gói (safety net cho UI guards)
    const businessCode = data?.code;
    if (businessCode === 1066 || businessCode === 1056) {
      window.dispatchEvent(new CustomEvent('planUpgradeRequired', {
        detail: { message: data?.message, code: businessCode },
      }));
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
