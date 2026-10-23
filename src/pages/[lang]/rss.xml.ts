import rss from '@astrojs/rss';
import { languages, publicNotes, profile, text, noteHref, type Lang } from '../../lib/site';
export function getStaticPaths() { return languages.map(lang => ({ params: { lang } })); }
export async function GET(context: { params: { lang?: string }; site: URL }) {
  const lang = context.params.lang as Lang;
  return rss({
    title: `${profile.name} · ${text[lang].blog}`,
    description: text[lang].emptyDescription,
    site: context.site,
    items: (await publicNotes(lang)).map(note => ({ title: note.data.title, description: note.data.description, pubDate: new Date(note.data.pubDate), link: noteHref(note), categories: note.data.tags })),
    customData: `<language>${lang === 'zh' ? 'zh-CN' : 'en'}</language>`
  });
}
