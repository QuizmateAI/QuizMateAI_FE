# PR9: Multi-stage build for the FE. Stage 1 produces the Vite bundle; stage 2 serves it via
# nginx with an entrypoint that substitutes runtime env vars into /usr/share/nginx/html/config.js
# (PR7 contract). One image can be re-pointed at dev/staging/prod by changing env vars on the
# container — no rebuild.

# ===== Stage 1: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first to leverage cache when only source files change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Then copy source and build. Vite reads .env at build time, but the values it inlines are
# overridden at runtime by /config.js (see src/lib/runtimeConfig.js).
COPY . .
RUN npm run build

# ===== Stage 2: Runtime =====
FROM nginx:1.27-alpine

# envsubst lives in gettext on alpine. The base nginx image already ships with `envsubst`, but
# be explicit so an unexpected base swap doesn't silently break the entrypoint.
RUN apk add --no-cache gettext

# SPA config: serve /index.html on unknown routes (React Router handles them).
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
# Keep an unsubstituted copy of /config.js as the template the entrypoint reads. We don't
# overwrite /usr/share/nginx/html/config.js directly — that lets re-running the container with
# different env vars produce the right substitution every time.
COPY --from=build /app/dist/config.js /usr/share/nginx/html/config.js.template

# Entrypoint replaces __VITE_*__ placeholders with env-var values, then exec's nginx.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-substitute-config.sh
RUN chmod +x /docker-entrypoint.d/40-substitute-config.sh

# Non-root: nginx alpine ships with a `nginx` user; bind to >1024 so we don't need root.
# Stick with the default 80 for compatibility with existing reverse proxies, but document that
# in a real-K8s deploy you'd run as the `nginx` user behind an ingress that does TLS.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
