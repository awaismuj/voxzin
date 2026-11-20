# Voxzin progress

**Nothing below has been run.** The code was written without network access: no `pnpm install`, build, tests or scans have been executed (only a TypeScript syntax check). Expect a round of small type/version fixes on first build. Dependency versions are caret ranges chosen without checking registries: run `pnpm outdated` and `pnpm audit` before committing the lockfile.

## Done (written)
- **P1 Foundation:** pnpm + Turborepo, strict TS, ESLint 9, Prettier, validated env, Docker dev infra (Mongo with auth + app user, Redis with password, localhost only).
- **P2 Public site:** home (ticker, hero, top stories, section bar, trending chips, featured), `/latest`, category pages, article pages (sanitised body, sources, related, JSON-LD), light/dark, responsive nav, loading/error/empty/404 states.
- **P3 Backend:** articles/categories/search APIs with Zod validation, indexes, text search, pagination, rate limiting, security headers, CORS allowlist, sitemap + settings endpoints.
- **P4 Admin CMS:** custom session auth (Argon2id, hashed session tokens, lockout), TOTP MFA enforced for privileged roles, server-side RBAC, CSRF origin guard, audit log. Admin UI: login + MFA, dashboard, articles list, TipTap editor with preview, workflow buttons (research → in review → approved → scheduled/published → archived), categories, authors, users, settings, secure image upload.
- **P5 Trends:** provider interface, Google Trends RSS provider (can be switched off) and approved-RSS provider, hourly BullMQ discovery with retries and backoff, dedupe by slug + country, auto-expiry, admin review (approve needs a written explanation), public `/trending` with country filter and topic pages. Metrics are stored only if the source reported them.
- **P6 AI:** optional provider-agnostic assistant (Anthropic implemented): headlines, outline, summary, SEO text, readability. Suggestions only, audit-logged. Duplicate-coverage warnings on save. Human approval is mandatory in the workflow.
- **P7 SEO + newsletter:** sitemap.xml, robots.txt, RSS feed, canonical URLs, Open Graph, Article/Organization/WebSite JSON-LD. Newsletter double opt-in, confirm, unsubscribe, and moderated article campaigns to selected confirmed subscribers. Campaigns use an atomic daily quota and a queued worker. Configure a free SMTP campaign provider before sending; see `NEWSLETTER.md`.
- **P8 Security/testing:** guards and validation above, Vitest tests (workflow rules, validation, sanitiser, RSS parsing), Playwright smoke/security specs, CI scans in the Jenkinsfile (Gitleaks, Semgrep, Trivy, pnpm audit, ZAP baseline), Dependabot, CodeQL workflow.
- **P9 Deployment:** multi-stage Dockerfile (non-root), hardened `docker-compose.prod.yml`, Nginx config, Cloudflare IP script, deploy script with health-check rollback, backup script, runbooks.

## Partial or missing (be aware before launch)
- Auth is custom session auth, not Better Auth/Auth.js (integration couldn't be tested here). No email verification, password reset, recovery codes or TOTP replay protection yet.
- Homepage has the sections listed above, not all 21. No admin control of homepage section order, navigation, logo/favicon or footer. No most-read, editor's picks, recently updated or weekly roundup sections (need view tracking).
- Admin-created categories get no public page (public routes use the built-in category list).
- No table of contents, social share buttons, video/embed support, tags pages or author pages, bulk actions, or Urdu/Hindi localisation.
- Newsletter audience segmentation, open/click analytics, and recurring daily/weekly editorial digests are not built. No Turnstile.
- No ads, affiliate or sponsored-content modules, no analytics integration or `articleViews`.
- No Sentry, OpenTelemetry, OpenAPI docs, redirect management, malware scanning of uploads, or Google/Bing Search Console wiring.
- Trend "explanation" is one admin-written text field plus keywords and linked articles; no timeline, auto-categorisation or trend direction (no provider supplies it).
- CSP keeps `unsafe-inline` for scripts. Jenkins hosts/credential ids marked TODO. Cloudflare, UFW and SSH hardening are documented, not automated.
- Google Trends RSS availability and terms must be checked before production use.
