import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logSwallowed } from '@/Utils/logSwallowed';

describe('logSwallowed', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns a function that accepts an error', () => {
    const handler = logSwallowed('test.ctx');
    expect(typeof handler).toBe('function');
    expect(() => handler(new Error('boom'))).not.toThrow();
  });

  it('warns with the given context label in dev mode', () => {
    const handler = logSwallowed('my.context');
    handler(new Error('sample'));
    if (import.meta.env.DEV) {
      expect(warnSpy).toHaveBeenCalledWith('[swallowed:my.context]', expect.any(Error));
    }
  });
});
