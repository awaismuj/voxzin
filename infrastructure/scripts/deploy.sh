#!/usr/bin/env bash
# Usage: IMAGE_TAG=<tag> infrastructure/scripts/deploy.sh   (run on the server in the repo directory)
# Starts the new tag; if the API or web health checks fail, rolls back to the previous tag.
set -euo pipefail
COMPOSE="docker compose -p strongpassweb -f docker-compose.prod.yml"
NEW="${IMAGE_TAG:?set IMAGE_TAG}"
PREV="$(cat .deployed-tag 2>/dev/null || true)"
NGINX_CERT_GID="${NGINX_CERT_GID:-$(stat -c '%g' infrastructure/nginx/certs/origin.key)}"
export NGINX_CERT_GID

rollback() {
  if [ -z "$PREV" ]; then
    echo "No previous deployment tag is recorded; automatic rollback is unavailable." >&2
    return 1
  fi

  export IMAGE_TAG="$PREV"
  if $COMPOSE up -d --remove-orphans; then
    echo "Rolled back to $PREV" >&2
  else
    echo "Rollback to $PREV failed. Check container status and host port conflicts." >&2
    return 1
  fi
}

export IMAGE_TAG="$NEW"
if ! $COMPOSE up -d --remove-orphans; then
  echo "Could not start deployment $NEW; attempting rollback." >&2
  rollback || true
  exit 1
fi

healthy() {
  for _ in $(seq 1 30); do
    bad="$($COMPOSE ps --format '{{.Service}} {{.Health}}' api web | grep -vc ' healthy' || true)"
    [ "$bad" = "0" ] && return 0
    sleep 5
  done
  return 1
}

report_health_failure() {
  echo "Deployment health check details for $NEW:" >&2
  $COMPOSE ps --all api web >&2 || true
  for service in api web; do
    container="$($COMPOSE ps -q "$service" || true)"
    if [ -n "$container" ]; then
      docker inspect --format '{{.Name}} state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}not-configured{{end}}' "$container" >&2 || true
      docker inspect --format '{{range .State.Health.Log}}{{printf "%s exit=%d: %s\n" .End .ExitCode .Output}}{{end}}' "$container" | tail -n 10 >&2 || true
    fi
  done
  $COMPOSE logs --no-color --tail=80 api web >&2 || true
}

if healthy; then echo "$NEW" > .deployed-tag; echo "Deployed $NEW"; exit 0; fi
echo "Health check failed for $NEW" >&2
report_health_failure
rollback || true
exit 1
