import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installV1RewriteInterceptor, rewriteToV1 } from '@/lib/v1Migration';

describe('rewriteToV1', () => {
  describe('pluralization (singular → plural)', () => {
    it('maps /quiz/... → /v1/quizzes/...', () => {
      expect(rewriteToV1('/quiz/create')).toBe('/v1/quizzes/create');
      expect(rewriteToV1('/quiz/42/full')).toBe('/v1/quizzes/42/full');
    });

    it('maps /workspace/... → /v1/workspaces/...', () => {
      expect(rewriteToV1('/workspace/42/access')).toBe('/v1/workspaces/42/access');
    });

    it('maps /group/... → /v1/groups/...', () => {
      expect(rewriteToV1('/group/42/announcements')).toBe('/v1/groups/42/announcements');
    });

    it('maps /user/... → /v1/users/... (and /user/welcome-back via root match)', () => {
      expect(rewriteToV1('/user/profile')).toBe('/v1/users/profile');
      expect(rewriteToV1('/user/welcome-back')).toBe('/v1/users/welcome-back');
    });

    it('maps /payment/... → /v1/payments/...', () => {
      expect(rewriteToV1('/payment/checkout')).toBe('/v1/payments/checkout');
    });

    it('maps /credit-wallet/... → /v1/credit-wallets/...', () => {
      expect(rewriteToV1('/credit-wallet/balance')).toBe('/v1/credit-wallets/balance');
    });

    it('maps /credit-package/... → /v1/credit-packages/...', () => {
      expect(rewriteToV1('/credit-package/active')).toBe('/v1/credit-packages/active');
    });

    it('maps /mocktest/... → /v1/mock-tests/... (also kebab fix)', () => {
      expect(rewriteToV1('/mocktest/templates')).toBe('/v1/mock-tests/templates');
    });

    it('maps /workspace-profile/... → /v1/workspace-profiles/...', () => {
      expect(rewriteToV1('/workspace-profile/individual/save'))
        .toBe('/v1/workspace-profiles/individual/save');
    });
  });

  describe('already-plural roots (just /v1/ prefix)', () => {
    it.each([
      ['/flashcards', '/v1/flashcards'],
      ['/flashcards/42', '/v1/flashcards/42'],
      ['/questions/import', '/v1/questions/import'],
      ['/answers/123', '/v1/answers/123'],
      ['/quiz-attempts/start/42', '/v1/quiz-attempts/start/42'],
      ['/quiz-sections/42', '/v1/quiz-sections/42'],
      ['/question-types', '/v1/question-types'],
      ['/materials/upload', '/v1/materials/upload'],
      ['/material-notes/42', '/v1/material-notes/42'],
      ['/files/upload', '/v1/files/upload'],
      ['/roadmaps/42', '/v1/roadmaps/42'],
      ['/notifications', '/v1/notifications'],
      ['/feedback', '/v1/feedback'],
      ['/policies/public/terms', '/v1/policies/public/terms'],
      ['/rbac/system/roles', '/v1/rbac/system/roles'],
      ['/community-quizzes/42', '/v1/community-quizzes/42'],
      ['/sub-topics', '/v1/sub-topics'],
      ['/system-settings', '/v1/system-settings'],
    ])('%s → %s', (legacy, v1) => {
      expect(rewriteToV1(legacy)).toBe(v1);
    });
  });

  describe('acronyms / gateway names (preserved verbatim under /v1/)', () => {
    it.each([
      ['/auth/login', '/v1/auth/login'],
      ['/ai/generate', '/v1/ai/generate'],
      ['/ai/study-profile', '/v1/ai/study-profile'],
      ['/momo/ipn', '/v1/momo/ipn'],
      ['/vnpay/return', '/v1/vnpay/return'],
      ['/stripe/webhook', '/v1/stripe/webhook'],
      ['/management/users', '/v1/management/users'],
    ])('%s → %s', (legacy, v1) => {
      expect(rewriteToV1(legacy)).toBe(v1);
    });
  });

  describe('bypass paths (left unchanged)', () => {
    it.each([
      '/v1/quizzes/42',           // already on v1
      '/v1/auth/login',
      '/actuator/health',          // BE actuator
      '/actuator/prometheus',
      '/ws-quiz',                  // WebSocket endpoint
      '/swagger-ui/index.html',
      '/v3/api-docs',
    ])('leaves %s unchanged', (path) => {
      expect(rewriteToV1(path)).toBe(path);
    });

    it('leaves absolute http(s) URLs unchanged', () => {
      expect(rewriteToV1('https://api.example.com/quiz/42'))
        .toBe('https://api.example.com/quiz/42');
      expect(rewriteToV1('http://localhost:8080/auth/login'))
        .toBe('http://localhost:8080/auth/login');
    });
  });

  describe('query string + hash preservation', () => {
    it('preserves query string', () => {
      expect(rewriteToV1('/quiz/all?page=0&size=20'))
        .toBe('/v1/quizzes/all?page=0&size=20');
      expect(rewriteToV1('/auth/check-username?username=foo'))
        .toBe('/v1/auth/check-username?username=foo');
    });

    it('preserves hash fragment', () => {
      expect(rewriteToV1('/quiz/42#section-3')).toBe('/v1/quizzes/42#section-3');
    });

    it('preserves both query and hash', () => {
      expect(rewriteToV1('/quiz/42?expand=full#bottom'))
        .toBe('/v1/quizzes/42?expand=full#bottom');
    });
  });

  describe('edge cases', () => {
    it.each(['', null, undefined, 0, false, {}, []])('returns %p unchanged', (input) => {
      expect(rewriteToV1(input)).toBe(input);
    });

    it('handles paths without leading slash by adding one', () => {
      expect(rewriteToV1('quiz/42')).toBe('/v1/quizzes/42');
    });

    it('does not pluralize first segment that lacks an explicit mapping', () => {
      expect(rewriteToV1('/some-unknown-root/foo')).toBe('/v1/some-unknown-root/foo');
    });
  });
});

describe('installV1RewriteInterceptor', () => {
  let interceptors;
  let fakeApi;
  let installedFulfilled;

  beforeEach(() => {
    installedFulfilled = null;
    interceptors = {
      request: {
        use: vi.fn((fulfilled) => {
          installedFulfilled = fulfilled;
          return 0; // eject id
        }),
      },
    };
    fakeApi = { interceptors };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers a request interceptor on the axios instance', () => {
    installV1RewriteInterceptor(fakeApi);
    expect(interceptors.request.use).toHaveBeenCalledTimes(1);
  });

  it('rewrites the config URL on each outgoing request', () => {
    installV1RewriteInterceptor(fakeApi);
    const out = installedFulfilled({ url: '/quiz/42/full' });
    expect(out.url).toBe('/v1/quizzes/42/full');
  });

  it('honors per-request skipV1Migration opt-out', () => {
    installV1RewriteInterceptor(fakeApi);
    const out = installedFulfilled({ url: '/quiz/42', skipV1Migration: true });
    expect(out.url).toBe('/quiz/42');
  });

  it('honors a global kill-switch via isEnabled override', () => {
    installV1RewriteInterceptor(fakeApi, { isEnabled: () => false });
    const out = installedFulfilled({ url: '/quiz/42' });
    expect(out.url).toBe('/quiz/42');
  });

  it('leaves config.url undefined if not a string', () => {
    installV1RewriteInterceptor(fakeApi);
    const out = installedFulfilled({});
    expect(out.url).toBeUndefined();
  });
});
