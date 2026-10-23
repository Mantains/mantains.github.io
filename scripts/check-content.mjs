import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { publicationSchema, activitySchema, noteSchema } from '../src/lib/schemas.mjs';

const publications = JSON.parse(await readFile('src/data/publications.json', 'utf8'));
const activities = JSON.parse(await readFile('src/data/activities.json', 'utf8'));
const notes = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.mdx?$/.test(entry.name)) {
      const source = await readFile(file, 'utf8');
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!match) throw new Error(`Missing frontmatter: ${file}`);
      notes.push({ file, ...noteSchema.parse(parse(match[1])) });
    }
  }
}
await walk('src/content/blog');
const unique = (values, label) => { if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`); };
publications.forEach(p => publicationSchema.parse(p));
activities.forEach(a => activitySchema.parse(a));
unique(publications.map(p => p.id), 'publication IDs');
unique(publications.filter(p => p.doi).map(p => p.doi.toLowerCase()), 'DOIs');
unique(activities.map(a => a.id), 'activity IDs');
unique(notes.map(n => `${n.lang}/${n.urlSlug}`), 'note URLs');
unique(notes.map(n => `${n.lang}/${n.translationKey}`), 'translation keys in the same language');
const ids = new Set(publications.map(p => p.id));
for (const a of activities) for (const id of a.publicationIds || []) if (!ids.has(id)) throw new Error(`Unknown publication ${id} in ${a.id}`);
for (const n of notes) {
  if (n.updatedDate && n.updatedDate < n.pubDate) throw new Error(`Update precedes publication: ${n.file}`);
  if (!n.file.replaceAll('\\', '/').includes(`/blog/${n.lang}/`)) throw new Error(`Note language does not match directory: ${n.file}`);
}
console.log(`Content verified: ${publications.length} outputs, ${activities.length} activities, ${notes.length} notes (${notes.filter(n => n.draft).length} drafts).`);
