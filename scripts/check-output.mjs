import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'parse5';

const dist = resolve('dist');
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path); else if (entry.name.endsWith('.html')) files.push(path);
  }
}
await walk(dist);
const docs = new Map();
function elements(node, list = []) { if (node.tagName) list.push(node); for (const child of node.childNodes || []) elements(child, list); return list; }
const attrs = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const nodes = elements(parse(source));
  const pathname = file.slice(dist.length).replaceAll('\\', '/').replace(/index\.html$/, '');
  docs.set(file, { nodes, pathname, ids: new Set(nodes.map(n => attrs(n).id).filter(Boolean)), source });
}
const failures = [];
for (const [file, doc] of docs) {
  if (/\/(en|zh)\//.test(doc.pathname)) {
    const lang = doc.pathname.startsWith('/zh/') ? 'zh-CN' : 'en';
    if (attrs(doc.nodes.find(n => n.tagName === 'html')).lang !== lang) failures.push(`Wrong document language: ${doc.pathname}`);
    if (!doc.nodes.some(n => n.tagName === 'link' && attrs(n).rel === 'canonical')) failures.push(`Missing canonical: ${doc.pathname}`);
    if (doc.nodes.filter(n => n.tagName === 'h1').length !== 1) failures.push(`Expected one H1: ${doc.pathname}`);
  }
  for (const node of doc.nodes) {
    const a = attrs(node);
    if (node.tagName === 'img') {
      if (!Object.hasOwn(a, 'alt')) failures.push(`Missing image alt text: ${doc.pathname}`);
      if (!(Number(a.width) > 0 && Number(a.height) > 0)) failures.push(`Missing image dimensions: ${a.src} in ${doc.pathname}`);
    }
    const link = node.tagName === 'a' || node.tagName === 'link' ? a.href : node.tagName === 'img' || node.tagName === 'script' ? a.src : null;
    if (!link || /^(mailto:|tel:|data:)/.test(link)) continue;
    const url = new URL(link, `https://mantains.github.io${doc.pathname}`);
    if (url.origin !== 'https://mantains.github.io') continue;
    let target = resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(dist)) { failures.push(`Escaping path: ${link}`); continue; }
    try { if ((await stat(target)).isDirectory()) target = join(target, 'index.html'); await stat(target); }
    catch { failures.push(`Broken internal link ${link} in ${doc.pathname}`); continue; }
    if (url.hash && docs.has(target) && !docs.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) failures.push(`Missing anchor ${link} in ${doc.pathname}`);
  }
  if (/4214-9269|April 12, 1999/.test(doc.source)) failures.push(`Private source-CV detail in ${doc.pathname}`);
}
for (const lang of ['en', 'zh']) {
  const feed = await readFile(join(dist, lang, 'rss.xml'), 'utf8');
  if (!feed.includes('<rss')) failures.push(`Invalid RSS: ${lang}`);
}
for (const [file, doc] of docs) {
  if (doc.source.includes('workflow-template')) failures.push(`Draft leaked into generated page: ${file}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Output verified: ${docs.size} HTML pages; internal links, anchors, language tags, RSS, and draft exclusion passed.`);
