/**
 * JWT helpers — decode-only, NOT verify.
 *
 * Access token sau migration BE giờ embed claim `perms` (mảng permission code)
 * để FE toggle admin-panel UI mà không phải gọi extra endpoint. Theo BE doc:
 *
 *   ⚠️ Bảo mật: claim này INFORMATIONAL ONLY cho UX. Server vẫn re-check
 *   permission từ DB mỗi request. FE không được tin tưởng claim làm
 *   authorization quyết định cuối cùng.
 *
 * Vì vậy FE chỉ decode (atob payload), không verify chữ ký — server là chân lý.
 */

function base64UrlDecode(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

/**
 * Decode payload JWT. Trả về object nếu hợp lệ; null nếu token rỗng / sai
 * format / payload không phải JSON. Không throw — caller chỉ cần check null.
 */
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

/**
 * Trả về mảng permission codes từ claim `perms`, hoặc null nếu không có claim
 * (token version cũ, hoặc decode thất bại). Phân biệt null vs [] để caller
 * biết khi nào fallback sang API.
 */
export function getPermsFromAccessToken(token) {
  const claims = decodeAccessTokenClaims(token);
  if (!claims) return null;
  return Array.isArray(claims.perms) ? claims.perms : null;
}

/**
 * Trả về timestamp (ms) khi access token hết hạn, dùng để debug / log.
 * Null nếu không decode được hoặc claim thiếu `exp`.
 */
export function getAccessTokenExpiry(token) {
  const claims = decodeAccessTokenClaims(token);
  const exp = Number(claims?.exp);
  return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
}
