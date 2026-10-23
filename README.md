# Li Yunfei · Academic site

Bilingual academic profile and research notebook, built with Astro and deployed to GitHub Pages.

- English: https://mantains.github.io/en/
- 中文: https://mantains.github.io/zh/
- Node.js 24 (or a supported version >=22.23.4)

## Local use

```bash
npm ci
npm run dev
npm run verify
```

## Content

| Content | Source |
| --- | --- |
| Profile and education | `src/data/profile.json` |
| Articles, presentations, manuscripts, thesis | `src/data/publications.json` |
| Activities | `src/data/activities.json` |
| English notes | `src/content/blog/en/` |
| Chinese notes | `src/content/blog/zh/` |
| Validation schemas | `src/lib/schemas.mjs` |

The bilingual workflow templates are drafts and do not appear on the public site. Copy one to start a note, choose a new `urlSlug` and `translationKey`, and set `draft: false` only when ready. Use a quoted `YYYY-MM-DD` date. Future-dated notes need a build on or after their publication date to appear; no scheduled publishing job is configured.

Math (KaTeX), highlighted code with copy buttons, tables of contents, search, category filtering, RSS, sitemap, canonical URLs, and language alternates are included. Search runs in the browser over published notes in the current language. Missing translations are labeled, and the language link returns to the other language's notes index.

## Codex workflows

Project skills live in `.agents/skills/`: `site-blog`, `site-publication`, `site-activity`, `site-release`. Shared conventions are in `AGENTS.md`.

```text
Use $site-blog to add this finalized note in Chinese; prepare an English draft.
Use $site-publication with DOI 10.1002/tpg2.70320 and show the metadata for review.
Use $site-activity to add this fieldwork record in both languages.
Use $site-release to publish the reviewed changes.
```

DOI metadata retrieval:

```bash
npm run publication:fetch -- 10.1002/tpg2.70320
```

This writes an ignored candidate file under `tmp/metadata/` and does not alter the public publication list.

## Deployment

Pushes to `main` run content validation, build the static site, check generated links, and deploy `dist/` to GitHub Pages. Pull requests run checks without deploying. In repository **Settings → Pages**, the source is **GitHub Actions**.

No API keys or paid services are needed. For a custom domain, update `site` in `astro.config.mjs`, the origin in `scripts/check-output.mjs`, `public/robots.txt`, the root redirect canonical, and GitHub Pages domain settings.

## Source notes

Initial academic content was transcribed from the owner's CV and publication list (status: 22 October 2026). Official English titles and author order are retained. Original application PDFs, birth date, telephone number, and detailed unpublished project descriptions are not included in this repository. Institutional affiliation and laboratory link were cross-checked against the Kyoto University Laboratory of Plant Breeding website. The site is a personal academic website.
