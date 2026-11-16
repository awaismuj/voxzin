# Incident response

1. **Detect:** Cloudflare security events, repeated `auth.login_failed` / `auth.account_locked` audit entries, container restarts, unexpected publishes.
2. **Contain:** put Cloudflare in "Under Attack" mode if traffic-related. For a suspected compromised account: an admin uses **Users → Deactivate** (this also revokes sessions); a super admin can **Reset MFA**. To cut all sessions: `db.sessions.deleteMany({})` from a trusted shell. Last resort: `docker compose -f docker-compose.prod.yml stop web api`.
3. **Preserve evidence:** export `auditlogs` and container logs before changing anything; snapshot the server.
4. **Rotate:** `APP_SECRET`, Mongo and Redis passwords, SMTP/AI keys, Jenkins and SSH credentials. Rotating `MFA_ENCRYPTION_KEY` requires resetting everyone's MFA.
5. **Investigate and patch:** find the entry point, fix, run the CI security scans, redeploy.
6. **Verify integrity:** compare published articles against the last good backup; check recent `article.*` and `user.*` audit entries.
7. **Recover and review:** restore if needed, write a post-incident review, add a test for the gap.
