import { describe, it, expect } from 'vitest';
import {
  decodeAccessTokenClaims,
  getAccessTokenExpiry,
  getPermsFromAccessToken,
} from '@/utils/jwt';

function makeJwt(payload) {
  const base64 = (obj) => {
    const json = JSON.stringify(obj);
    return btoa(json)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };
  const header = base64({ alg: 'HS256', typ: 'JWT' });
  const body = base64(payload);
  return `${header}.${body}.fake-signature`;
}

describe('decodeAccessTokenClaims', () => {
  it('decodes a well-formed JWT payload', () => {
    const token = makeJwt({ sub: 'u@example.com', userId: 7, role: 'ADMIN', perms: ['user:read'] });
    const claims = decodeAccessTokenClaims(token);
    expect(claims).toEqual({ sub: 'u@example.com', userId: 7, role: 'ADMIN', perms: ['user:read'] });
  });

  it('decodes base64url with - and _ chars', () => {
    // Payload with chars that produce + and / in standard base64 → base64url uses - and _
    const token = makeJwt({ note: 'ab+cd/ef==', perms: ['payment:read'] });
    const claims = decodeAccessTokenClaims(token);
    expect(claims.note).toBe('ab+cd/ef==');
  });

  it('returns null for empty / non-string input', () => {
    expect(decodeAccessTokenClaims('')).toBe(null);
    expect(decodeAccessTokenClaims(null)).toBe(null);
    expect(decodeAccessTokenClaims(undefined)).toBe(null);
    expect(decodeAccessTokenClaims(123)).toBe(null);
  });

  it('returns null for malformed JWT (wrong segment count)', () => {
    expect(decodeAccessTokenClaims('only-one-segment')).toBe(null);
    expect(decodeAccessTokenClaims('two.segments')).toBe(null);
    expect(decodeAccessTokenClaims('a.b.c.d')).toBe(null);
  });

  it('returns null when payload is not valid base64 / JSON', () => {
    expect(decodeAccessTokenClaims('aa.notbase64$$.cc')).toBe(null);
  });
});

describe('getPermsFromAccessToken', () => {
  it('returns perms array when claim exists', () => {
    const token = makeJwt({ role: 'ADMIN', perms: ['user:create', 'payment:read'] });
    expect(getPermsFromAccessToken(token)).toEqual(['user:create', 'payment:read']);
  });

  it('returns null when perms claim missing (token version cũ)', () => {
    const token = makeJwt({ role: 'ADMIN' });
    expect(getPermsFromAccessToken(token)).toBe(null);
  });

  it('returns null when perms is not an array', () => {
    const token = makeJwt({ perms: 'user:read' });
    expect(getPermsFromAccessToken(token)).toBe(null);
  });

  it('returns empty array (not null) when perms is empty', () => {
    const token = makeJwt({ perms: [] });
    expect(getPermsFromAccessToken(token)).toEqual([]);
  });

  it('returns null for invalid token', () => {
    expect(getPermsFromAccessToken('garbage')).toBe(null);
    expect(getPermsFromAccessToken(null)).toBe(null);
  });
});

describe('getAccessTokenExpiry', () => {
  it('converts exp seconds to ms', () => {
    const token = makeJwt({ exp: 1700000000 });
    expect(getAccessTokenExpiry(token)).toBe(1700000000 * 1000);
  });

  it('returns null when exp missing', () => {
    const token = makeJwt({ sub: 'x' });
    expect(getAccessTokenExpiry(token)).toBe(null);
  });

  it('returns null for invalid token', () => {
    expect(getAccessTokenExpiry('')).toBe(null);
    expect(getAccessTokenExpiry('not.a.jwt')).toBe(null);
  });
});
