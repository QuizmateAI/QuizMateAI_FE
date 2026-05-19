import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as runtimeConfig from '@/lib/runtimeConfig';

/**
 * PR9 smoke-test revealed that envsubst leaves unset env vars as ${VITE_FOO} (not
 * __VITE_FOO__), so the placeholder detector must recognize BOTH forms and fall through to
 * import.meta.env. These tests focus on the runtime → build-time fallthrough contract.
 *
 * import.meta.env can't be easily stubbed in vitest, so we test placeholder detection by
 * checking that runtime placeholder values do NOT win over the hardcoded fallback used by
 * getSupportEmail (the only reader whose fallback isn't environment-dependent).
 */

const ORIGINAL_CONFIG = globalThis.window?.__APP_CONFIG__;

function setConfig(values) {
  globalThis.window.__APP_CONFIG__ = values;
}

describe('runtimeConfig placeholder handling', () => {
  beforeEach(() => {
    if (typeof globalThis.window === 'undefined') globalThis.window = {};
  });

  afterEach(() => {
    globalThis.window.__APP_CONFIG__ = ORIGINAL_CONFIG;
    vi.restoreAllMocks();
  });

  it('treats __VITE_FOO__ form as unsubstituted', () => {
    // getSupportEmail's last-resort fallback is the hardcoded "support@quizmateai.io.vn",
    // independent of import.meta.env. If the placeholder were treated as a real value, the
    // function would return the literal "__VITE_SUPPORT_EMAIL__" string instead.
    setConfig({ SUPPORT_EMAIL: '__VITE_SUPPORT_EMAIL__' });
    expect(runtimeConfig.getSupportEmail()).toBe('support@quizmateai.io.vn');
  });

  it('treats ${VITE_FOO} form as unsubstituted (envsubst-from-unset)', () => {
    setConfig({ SUPPORT_EMAIL: '${VITE_SUPPORT_EMAIL}' });
    expect(runtimeConfig.getSupportEmail()).toBe('support@quizmateai.io.vn');
  });

  it('uses a substituted runtime value verbatim', () => {
    setConfig({ SUPPORT_EMAIL: 'hello@example.com' });
    expect(runtimeConfig.getSupportEmail()).toBe('hello@example.com');
  });

  it('trims whitespace around runtime values', () => {
    setConfig({ SUPPORT_EMAIL: '   hello@example.com   ' });
    expect(runtimeConfig.getSupportEmail()).toBe('hello@example.com');
  });

  it('does not crash when window.__APP_CONFIG__ is undefined', () => {
    setConfig(undefined);
    // Build-time / fallback should still produce a value (or empty string, never throw).
    expect(() => runtimeConfig.getSupportEmail()).not.toThrow();
    expect(() => runtimeConfig.getApiBaseUrl()).not.toThrow();
    expect(() => runtimeConfig.getWebSocketUrl()).not.toThrow();
    expect(() => runtimeConfig.getGoogleClientId()).not.toThrow();
  });

  it('exposes a diagnostic snapshot', () => {
    setConfig({ SUPPORT_EMAIL: 'hello@example.com' });
    const snap = runtimeConfig.getRuntimeConfigSnapshot();
    expect(snap).toEqual(expect.objectContaining({
      supportEmail: 'hello@example.com',
      apiBaseUrl: expect.any(String),
      wsUrl: expect.any(String),
      devMode: expect.any(Boolean),
    }));
  });

  it('only treats well-formed envsubst placeholders as placeholders', () => {
    // "${VITE}" without the trailing identifier and "FOO__" without the leading "__VITE_" are
    // real values, not placeholders. Defensive: a misconfigured envsubst should not silently
    // swallow legitimate-looking config strings.
    setConfig({ SUPPORT_EMAIL: '${VITE}' });
    expect(runtimeConfig.getSupportEmail()).toBe('${VITE}');

    setConfig({ SUPPORT_EMAIL: 'FOO__' });
    expect(runtimeConfig.getSupportEmail()).toBe('FOO__');
  });
});
