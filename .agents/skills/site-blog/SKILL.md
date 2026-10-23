---
name: site-blog
description: Add or revise a finalized research or technical note in Li Yunfei's bilingual academic site, including metadata, assets, translations, and preview validation.
---

Use the accepted draft as the editorial baseline. Discuss material factual or argumentative changes instead of silently rewriting the finished text.

Read `src/lib/schemas.mjs` and a relevant existing note. Place notes in `src/content/blog/{en,zh}/`; use the workflow templates as examples. Assign a stable `urlSlug`, a `translationKey`, one of the three existing categories, and useful tags. Retain the initial publication date on updates and set `updatedDate`. New unfinished notes remain drafts; a finished note the user asks to publish has `draft: false`.

Create translations when requested, using the same `translationKey`. An unavailable translation is supported. Avoid changing official names, code, or technical meaning in translation. Put media under `public/images/blog/<urlSlug>/` and supply useful alt text. Do not claim code has run unless it was actually executed; preserve environment and data provenance.

Run `npm run verify`. Preview article layout when a public article or its rendering changes, including code, math, tables, and mobile width as applicable. Report the article URL and language coverage. Use `site-release` when the user asks to push or publish; otherwise leave a reviewable local change.
