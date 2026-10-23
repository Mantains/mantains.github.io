import { getCollection } from 'astro:content';
import profile from '../data/profile.json';
import publications from '../data/publications.json';
import activities from '../data/activities.json';

export { profile, publications, activities };
export type Lang = 'en' | 'zh';
export const languages: Lang[] = ['en', 'zh'];
export const otherLang = (lang: Lang): Lang => lang === 'en' ? 'zh' : 'en';
export const pick = (lang: Lang, en: string, zh: string) => lang === 'en' ? en : zh;
export const text = {
  en: {
    home: 'Home', publications: 'Publications', blog: 'Notes', activities: 'Activities', about: 'About',
    selected: 'Selected publications', allPublications: 'All publications', recent: 'Fieldwork & exchange',
    allActivities: 'All activities', notes: 'Research & technical notes', allNotes: 'All notes',
    email: 'Get in touch', interests: 'Research interests', education: 'Education',
    year: 'Year', planned: 'Planned', completed: 'Completed', read: 'Read note',
    empty: 'The notebook is open.',
    emptyDescription: 'Notes on bioinformatics, Linux, and statistical methods for plant breeding will appear here.',
    footer: 'Plant diversity · Genomics · Reproducible research',
    dateAsOf: 'Publication status as of 22 October 2026.',
    articles: 'Peer-reviewed articles', presentations: 'Conference presentations', manuscripts: 'Under review', thesis: 'Thesis',
    oral: 'Oral presentation', poster: 'Poster presentation', review: 'Revised manuscript under review',
    fieldwork: 'Fieldwork', training: 'Practical training', exchange: 'Academic exchange', seminar: 'Seminar',
    bioinformatics: 'Bioinformatics', computing: 'Linux & computing', 'breeding-statistics': 'Breeding & statistics',
    bioinformaticsDescription: 'Genomes, sequence data, and reproducible analysis workflows.',
    computingDescription: 'Linux, shell scripting, environments, and HPC.',
    'breeding-statisticsDescription': 'Trial design, quantitative genetics, and statistical analysis.'
  },
  zh: {
    home: '首页', publications: '研究成果', blog: '技术笔记', activities: '活动', about: '关于',
    selected: '精选研究成果', allPublications: '全部研究成果', recent: '田间实践与学术交流',
    allActivities: '全部活动', notes: '研究与技术笔记', allNotes: '全部笔记',
    email: '联系我', interests: '研究方向', education: '教育经历',
    year: '年份', planned: '计划中', completed: '已完成', read: '阅读全文',
    empty: '笔记，从这里开始。',
    emptyDescription: '这里将记录生物信息、Linux，以及植物育种统计分析中的方法与实践。',
    footer: '植物多样性 · 基因组学 · 可重复研究',
    dateAsOf: '成果状态依据 2026 年 10 月 22 日的资料。',
    articles: '同行评议论文', presentations: '学会发表', manuscripts: '审稿中', thesis: '学位论文',
    oral: '口头报告', poster: '海报发表', review: '返修稿审稿中',
    fieldwork: '田间实践', training: '实践教学', exchange: '学术交流', seminar: '研讨会',
    bioinformatics: '生物信息', computing: 'Linux 与计算', 'breeding-statistics': '育种与统计',
    bioinformaticsDescription: '基因组、测序数据与可重复的分析流程。',
    computingDescription: 'Linux、Shell、环境配置与高性能计算。',
    'breeding-statisticsDescription': '试验设计、数量遗传学与统计分析。'
  }
};
export const categories = ['bioinformatics', 'computing', 'breeding-statistics'] as const;
export const noteHref = (note: { data: { lang: string; urlSlug: string } }) => `/${note.data.lang}/blog/${note.data.urlSlug}/`;
export const formatDate = (value: string, lang: Lang) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
export async function publicNotes(lang?: Lang) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return (await getCollection('blog')).filter(n => !n.data.draft && n.data.pubDate <= today && (!lang || n.data.lang === lang)).sort((a, b) => b.data.pubDate.localeCompare(a.data.pubDate));
}
