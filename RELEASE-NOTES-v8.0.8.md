# LearnBridge v8.0.8 — SEO-ready public learning pages

Version 8.0.8 preserves the v8.0.7 diagram, mathematics, chemistry, legal, Paystack, school-licensing and password-recovery work and adds a static search-discovery layer for `https://learnbridge-app.com`.

## Added

- 210 statically rendered entry pages, including 204 indexable public pages.
- Nigerian and British curriculum landing pages.
- Twelve curriculum-specific Year 7–12 pages.
- 160 subject overview pages generated from the validated catalogue.
- 23 free starter-sample pages where bundled sample content exists.
- Indexable Terms, Privacy and Refund policy entry pages.
- Unique titles, descriptions, canonical URLs, Open Graph and Twitter metadata.
- `WebSite`, `SoftwareApplication`, `CollectionPage`, `WebPage` and `LearningResource` JSON-LD.
- Generated XML sitemap and public `robots.txt`.
- A branded favicon, web manifest and 1200 × 630 social preview image.
- A real 404 page served with HTTP 404 for unknown routes.

## Protected from indexing

- Account, school, platform, invitation, bookmark and progress pages use `noindex, nofollow` in their HTML and Nginx response headers.
- API responses receive `X-Robots-Tag: noindex, nofollow`.
- Protected lesson content remains server-gated and is not embedded in public static HTML.

## Verification

- Curriculum catalogue validation passed: 160 subjects and 665 class-subject combinations.
- All 57 automated tests passed.
- Production build generated 210 static pages and a 204-URL sitemap.
- Representative home, class, subject, sample, legal, private and 404 pages passed metadata and JSON-LD checks.

Search engines decide whether and when a URL is indexed or ranked. Deploying this release does not guarantee a particular search position.
