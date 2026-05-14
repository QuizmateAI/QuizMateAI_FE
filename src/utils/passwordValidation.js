/**
 * Shared password validation rules — khớp BE constraint:
 *
 *   - min 9 ký tự ("Mật khẩu phải nhiều hơn 8 ký tự")
 *   - chứa cả chữ và số
 *
 * Áp dụng cho: Register, ForgotPassword reset, ChangePassword (profile +
 * super-admin), AdminCreate. Trước đây mỗi form check riêng (min 6 hoặc 8)
 * — không khớp BE → 400 lác đác. Hợp nhất 1 chỗ để khỏi drift.
 */

export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{9,}$/;

/**
 * Trả về { code, messageKey, fallback } nếu invalid, hoặc null nếu OK.
 * `messageKey` để i18n; `fallback` là tiếng Việt sẵn sàng show.
 */
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
