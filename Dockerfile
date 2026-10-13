FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN --mount=type=secret,id=cloud-ca if [ -f /run/secrets/cloud-ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/cloud-ca; fi; npm install -g pnpm@10.34.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/frontend/package.json src/frontend/package.json
RUN --mount=type=secret,id=cloud-ca if [ -f /run/secrets/cloud-ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/cloud-ca; fi; pnpm install --frozen-lockfile
COPY --chown=node:node . .
ENV VITE_BACKEND_MODE=http VITE_LOCAL_AUTH=true VITE_EMAIL_AUTH=true
RUN pnpm build
RUN mkdir -p /state /media && chown node:node /state /media
USER node
ENV AUTH_BACKEND_CANISTER_ID=http AUTH_PORT=3010 AUTH_BIND=0.0.0.0 AUTH_DATA_DIR=/state MEDIA_ROOT=/media
CMD ["node","server/auth.mjs"]
FROM caddy:2-alpine AS gateway
RUN setcap -r /usr/bin/caddy && chown -R 1000:1000 /config /data
COPY --chmod=644 deployment/Caddyfile /etc/caddy/Caddyfile
COPY --from=build --chmod=755 /app/.build/frontend /srv
USER 1000:1000
