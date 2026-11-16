# Database (MongoDB, Mongoose)

Schemas live in `packages/database/src/index.ts`. Implemented collections: `articles`, `categories`, `authors`, `users`, `sessions` (TTL), `auditlogs`, `trendingtopics`, `newslettersubscribers`, `media`, `sitesettings`.
Not yet created (from the spec): `tags`, `trendSources`, `trendSnapshots`, `newsletterCampaigns`, `articleViews`, `scheduledJobs`, `notifications`, `redirectRules`, `searchLogs`. Tags are a string array on articles for now.

Key indexes: unique `articles.slug`; `status + publishedAt`; `category + status + publishedAt`; `status + scheduledAt` (scheduler); text index on title/subtitle/excerpt (search); unique `trendingtopics(slug,country)`; TTL on `sessions.expiresAt`.
Mongoose `autoIndex` is on by default; `pnpm db:seed` also runs `syncIndexes()`. For large production data sets, build indexes in a maintenance step instead.
No migrations framework yet: schema changes are additive. Trend metrics are stored only if a source reported them; `trendDirection` is never written.
