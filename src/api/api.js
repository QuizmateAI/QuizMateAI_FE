import axios from 'axios';
import { clearUserCache } from '@/Utils/userCache';

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

// Interceptor cho response - xử lý lỗi chung
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Xử lý lỗi 401 - Unauthorized (token hết hạn)
    if (error.response?.status === 401) {
      const skipAuthRedirect = Boolean(error.config?.skipAuthRedirect);
      if (!skipAuthRedirect) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        clearUserCache();
        window.location.href = '/login';
      }
    }
    
    // Trả về lỗi - ưu tiên chi tiết validation (data.errors) nếu có
    const data = error.response?.data;
    const validationErrors = data?.data;
    const errorMessage = data?.message || (validationErrors && typeof validationErrors === 'object'
      ? Object.values(validationErrors).join(', ')
      : null) || 'Có lỗi xảy ra, vui lòng thử lại';

    // Phát sự kiện toàn cục khi BE trả về lỗi giới hạn gói (safety net cho UI guards)
    const businessCode = data?.code;
    if (businessCode === 1066 || businessCode === 1056) {
      window.dispatchEvent(new CustomEvent('planUpgradeRequired', {
        detail: { message: data?.message, code: businessCode },
      }));
    }

    return Promise.reject({
      statusCode: error.response?.status,
      code: data?.code,
      message: errorMessage,
      data: data
    });
  }
);

export default api;
