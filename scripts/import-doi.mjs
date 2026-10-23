import { mkdir, readFile, writeFile } from 'node:fs/promises';

const input = process.argv[2];
if (!input) throw new Error('Usage: npm run publication:fetch -- 10.xxxx/example');
const doi = input.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
if (!/^10\.\d{4,9}\/\S+$/.test(doi)) throw new Error('Invalid DOI format');
const existing = JSON.parse(await readFile('src/data/publications.json', 'utf8'));
const duplicate = existing.find(p => p.doi?.toLowerCase() === doi.toLowerCase());
if (duplicate) console.log(`Existing entry: ${duplicate.id}. Compare metadata before updating.`);
const response = await fetch(`https://doi.org/${doi}`, {
  headers: { Accept: 'application/vnd.citationstyles.csl+json', 'User-Agent': 'Mantains-Academic-Site/1.0 (https://mantains.github.io)' },
  signal: AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`DOI metadata request failed: ${response.status}`);
const metadata = await response.json();
const candidate = {
  inputDoi: doi, retrievedAt: new Date().toISOString(), source: response.url,
  existingId: duplicate?.id || null,
  metadata,
  review: {
    title: metadata.title,
    authors: metadata.author?.map(a => [a.family, a.given].filter(Boolean).join(', ')),
    venue: metadata['container-title'],
    issued: metadata.issued, publishedOnline: metadata['published-online'], publishedPrint: metadata['published-print'],
    volume: metadata.volume, issue: metadata.issue, page: metadata.page, articleNumber: metadata['article-number'], type: metadata.type
  }
};
await mkdir('tmp/metadata', { recursive: true });
const output = `tmp/metadata/${doi.replace(/[^a-z0-9.-]/gi, '_')}.json`;
await writeFile(output, JSON.stringify(candidate, null, 2) + '\n');
console.log(JSON.stringify(candidate.review, null, 2));
console.log(`Candidate saved to ${output}. The publication list has not been modified.`);
