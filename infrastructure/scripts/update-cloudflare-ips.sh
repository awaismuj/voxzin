#!/usr/bin/env bash
# Regenerates the nginx real-IP allowlist from Cloudflare's published ranges. Run from the repo root; re-run periodically.
set -euo pipefail
out=infrastructure/nginx/cloudflare-ips.conf
: > "$out"
for v in ips-v4 ips-v6; do
  curl -fsS "https://www.cloudflare.com/$v" | while read -r cidr; do [ -n "$cidr" ] && echo "set_real_ip_from $cidr;" >> "$out"; done
done
echo "Wrote $(wc -l < "$out") ranges to $out. Also restrict ports 80/443 to these ranges in UFW."
