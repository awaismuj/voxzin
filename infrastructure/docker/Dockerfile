# syntax=docker/dockerfile:1
# Build:  docker build -f infrastructure/docker/Dockerfile --target web -t voxzin-web .
# Pin the base image by digest in CI:  node:22-alpine@sha256:<digest>
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
ARG API_URL=http://api:4000/v1
ARG NEXT_PUBLIC_SITE_URL=https://voxzin.com
ARG MEDIA_HOSTNAME=
ENV API_URL=$API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL MEDIA_HOSTNAME=$MEDIA_HOSTNAME NEXT_TELEMETRY_DISABLED=1
COPY . .
ENV CI=true
RUN pnpm install --frozen-lockfile
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
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
