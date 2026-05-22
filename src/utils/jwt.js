function base64UrlDecode(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

export function decodeAccessTokenClaims(token) {
  if (typeof token !== 'string' || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getPermsFromAccessToken(token) {
  const claims = decodeAccessTokenClaims(token);
  if (!claims) return null;
  return Array.isArray(claims.perms) ? claims.perms : null;
}

export function getAccessTokenExpiry(token) {
  const claims = decodeAccessTokenClaims(token);
  const exp = Number(claims?.exp);
  return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
}
