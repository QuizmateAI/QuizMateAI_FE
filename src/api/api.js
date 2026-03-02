import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
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
      // Có thể redirect về trang login ở đây
      window.location.href = '/login';
    }
    
    // Trả về lỗi với message từ server hoặc message mặc định
    const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
    return Promise.reject({
      statusCode: error.response?.status,
      message: errorMessage,
      data: error.response?.data
    });
  }
);

export default api;
