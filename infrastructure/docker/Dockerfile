# syntax=docker/dockerfile:1
# Build:  docker build -f infrastructure/docker/Dockerfile --target web -t voxzin-web .
# Pin the base image by digest in CI:  node:22-alpine@sha256:<digest>
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
ENV CI=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_URL=http://api:4000/v1
ARG NEXT_PUBLIC_SITE_URL=https://voxzin.com
ARG MEDIA_HOSTNAME=
ENV API_URL=$API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL MEDIA_HOSTNAME=$MEDIA_HOSTNAME NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --concurrency=1
RUN pnpm --filter @voxzin/api deploy --prod /out/api && pnpm --filter @voxzin/worker deploy --prod /out/worker

FROM node:22-alpine AS api
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p /data/uploads && chown node:node /data/uploads
COPY --from=build --chown=node:node /out/api ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/worker ./
USER node
CMD ["node", "dist/index.js"]

FROM node:22-alpine AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
