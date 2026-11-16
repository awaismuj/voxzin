# Development

```bash
pnpm install
cp .env.example .env            # replace every change-me; generate APP_SECRET / MFA_ENCRYPTION_KEY with `openssl rand -base64 32`
cp .env apps/web/.env.local     # Next.js does not read the root .env (only API_URL, NEXT_PUBLIC_SITE_URL, MEDIA_HOSTNAME matter)
pnpm infra:up                   # MongoDB + Redis on 127.0.0.1
pnpm db:seed                   # default categories/countries + indexes
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_ROLE=super_admin ADMIN_PASSWORD='at-least-12-chars' pnpm create-admin
pnpm dev                        # web :3000, api :4000, worker
```
First sign-in at `/admin/login` forces MFA setup (authenticator app). `pnpm db:seed:sample` adds clearly labelled [Sample] articles for layout review (dev only).

In the admin panel, manage active categories at **Categories**, country options for trending at **Countries**, and reusable image uploads at **Media**. In an article, choose the featured/lead image from the media picker or insert an image at the body cursor; body images can be aligned and resized. Uploads require an accurate alt description and can be reused across articles. Articles without a featured image show a neutral placeholder; failed image loads also fall back to a placeholder. Active categories feed the public navigation and category routes; `/sitemap.xml` includes published articles and paginated category/latest listings, and the app's `/robots.txt` allows major AI search crawlers while excluding admin and API routes. Check Cloudflare's managed bot/content-signal settings too: they can add restrictions that override application-level robots rules. Crawl access does not guarantee inclusion or ranking on any search or AI platform.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright, needs the stack running; `BASE_URL` to target another host).

Layout: `apps/web` (public site + /admin), `apps/api` (NestJS), `apps/worker` (BullMQ), `packages/shared` (types, Zod, workflow rules), `packages/database` (Mongoose schemas).
Rule of thumb: validate with a Zod schema from `packages/shared` at every API boundary, and enforce roles in the API, not only in the UI.
