import axios from 'axios';
import { clearUserCache } from '@/Utils/userCache';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.quizmateai.io.vn';
const isNgrokUrl = /ngrok-free\.(app|dev)/i.test(baseURL);

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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      clearUserCache();
      window.location.href = '/login';
    }
    
    // Trả về lỗi - ưu tiên chi tiết validation (data.errors) nếu có
    const data = error.response?.data;
    const validationErrors = data?.data;
    const errorMessage = data?.message || (validationErrors && typeof validationErrors === 'object'
      ? Object.values(validationErrors).join(', ')
      : null) || 'Có lỗi xảy ra, vui lòng thử lại';
    return Promise.reject({
      statusCode: error.response?.status,
      code: data?.code,
      message: errorMessage,
      data: data
    });
  }
);

export default api;
