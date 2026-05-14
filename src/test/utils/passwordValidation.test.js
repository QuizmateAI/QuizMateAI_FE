import { describe, it, expect } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  isNewPasswordValid,
  validateNewPassword,
} from '@/utils/passwordValidation';

describe('validateNewPassword', () => {
  it('flags missing password', () => {
    expect(validateNewPassword('').code).toBe('REQUIRED');
    expect(validateNewPassword(null).code).toBe('REQUIRED');
    expect(validateNewPassword(undefined).code).toBe('REQUIRED');
  });

  it('flags shorter than min (8 chars now fails per BE bump)', () => {
    expect(validateNewPassword('Pass1234').code).toBe('TOO_SHORT'); // 8 chars
    expect(PASSWORD_MIN_LENGTH).toBe(9);
  });

  it('flags missing letter or digit', () => {
    expect(validateNewPassword('aaaaaaaaa').code).toBe('INVALID_FORMAT'); // 9 chars, no digit
    expect(validateNewPassword('111111111').code).toBe('INVALID_FORMAT'); // 9 chars, no letter
  });

  it('passes valid password (9+ chars, letter + digit)', () => {
    expect(validateNewPassword('Password1')).toBe(null);
    expect(validateNewPassword('LongerSecret123')).toBe(null);
  });

  it('isNewPasswordValid convenience helper', () => {
    expect(isNewPasswordValid('Password1')).toBe(true);
    expect(isNewPasswordValid('weak')).toBe(false);
  });

  it('attaches i18n messageKey + fallback for each error code', () => {
    const short = validateNewPassword('a1');
    expect(short.messageKey).toBe('validation.passwordLength');
    expect(short.fallback).toMatch(/8 ký tự/);

    const format = validateNewPassword('aaaaaaaaa');
    expect(format.messageKey).toBe('validation.passwordFormat');
    expect(format.fallback).toMatch(/chữ và số/);
  });
});
