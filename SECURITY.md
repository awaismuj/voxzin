# Security

No website is unhackable. This document says what is implemented, what is not, and what you must configure.

## Implemented in code
- **Passwords:** Argon2id. Generic login errors, timing equalisation for unknown users, lockout for 15 min after 5 failures, 5/min rate limit on login and MFA endpoints.
- **Sessions:** random 256-bit token, only its SHA-256 stored, HTTP-only + SameSite=Lax (+ Secure in production) cookie, server-side expiry (TTL index), revocation per user ("Sign out everywhere", automatic on role change or deactivation).
- **MFA:** TOTP for super admin, admin and editor, enforced server-side on every privileged route. Secrets encrypted at rest (AES-256-GCM, `MFA_ENCRYPTION_KEY`). Authors may use MFA but are not forced.
- **RBAC:** `SessionGuard` + `RolesGuard` on every admin route; authors only see and edit their own drafts; nobody below editor can approve or publish; admins cannot manage roles at or above their own.
- **CSRF:** cookie auth plus an Origin allowlist check on every state-changing request.
- **Input:** Zod validation on all bodies, queries and params; unknown keys stripped; object-shaped values rejected (no Mongo operators from users); regex input escaped; 100 KB body limit.
- **Output:** article HTML sanitised on write and again on read (allowlist, https images only, forced `rel`).
- **Uploads:** 5 MB cap, type from magic bytes (PNG/JPEG/WebP/GIF only, no SVG), random filenames, served with `nosniff` and a sandbox CSP.
- **Headers:** CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors none (web) plus Helmet (API).
- **Audit log:** logins, MFA events, publishing, user and settings changes, uploads, AI use.
- **Containers:** non-root, read-only filesystem, all capabilities dropped, no-new-privileges, memory limits, Redis on an internal network.

## Known gaps (do before launch)
1. CSP still allows `unsafe-inline` for scripts. Moving to nonces makes pages dynamic; evaluate the trade-off.
2. No TOTP replay protection and no recovery codes. A super admin can reset a user's MFA.
3. No email verification or password-reset flow for staff accounts yet (accounts are created by admins).
4. Cloudflare WAF, Turnstile on the newsletter form, bot rules and origin firewalling are configuration you must do (see DEPLOYMENT.md).
5. Nothing here has been executed or penetration-tested. Run the CI scans and ZAP against staging first.
6. Malware scanning of uploads is not implemented.
