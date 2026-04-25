import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  setAccessToken,
  clearTokens,
  hasAccessToken,
  TOKEN_KEYS,
} from '@/Utils/tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reads the canonical accessToken key first', () => {
    window.localStorage.setItem(TOKEN_KEYS.ACCESS, 'primary');
    window.localStorage.setItem('jwt_token', 'legacy');
    expect(getAccessToken()).toBe('primary');
  });

  it('falls back to legacy keys when primary absent', () => {
    window.localStorage.setItem('jwt_token', 'legacy');
    expect(getAccessToken()).toBe('legacy');
    window.localStorage.clear();
    window.localStorage.setItem('token', 'old-key');
    expect(getAccessToken()).toBe('old-key');
  });

  it('returns empty string when no token', () => {
    expect(getAccessToken()).toBe('');
    expect(hasAccessToken()).toBe(false);
  });

  it('setTokens writes both access and refresh', () => {
    setTokens({ accessToken: 'a', refreshToken: 'r' });
    expect(getAccessToken()).toBe('a');
    expect(getRefreshToken()).toBe('r');
  });

  it('setTokens ignores missing fields', () => {
    setAccessToken('a');
    setTokens({ refreshToken: 'r' });
    expect(getAccessToken()).toBe('a');
    expect(getRefreshToken()).toBe('r');
  });

  it('clearTokens wipes primary and legacy keys', () => {
    window.localStorage.setItem(TOKEN_KEYS.ACCESS, 'a');
    window.localStorage.setItem(TOKEN_KEYS.REFRESH, 'r');
    window.localStorage.setItem('jwt_token', 'legacy');
    window.localStorage.setItem('token', 'old');
    clearTokens();
    expect(window.localStorage.getItem(TOKEN_KEYS.ACCESS)).toBeNull();
    expect(window.localStorage.getItem(TOKEN_KEYS.REFRESH)).toBeNull();
    expect(window.localStorage.getItem('jwt_token')).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  it('hasAccessToken is true when any form exists', () => {
    window.localStorage.setItem('jwt_token', 'legacy');
    expect(hasAccessToken()).toBe(true);
  });
});
