import { publications } from '../../lib/site';
export function getStaticPaths() { return publications.map(item => ({ params: { id: item.id }, props: { item } })); }
const escape = (value: string) => value.replace(/[{}]/g, '').replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/_/g, '\\_');
export function GET({ props }: { props: { item: typeof publications[number] } }) {
  const { item } = props;
  const type = item.type === 'article' ? 'article' : item.type === 'thesis' ? 'mastersthesis' : 'misc';
  const author = item.authors.replace(/\*/g, '').replace(/,\s*&\s*/g, ', ').split(/,\s+(?=[A-Z][a-zA-Z-]+,)/).map(a => a.trim()).join(' and ');
  const fields: Record<string, string> = { title: item.title, author, year: String(item.year) };
  fields[item.type === 'article' ? 'journal' : item.type === 'thesis' ? 'school' : 'note'] = item.venue;
  if (item.volume) fields.volume = item.volume;
  if ('issue' in item && item.issue) fields.number = String(item.issue);
  if (item.pages) fields.pages = item.pages.replace(/–/g, '--');
  if (item.doi) { fields.doi = item.doi; fields.url = `https://doi.org/${item.doi}`; }
  if (item.status === 'under-review') fields.note = 'Revised manuscript under review; not a published article';
  if (item.type === 'presentation') fields.howpublished = `${item.format === 'oral' ? 'Oral' : 'Poster'} presentation, ${item.location}, ${item.date}${item.endDate ? ' to ' + item.endDate : ''}`;
  return new Response(`@${type}{${item.id},\n${Object.entries(fields).map(([k,v]) => `  ${k} = {${escape(v)}}`).join(',\n')}\n}\n`, { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' } });
}
