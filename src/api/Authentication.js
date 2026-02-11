import api from './api';

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
  try {
    const response = await api.post('/auth/register', userData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Đăng nhập tài khoản
 * @param {Object} credentials - Thông tin đăng nhập
 * @param {string} credentials.username - Tên đăng nhập
 * @param {string} credentials.password - Mật khẩu
 * @returns {Promise} Response chứa token và thông tin user
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    
    // Lưu token và thông tin user vào localStorage nếu đăng nhập thành công
    if (response.statusCode === 200 || response.statusCode === 0) {
      const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify({ userID, username, role, email, authProvider }));
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Kiểm tra username có khả dụng không
 * @param {string} username - Tên đăng nhập cần kiểm tra
 * @returns {Promise} Response chứa trạng thái khả dụng
 */
export const checkUsername = async (username) => {
  try {
    const response = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Đăng nhập bằng Google
 * @param {string} idToken - ID Token từ Google OAuth
 * @returns {Promise} Response chứa token và thông tin user
 */
export const googleLogin = async (idToken) => {
  try {
    const response = await api.post('/auth/google-login', { idToken });
    
    // Lưu token và thông tin user vào localStorage nếu đăng nhập thành công
    if (response.statusCode === 200 || response.statusCode === 0) {
      const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify({ userID, username, role, email, authProvider }));
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Gửi mã OTP đến email
 * @param {string} email - Email nhận OTP
 * @returns {Promise} Response xác nhận gửi OTP
 */
export const sendOTP = async (email) => {
  try {
    const response = await api.post(`/auth/send-otp?email=${encodeURIComponent(email)}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Xác thực mã OTP
 * @param {string} email - Email đã nhận OTP
 * @param {string} otp - Mã OTP để xác thực
 * @returns {Promise} Response xác nhận OTP hợp lệ
 */
export const verifyOTP = async (email, otp) => {
  try {
    const response = await api.post(`/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Đổi mật khẩu mới
 * @param {string} email - Email tài khoản
 * @param {string} newPassword - Mật khẩu mới
 * @returns {Promise} Response xác nhận đổi mật khẩu thành công
 */
export const resetPassword = async (email, newPassword) => {
  try {
    const response = await api.post(`/auth/reset-password?email=${encodeURIComponent(email)}&newPassword=${encodeURIComponent(newPassword)}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Đăng xuất - Xóa token và thông tin user khỏi localStorage
 */
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
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
