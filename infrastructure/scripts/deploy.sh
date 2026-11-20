#!/usr/bin/env bash
# Usage: IMAGE_TAG=<tag> infrastructure/scripts/deploy.sh   (run on the server in the repo directory)
# Starts the new tag; if an app health check fails, rolls back to the previous tag.
set -euo pipefail
NEW="${IMAGE_TAG:?set IMAGE_TAG}"
PREV="$(cat .deployed-tag 2>/dev/null || true)"

compose() {
  docker compose -p strongpassweb -f docker-compose.prod.yml "$@"
}

start_app() {
  compose up -d --remove-orphans api worker web
}

healthy() {
  local include_worker="${1:-true}"
  local services=(api web)
  if [ "$include_worker" = "true" ]; then services+=(worker); fi
  for _ in $(seq 1 30); do
    bad="$(compose ps --format '{{.Service}} {{.Health}}' "${services[@]}" | grep -vc ' healthy' || true)"
    [ "$bad" = "0" ] && return 0
    sleep 5
  done
  return 1
}

rollback() {
  if [ -z "$PREV" ]; then
    echo "No previous deployment tag is recorded; automatic rollback is unavailable." >&2
    return 1
  fi

  export IMAGE_TAG="$PREV"
  if start_app && healthy false; then
    echo "Rolled back API and web to $PREV; worker health should be checked separately." >&2
  else
    echo "Rollback to $PREV failed. Check app container status." >&2
    return 1
  fi
}

export IMAGE_TAG="$NEW"
if ! start_app; then
  echo "Could not start deployment $NEW; attempting rollback." >&2
  rollback || true
  exit 1
fi

report_health_failure() {
  echo "Deployment health check details for $NEW:" >&2
  compose ps --all api web worker redis >&2 || true
  for service in api web worker redis; do
    container="$(compose ps -q "$service" || true)"
    if [ -n "$container" ]; then
      docker inspect --format '{{.Name}} state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}not-configured{{end}}' "$container" >&2 || true
      docker inspect --format '{{range .State.Health.Log}}{{printf "%s exit=%d: %s\n" .End .ExitCode .Output}}{{end}}' "$container" | tail -n 10 >&2 || true
    fi
  done
  compose logs --no-color --tail=80 api web worker redis >&2 || true
}

if healthy; then echo "$NEW" > .deployed-tag; echo "Deployed $NEW"; exit 0; fi
echo "Health check failed for $NEW" >&2
report_health_failure
rollback || true
exit 1
