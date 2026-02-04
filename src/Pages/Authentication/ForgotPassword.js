// Xác thực định dạng email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Kiểm tra email rỗng
export const isEmailEmpty = (email) => {
  return !email || email.trim() === '';
};

// Xác thực email với nhiều quy tắc
export const validateForgotPasswordForm = (email) => {
  const errors = {};

  // Kiểm tra email rỗng
  if (isEmailEmpty(email)) {
    errors.email = 'Email là bắt buộc';
  } else if (!validateEmail(email)) {
    // Kiểm tra định dạng email
    errors.email = 'Vui lòng nhập email hợp lệ (ví dụ: user@domain.com)';
  } else if (email.length > 100) {
    // Kiểm tra độ dài email
    errors.email = 'Email không được vượt quá 100 ký tự';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Gửi yêu cầu đặt lại mật khẩu (giả lập API)
export const submitForgotPasswordRequest = async (email) => {
  try {
    // Gọi API đặt lại mật khẩu
    // const response = await api.post('/auth/forgot-password', { email });
    // return response.data;
    
    // Giả lập phản hồi từ server
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Email xác nhận được gửi. Vui lòng kiểm tra hộp thư của bạn.'
        });
      }, 1000);
    });
  } catch (error) {
    throw {
      success: false,
      message: error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.'
    };
  }
};
