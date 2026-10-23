---
name: site-activity
description: Add or revise fieldwork, practical training, academic exchange, or seminar records in Li Yunfei's bilingual academic site using supplied notes and materials.
---

Read `src/data/activities.json` and `src/lib/schemas.mjs`. Create a stable ID and bilingual title, location, summary, and body from the supplied facts. Match the depth of the record to the available material; a short entry is valid. Retain year-only timing when no precise date is known. Distinguish planned and completed activities; elapsed time alone does not prove completion.

Link formal research outputs through `publicationIds` where useful. Add corresponding visible links when needed; do not duplicate an entire publication as an activity. Add photographs only from supplied or authorized assets, under `public/images/activities/<id>/`, with captions and alt text. Ask only for missing facts that materially affect the entry.

Keep homepage selection in `featured` and `order`. Run `npm run verify`, check the detail page and language switch, and use `site-release` for an authorized push or publication.
