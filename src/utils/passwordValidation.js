export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{9,}$/;

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return {
      code: 'REQUIRED',
      messageKey: 'validation.passwordRequired',
      fallback: 'Mật khẩu bắt buộc',
    };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      code: 'TOO_SHORT',
      messageKey: 'validation.passwordLength',
      fallback: 'Mật khẩu phải nhiều hơn 8 ký tự',
    };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      code: 'INVALID_FORMAT',
      messageKey: 'validation.passwordFormat',
      fallback: 'Mật khẩu phải chứa cả chữ và số',
    };
  }
  return null;
}

export function isNewPasswordValid(password) {
  return validateNewPassword(password) === null;
}
