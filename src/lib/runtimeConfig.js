/**
 * Single source of truth for all environment-derived configuration values.
 *
 * Two-tier lookup:
 *   1. window.__APP_CONFIG__ (populated by public/config.js at container start via envsubst).
 *      This is what makes the FE redeployable across dev/staging/prod without rebuilding the
 *      JS bundle — a Docker image baked for staging can be re-pointed at prod just by setting
 *      different env vars on the container.
 *   2. import.meta.env.VITE_* (build-time injection). Used in Vite dev server and for direct
 *      prod builds that do not go through the envsubst entrypoint.
 *
 * A placeholder value still containing the literal "__VITE_" marker is treated as "not
 * substituted" and falls through to import.meta.env so the dev experience is identical
 * regardless of whether public/config.js was processed.
 */

// Two placeholder forms get treated as "not substituted, fall through to build-time":
//   1. __VITE_FOO__   — the raw form public/config.js ships with (before envsubst).
//   2. ${VITE_FOO}    — what envsubst leaves behind when an env var is unset (PR9).
function isPlaceholder(v) {
  return v.startsWith("__VITE_") || /^\$\{VITE_[A-Z0-9_]+\}$/.test(v);
}

function readRuntime(key) {
  if (typeof window === "undefined") return "";
  const cfg = window.__APP_CONFIG__;
  if (!cfg) return "";
  const v = cfg[key];
  if (typeof v !== "string") return "";
  if (isPlaceholder(v)) return "";
  return v.trim();
}

function readBuild(envKey) {
  const v = import.meta.env[envKey];
  return typeof v === "string" ? v.trim() : "";
}

function read(key, envKey) {
  return readRuntime(key) || readBuild(envKey);
}

/**
 * Base URL the axios instance points at. In Vite dev mode we always return "/api" so the
 * dev-server proxy (vite.config.js) handles forwarding. In any other mode we use the
 * runtime/build value if present, falling back to a relative "/api" so a same-origin nginx
 * deploy works out of the box.
 */
export function getApiBaseUrl() {
  if (import.meta.env.DEV) return "/api";
  return read("API_BASE_URL", "VITE_API_BASE_URL") || "/api";
}

/**
 * WebSocket endpoint. Explicit VITE_WS_URL wins; otherwise derive from API base by stripping
 * the trailing "/api" and appending "/ws-quiz".
 */
export function getWebSocketUrl() {
  const explicit = read("WS_URL", "VITE_WS_URL");
  if (explicit) return explicit;

  const apiBase = read("API_BASE_URL", "VITE_API_BASE_URL");
  if (apiBase) {
    try {
      const parsed = new URL(apiBase);
      const path = parsed.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
      return `${parsed.origin}${path}/ws-quiz`;
    } catch {
      /* fall through */
    }
  }
  return "/ws-quiz";
}

export function getGoogleClientId() {
  return read("GOOGLE_CLIENT_ID", "VITE_GOOGLE_CLIENT_ID");
}

export function getSupportEmail() {
  return read("SUPPORT_EMAIL", "VITE_SUPPORT_EMAIL") || "support@quizmateai.io.vn";
}

export function getSiteUrl() {
  return read("SITE_URL", "VITE_SITE_URL");
}

export function getLaunchMode() {
  return read("LAUNCH_MODE", "VITE_LAUNCH_MODE");
}

/**
 * Raw config snapshot (mainly for diagnostics — eg surfacing in an admin "system info" panel).
 * Does NOT include secrets; every value here is by definition public to the browser.
 */
export function getRuntimeConfigSnapshot() {
  return {
    apiBaseUrl: getApiBaseUrl(),
    wsUrl: getWebSocketUrl(),
    googleClientId: getGoogleClientId(),
    supportEmail: getSupportEmail(),
    siteUrl: getSiteUrl(),
    launchMode: getLaunchMode(),
    devMode: !!import.meta.env.DEV,
  };
}
