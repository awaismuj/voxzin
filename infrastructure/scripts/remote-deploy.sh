#!/usr/bin/env bash
# Runs ON the target server, inside the cloned repo. Builds images, then deploys with health-check rollback.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${IMAGE_TAG:?IMAGE_TAG is required}"

[ -f .env.production ] || { echo "Missing .env.production" >&2; exit 1; }
[ -f infrastructure/nginx/certs/origin.pem ] || { echo "Missing infrastructure/nginx/certs/origin.pem" >&2; exit 1; }
ln -sf .env.production .env                      # docker compose reads .env for ${REDIS_PASSWORD}

# Keep the active release and running images for rollback, but discard older releases and
# build cache before compiling to prevent repeated deployments filling the Docker filesystem.
PREV_TAG="$(cat .deployed-tag 2>/dev/null || true)"
REFERENCED_IMAGES="$(docker ps -a --format '{{.Image}}')"
while IFS= read -r image; do
  case "$image" in
    voxzin-api:*|voxzin-worker:*|voxzin-web:*)
      tag="${image##*:}"
      if [ "$tag" != "$PREV_TAG" ] && [ "$tag" != "$IMAGE_TAG" ] \
        && ! grep -Fqx "$image" <<< "$REFERENCED_IMAGES"; then
        docker image rm "$image"
      fi
      ;;
  esac
done < <(docker image ls --format '{{.Repository}}:{{.Tag}}')
docker image prune -f
docker builder prune -af

# Reuse the existing Compose project so services and volumes are updated in place.
# Avoid unexpected pulls when images have just been built locally on the host.
export COMPOSE_PROJECT_NAME=strongpassweb

SITE_URL="$(grep -E '^NEXT_PUBLIC_SITE_URL=' .env.production | cut -d= -f2-)"
for t in api worker web; do
  docker build -f infrastructure/docker/Dockerfile --target "$t" \
    --build-arg NEXT_PUBLIC_SITE_URL="${SITE_URL:-https://voxzin.com}" \
    -t "voxzin-$t:$IMAGE_TAG" .
done

bash infrastructure/scripts/deploy.sh            # starts the new tag; rolls back if health checks fail
docker image prune -f >/dev/null                 # remove dangling layers
