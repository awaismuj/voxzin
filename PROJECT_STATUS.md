# Voxzin Article Project Status

Research and draft preparation date: 2026-11-12

## Batch 1 — Trending

Status: **Prepared locally for editorial review; not uploaded to production CMS.**

| # | Draft | Category | Research and source review | SEO metadata | Image |
|---|---|---|---|---|---|
| 1 | COP31 in Antalya: What the Climate Talks Can—and Cannot—Deliver | Trending (category must be created or confirmed in CMS) | UN and UN News pages accessed; conference dates and claims checked | Included in draft metadata | Awaiting owner upload; concept and alt text included |
| 2 | NASA’s Moon Base Plan Is Becoming a Supply-Chain Challenge | Trending (category must be created or confirmed in CMS) | NASA announcement and programme pages accessed | Included in draft metadata | Awaiting owner upload; concept and alt text included |
| 3 | MIT’s FLEX Research Helps Robots Learn What People Mean | Trending (category must be created or confirmed in CMS) | MIT News and arXiv paper accessed; research limits stated | Included in draft metadata | Awaiting owner upload; concept and alt text included |
| 4 | New World Screwworm: What USDA’s Latest Guidance Says About Risk | Trending (category must be created or confirmed in CMS) | USDA APHIS update accessed; current agency risk statement distinguished from general hazard | Included in draft metadata | Awaiting owner upload; concept and alt text included |
| 5 | PAHO’s HPV Testing Agreements Target a Cost Barrier to Cervical Screening | Trending (category must be created or confirmed in CMS) | PAHO announcement and WHO guidance accessed; expected savings not presented as guaranteed results | Included in draft metadata | Awaiting owner upload; concept and alt text included |

Draft files are in [`content/drafts/trending/`](./content/drafts/trending/). All are marked `ai_assisted: true`; no human byline is claimed. They remain local Markdown editorial drafts, not CMS records.

## CMS readiness and limitations

- The existing article creation API requires authenticated admin/editor access and a category ID. It creates articles as `draft`, which is appropriate for this project.
- The CMS has title, excerpt, HTML body, tags, source title/URL pairs, SEO title, meta description, canonical URL and optional featured image fields.
- The CMS does not have dedicated fields for primary/secondary keywords, research date, source publication date, suggested image concept, image-upload status or a manual slug. Those details are retained in each draft's front matter; the CMS generates a unique slug from the headline.
- An omitted featured image is supported. The existing public image component renders a neutral placeholder when no image is present.
- Production login previously returned HTTP 500 because the web image used a localhost API rewrite. The current local rewrite fix must be deployed and verified before an authenticated CMS upload can be attempted.
- Production database backup and duplicate checks have not been performed from this local workspace. No production data was changed.

## Remaining batches

Not started: Technology, Artificial Intelligence, Business, World News, Entertainment, Sports, Science, Lifestyle and Internet Culture. Continue one category at a time; before each batch, verify that its CMS category exists or create it once, review existing content for overlap, and confirm the live login and backup process before uploading.
