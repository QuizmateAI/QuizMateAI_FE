/**
 * PR8: transparently rewrites every legacy /<root>/... request URL emitted by the shared axios
 * instance to its /v1/... mirror. The BE serves both prefixes during the migration window
 * (see PR5a-d in docs/api-migration-plan.md in the QuizMateAI root repo), so this rewrite is
 * purely how the FE STARTS using the v1 surface without touching 31 service files.
 *
 * <p>Behavior:
 * <ul>
 *   <li>Leaves absolute URLs (http/https), {@code /v1/...} paths, {@code /actuator/...} paths,
 *       and {@code /ws-quiz} alone — only legacy {@code /<root>/...} request paths get rewritten.</li>
 *   <li>Pluralizes singular roots per the BE dual-mapping table (eg /quiz → /v1/quizzes).</li>
 *   <li>For already-plural roots, just prepends /v1/ (eg /flashcards → /v1/flashcards).</li>
 *   <li>Preserves query string + hash verbatim.</li>
 *   <li>Opt-out per request via axios config flag {@code skipV1Migration: true} for callers that
 *       MUST target a legacy URL (eg health checks, ad-hoc admin tools).</li>
 *   <li>Global kill-switch via the {@code VITE_DISABLE_V1_MIGRATION} env (or
 *       window.__APP_CONFIG__.DISABLE_V1_MIGRATION === "true") so a deploy can roll back without
 *       a redeploy if /api/v1 ever regresses.</li>
 * </ul>
 *
 * <p>This module exports both the rewrite function and an axios interceptor installer so the
 * logic can be unit-tested in isolation.
 */

// Singular → plural mapping per the BE dual-mapping table. Acronyms and gateway names
// (ai, momo, vnpay, stripe, rbac) deliberately omitted — they keep their legacy spelling at v1.
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

/**
 * Rewrites a single relative request path to its v1 form. Returns the input unchanged when no
 * rewrite applies. Pure function — safe to call from any context.
 */
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

/**
 * Installs the v1 rewrite as the FIRST request interceptor on the supplied axios instance so
 * later interceptors see the already-rewritten URL. Returns the eject id so tests can detach.
 */
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
