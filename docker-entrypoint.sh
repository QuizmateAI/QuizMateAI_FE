#!/bin/sh
# PR9: substitute VITE_* env vars into /usr/share/nginx/html/config.js at container start so a
# single FE image can be re-pointed at dev/staging/prod just by changing env vars. The template
# is /usr/share/nginx/html/config.js.template (copied during the Docker build); the rendered
# output replaces /usr/share/nginx/html/config.js. Runs as the standard nginx entrypoint hook
# (/docker-entrypoint.d/*.sh) so the actual `nginx -g 'daemon off;'` runs after we're done.
#
# Only env vars listed in CONFIG_VARS are substituted — every other $VAR in the template is
# left alone, so accidental shell interpolation is impossible.
#
# If a VITE_* env var is unset, envsubst leaves the placeholder verbatim and the FE's
# src/lib/runtimeConfig.js falls through to import.meta.env (i.e. the build-time value).

set -eu

TEMPLATE_PATH="/usr/share/nginx/html/config.js.template"
OUT_PATH="/usr/share/nginx/html/config.js"

if [ ! -f "$TEMPLATE_PATH" ]; then
    echo "[entrypoint] $TEMPLATE_PATH missing — skipping runtime substitution." >&2
    exit 0
fi

# Allowlist of env vars envsubst is allowed to substitute. KEEP IN SYNC with public/config.js.
# envsubst's -v flag flips it from "$ANY_VAR gets replaced" to "only these vars get replaced".
CONFIG_VARS='${VITE_API_BASE_URL} ${VITE_WS_URL} ${VITE_GOOGLE_CLIENT_ID} ${VITE_SUPPORT_EMAIL} ${VITE_SITE_URL} ${VITE_LAUNCH_MODE} ${VITE_DISABLE_V1_MIGRATION}'

# envsubst on alpine reads stdin → stdout; redirect explicitly. The template uses __VITE_*__
# placeholders, but envsubst replaces $VAR / ${VAR} forms only. So we first translate
# __VITE_FOO__ → ${VITE_FOO} on the fly via sed, then envsubst replaces those.
sed -E 's/__(VITE_[A-Z0-9_]+)__/${\1}/g' "$TEMPLATE_PATH" \
    | envsubst "$CONFIG_VARS" \
    > "$OUT_PATH"

echo "[entrypoint] /config.js rendered from template ($(wc -c < "$OUT_PATH") bytes)."
