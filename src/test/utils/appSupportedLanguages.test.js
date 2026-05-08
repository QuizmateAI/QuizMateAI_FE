import { describe, expect, it } from 'vitest';
import {
  APP_SUPPORTED_LANGUAGES,
  appLanguageShortLabel,
  cycleAppLanguage,
  getAppNumberLocale,
  getBaseAppLanguage,
} from '@/utils/appSupportedLanguages';

describe('appSupportedLanguages', () => {
  it('normalizes regional tags', () => {
    expect(getBaseAppLanguage('en-US')).toBe('en');
    expect(getBaseAppLanguage('ja-JP')).toBe('ja');
  });

  it('falls back to vi for unknown codes', () => {
    expect(getBaseAppLanguage('de')).toBe('vi');
  });

  it('cycles vi -> en -> ja -> vi', () => {
    expect(cycleAppLanguage('vi')).toBe('en');
    expect(cycleAppLanguage('en')).toBe('ja');
    expect(cycleAppLanguage('ja')).toBe('vi');
  });

  it('exposes a frozen supported list', () => {
    expect(APP_SUPPORTED_LANGUAGES).toEqual(['vi', 'en', 'ja']);
    expect(() => {
      APP_SUPPORTED_LANGUAGES[0] = 'xx';
    }).toThrow();
  });

  it('maps number locales', () => {
    expect(getAppNumberLocale('vi')).toBe('vi-VN');
    expect(getAppNumberLocale('ja')).toBe('ja-JP');
    expect(getAppNumberLocale('en')).toBe('en-US');
  });

  it('short label uppercases base code', () => {
    expect(appLanguageShortLabel('ja')).toBe('JA');
  });
});
