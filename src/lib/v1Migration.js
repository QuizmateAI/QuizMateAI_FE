const PLURAL_MAP = Object.freeze({
  quiz: "quizzes",
  workspace: "workspaces",
  "workspace-profile": "workspace-profiles",
  group: "groups",
  user: "users",
  payment: "payments",
  "credit-wallet": "credit-wallets",
  "credit-package": "credit-packages",
  mocktest: "mock-tests",
});

// Paths that bypass the rewrite entirely.
const BYPASS_PREFIXES = Object.freeze([
  "/v1/",        // already on the v1 surface
  "/actuator/",  // Spring Boot actuator — same path on both surfaces
  "/ws-quiz",    // WebSocket endpoint
  "/swagger-ui", // not called from JS but defensive
  "/v3/api-docs",
]);

function isAbsoluteUrl(s) {
  return /^https?:\/\//i.test(s);
}

export function rewriteToV1(path) {
  if (typeof path !== "string" || path.length === 0) return path;
  if (isAbsoluteUrl(path)) return path;

  // /actuator/health, /v1/..., /ws-quiz, etc. — leave alone.
  for (const bypass of BYPASS_PREFIXES) {
    if (path.startsWith(bypass) || path === bypass.replace(/\/$/, "")) {
      return path;
    }
  }

  // Split path | query | hash so the rewrite only touches the path portion.
  const hashIdx = path.indexOf("#");
  const hash = hashIdx === -1 ? "" : path.slice(hashIdx);
  const pathAndQuery = hashIdx === -1 ? path : path.slice(0, hashIdx);
  const queryIdx = pathAndQuery.indexOf("?");
  const query = queryIdx === -1 ? "" : pathAndQuery.slice(queryIdx);
  const pathOnly = queryIdx === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIdx);

  const leadingSlash = pathOnly.startsWith("/");
  const stripped = leadingSlash ? pathOnly.slice(1) : pathOnly;
  if (stripped.length === 0) return path;

  // Extract first segment.
  const nextSlash = stripped.indexOf("/");
  const firstSeg = nextSlash === -1 ? stripped : stripped.slice(0, nextSlash);
  const rest = nextSlash === -1 ? "" : stripped.slice(nextSlash);

  const pluralized = PLURAL_MAP[firstSeg] || firstSeg;
  const rewritten = `/v1/${pluralized}${rest}${query}${hash}`;
  return rewritten;
}

function readKillSwitch() {
  try {
    if (typeof window !== "undefined" && window.__APP_CONFIG__) {
      const v = window.__APP_CONFIG__.DISABLE_V1_MIGRATION;
      if (typeof v === "string" && v.trim().toLowerCase() === "true") return true;
    }
  } catch {
    /* SSR / no window */
  }
  try {
    const v = import.meta.env.VITE_DISABLE_V1_MIGRATION;
    if (typeof v === "string" && v.trim().toLowerCase() === "true") return true;
  } catch {
    /* defensive */
  }
  return false;
}

export function installV1RewriteInterceptor(api, { isEnabled = () => !readKillSwitch() } = {}) {
  return api.interceptors.request.use((config) => {
    if (!isEnabled()) return config;
    if (config?.skipV1Migration) return config;
    if (typeof config?.url === "string") {
      config.url = rewriteToV1(config.url);
    }
    return config;
  });
}
