---
name: site-publication
description: Add or update a publication from a DOI or a conference presentation from supplied materials in Li Yunfei's academic site, with metadata review and duplicate checks.
---

Read `src/data/publications.json` and `src/lib/schemas.mjs`.

For DOI input, run `npm run publication:fetch -- <DOI>`. This writes a candidate into ignored `tmp/metadata/`, not the public collection. Review the returned title, complete ordered author list, venue, publication dates, volume, and page/article number against the publisher landing page when available. Show a compact metadata table with discrepancies and missing fields. If the workflow is awaiting the user's metadata confirmation, keep the candidate pending; prior confirmation need not be repeated.

After confirmation, add or update the entry. Match by normalized DOI first and inspect title/year for duplicates. Preserve manually curated IDs, featured order, authorship markers, bilingual summaries, and status unless the user asks to change them. Do not infer equal contribution or corresponding authorship from author order. Metadata retrieval is not evidence of full-text access. Record online and issue-year discrepancies when relevant.

For presentations without DOI, use the supplied title, authors, meeting, date, location, and oral/poster format. Treat an associated abstract publication and a presentation as distinct outputs when warranted. Keep under-review manuscripts explicitly separate from published articles. Do not invent missing data.

Run `npm run verify`; check the output list, homepage selection if changed, and BibTeX download. Use `site-release` for an authorized push or publication.
