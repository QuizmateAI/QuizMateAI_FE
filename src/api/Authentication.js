import api from './api';
import { setCachedProfile, setCachedSubscription, clearUserCache } from '@/Utils/userCache';
import { queryClient } from '@/queryClient';

// ======================= AUTH API SERVICES =======================

/**
 * Đăng ký tài khoản mới
 * @param {Object} userData - Thông tin đăng ký
 * @param {string} userData.fullname - Họ tên đầy đủ
 * @param {string} userData.username - Tên đăng nhập
 * @param {string} userData.password - Mật khẩu
 * @param {string} userData.confirmPassword - Xác nhận mật khẩu
 * @param {string} userData.email - Email
 * @returns {Promise} Response từ server
 */
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response;
};

/**
 * Lưu profile + subscription + groups từ login response vào cache (chuyển tab instant)
 */
function saveLoginDataToCache(data) {
  if (data?.user) {
    const profile = {
      email: data.user.email || data.email || '',
      username: data.user.username || data.username || '',
      fullName: data.user.fullName || data.user.username || '',
      avatarUrl: data.user.avatar || data.user.avatarUrl || '',
      birthday: data.user.birthday || null,
    };
    setCachedProfile(profile);
  }
  if (data?.subscription != null) {
    setCachedSubscription(data.subscription);
  }
  // Groups từ login → React Query cache → tab Nhóm load instant (<1s)
  if (Array.isArray(data?.groups) && data.groups.length >= 0) {
    queryClient.setQueryData(['groups'], data.groups);
  }
}

/**
 * Đăng nhập tài khoản
 * @param {Object} credentials - Thông tin đăng nhập
 * @param {string} credentials.username - Tên đăng nhập
 * @param {string} credentials.password - Mật khẩu
 * @returns {Promise} Response chứa token và thông tin user
 */
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);

  // Lưu token và thông tin user vào localStorage nếu đăng nhập thành công
  if (response.statusCode === 200 || response.statusCode === 0) {
    const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify({ userID, username, role, email, authProvider }));
    // Cache profile + subscription từ BE (lần load sau chỉ verify token)
    saveLoginDataToCache(response.data);
  }

  return response;
};

/**
 * Kiểm tra username có khả dụng không
 * @param {string} username - Tên đăng nhập cần kiểm tra
 * @returns {Promise} Response chứa trạng thái khả dụng
 */
export const checkUsername = async (username) => {
  const response = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
  return response;
};

/**
 * Kiểm tra email có khả dụng không
 * @param {string} email - Email cần kiểm tra
 * @returns {Promise} Response chứa trạng thái khả dụng
 */
export const checkEmail = async (email) => {
  const response = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
  return response;
};

/**
 * Đăng nhập bằng Google
 * @param {string} idToken - Google Credential/Access Token
 * @returns {Promise} Response chứa token và thông tin user
 */
export const googleLogin = async (idToken) => {
  const response = await api.post('/auth/google-login', { idToken });

  // Lưu token và thông tin user vào localStorage nếu đăng nhập thành công
  if (response.statusCode === 200 || response.statusCode === 0) {
    const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify({ userID, username, role, email, authProvider }));
    saveLoginDataToCache(response.data);
  }

  return response;
};

/**
 * Gửi mã OTP đến email
 * @param {string} email - Email nhận OTP
 * @returns {Promise} Response xác nhận gửi OTP
 */
export const sendOTP = async (email) => {
  const response = await api.post(`/auth/send-otp?email=${encodeURIComponent(email)}`);
  return response;
};

/**
 * Xác thực mã OTP
 * @param {string} email - Email đã nhận OTP
 * @param {string} otp - Mã OTP để xác thực
 * @returns {Promise} Response xác nhận OTP hợp lệ
 */
export const verifyOTP = async (email, otp) => {
  const response = await api.post(`/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
  return response;
};

/**
 * Đổi mật khẩu mới
 * @param {string} email - Email tài khoản
 * @param {string} newPassword - Mật khẩu mới
 * @returns {Promise} Response xác nhận đổi mật khẩu thành công
 */
export const resetPassword = async (email, newPassword) => {
  const response = await api.post(`/auth/reset-password?email=${encodeURIComponent(email)}&newPassword=${encodeURIComponent(newPassword)}`);
  return response;
};

/**
 * Đăng xuất - Xóa token, thông tin user và cache khỏi localStorage
 */
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  clearUserCache();
};

/**
 * Lấy thông tin user hiện tại từ localStorage
 * @returns {Object|null} Thông tin user hoặc null nếu chưa đăng nhập
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Kiểm tra user đã đăng nhập chưa
 * @returns {boolean} true nếu đã đăng nhập
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};
