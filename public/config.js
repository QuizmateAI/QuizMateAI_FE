// Runtime configuration injected at container start (envsubst replaces __VITE_*__ placeholders
// with real env-var values; see Dockerfile + entrypoint.sh in QuizMateAI_FE for the prod path).
//
// In Vite dev and direct (non-Docker) prod builds this file is served verbatim — the literal
// placeholder strings tell src/lib/runtimeConfig.js to fall back to import.meta.env.VITE_*, so
// .env / .env.production keep working unchanged.
window.__APP_CONFIG__ = {
  API_BASE_URL: "__VITE_API_BASE_URL__",
  WS_URL: "__VITE_WS_URL__",
  GOOGLE_CLIENT_ID: "__VITE_GOOGLE_CLIENT_ID__",
  SUPPORT_EMAIL: "__VITE_SUPPORT_EMAIL__",
  SITE_URL: "__VITE_SITE_URL__",
  LAUNCH_MODE: "__VITE_LAUNCH_MODE__",
};
