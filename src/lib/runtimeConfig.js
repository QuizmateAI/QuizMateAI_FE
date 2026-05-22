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

export function getApiBaseUrl() {
  if (import.meta.env.DEV) return "/api";
  return read("API_BASE_URL", "VITE_API_BASE_URL") || "/api";
}

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
