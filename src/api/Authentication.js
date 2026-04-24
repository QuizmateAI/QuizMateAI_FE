import api from './api';
import { setCachedProfile, setCachedSubscription, clearUserCache } from '@/Utils/userCache';
import { normalizeUserProfile } from '@/Utils/userProfile';
import { queryClient } from '@/queryClient';
import { clearPlanPurchaseState } from '@/Utils/planPurchaseState';

// ======================= AUTH API SERVICES =======================

// Auth requests in production may wait on DB, OAuth, or email providers longer
// than the generic client timeout used for the rest of the app.
const AUTH_REQUEST_TIMEOUT_MS = 30000;

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
  const response = await api.post('/auth/register', userData, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });
  return response;
};

/**
 * Lưu profile + subscription + groups từ login response vào cache (chuyển tab instant)
 */
function saveLoginDataToCache(data) {
  clearPlanPurchaseState();
  if (data?.user) {
    const profile = normalizeUserProfile(data.user, data);
    setCachedProfile(profile);
  }
  setCachedSubscription(data?.subscription ?? null);
  // Groups từ login → React Query cache → tab Nhóm load instant (<1s)
  if (Array.isArray(data?.groups) && data.groups.length >= 0) {
    queryClient.setQueryData(['groups'], data.groups);
  }
  // Đảm bảo mọi query còn lại trong cache (nếu có từ session cũ) được refetch
  // với token mới → tránh tình trạng user phải reload trang sau khi login.
  queryClient.invalidateQueries();
}

function notifyAuthChanged(type) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('auth:changed', {
    detail: {
      type,
      at: Date.now(),
    },
  }));
}

function clearAuthState() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  clearUserCache();
  clearPlanPurchaseState();
  queryClient.clear();
}

/**
 * Đăng nhập tài khoản
 * @param {Object} credentials - Thông tin đăng nhập
 * @param {string} credentials.username - Tên đăng nhập
 * @param {string} credentials.password - Mật khẩu
 * @returns {Promise} Response chứa token và thông tin user
 */
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });

  // Lưu token và thông tin user vào localStorage nếu đăng nhập thành công
  if (response.statusCode === 200 || response.statusCode === 0) {
    const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify({ userID, username, role, email, authProvider }));
    // Cache profile + subscription từ BE (lần load sau chỉ verify token)
    saveLoginDataToCache(response.data);
    notifyAuthChanged('login');
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
  const response = await api.post('/auth/google-login', { idToken }, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });

  // Lưu token và thông tin user vào localStorage nếu đăng nhập thành công
  if (response.statusCode === 200 || response.statusCode === 0) {
    const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify({ userID, username, role, email, authProvider }));
    saveLoginDataToCache(response.data);
    notifyAuthChanged('login');
  }

  return response;
};

/**
 * Gửi mã OTP đến email
 * @param {string} email - Email nhận OTP
 * @returns {Promise} Response xác nhận gửi OTP
 */
export const sendOTP = async (email) => {
  const response = await api.post(`/auth/send-otp?email=${encodeURIComponent(email)}`, undefined, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });
  return response;
};

const OTP_FAILURE_MESSAGE_PATTERNS = [
  /khong hop le/i,
  /không hợp lệ/i,
  /invalid/i,
  /khong dung/i,
  /không đúng/i,
  /incorrect/i,
  /het han/i,
  /hết hạn/i,
  /expired/i,
  /that bai/i,
  /thất bại/i,
  /fail/i,
];

const isOtpVerifySuccess = (response) => {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const hasSuccessStatus = response.statusCode === 200 || response.statusCode === 0;
  if (!hasSuccessStatus) {
    return false;
  }

  const payload = response.data;
  if (typeof payload === 'boolean' && payload === false) {
    return false;
  }

  if (payload && typeof payload === 'object') {
    if (payload.success === false || payload.valid === false || payload.isValid === false) {
      return false;
    }
  }

  const message = typeof response.message === 'string' ? response.message.trim() : '';
  if (message && OTP_FAILURE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
    return false;
  }

  return true;
};

/**
 * Xác thực mã OTP
 * @param {string} email - Email đã nhận OTP
 * @param {string} otp - Mã OTP để xác thực
 * @returns {Promise} Response xác nhận OTP hợp lệ
 */
export const verifyOTP = async (email, otp) => {
  const response = await api.post(
    `/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
    undefined,
    {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    },
  );

  if (!isOtpVerifySuccess(response)) {
    const fallbackMessage = 'Xác thực OTP thất bại, mã không đúng hoặc đã hết hạn';
    throw {
      statusCode: response?.statusCode ?? 400,
      code: response?.code,
      message: response?.message || fallbackMessage,
      data: response,
    };
  }

  return response;
};

/**
 * Đổi mật khẩu mới
 * @param {string} email - Email tài khoản
 * @param {string} newPassword - Mật khẩu mới
 * @returns {Promise} Response xác nhận đổi mật khẩu thành công
 */
export const resetPassword = async (email, newPassword) => {
  const response = await api.post(
    `/auth/reset-password?email=${encodeURIComponent(email)}&newPassword=${encodeURIComponent(newPassword)}`,
    undefined,
    {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    },
  );
  return response;
};

/**
 * Đăng xuất - Xóa token, thông tin user và cache khỏi localStorage
 */
export const logout = () => {
  const token = localStorage.getItem('accessToken');

  // Dọn local state ngay để UI chuyển trạng thái tức thì.
  clearAuthState();
  notifyAuthChanged('logout');

  // Gọi BE logout song song để revoke token phía server.
  if (token) {
    void api.post('/auth/logout', null, {
      skipAuthRedirect: true,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {
      // Không block UX khi request logout thất bại.
    });
  }
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
