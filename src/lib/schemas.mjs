import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date');
const bilingual = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const activityPhoto = z.object({
  src: z.string().regex(/^\/images\/activities\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: bilingual,
  caption: bilingual
});
export const noteSchema = z.object({
  title: z.string().min(1), description: z.string().min(1),
  lang: z.enum(['en', 'zh']),
  urlSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  translationKey: z.string().min(1),
  category: z.enum(['bioinformatics', 'computing', 'breeding-statistics']),
  tags: z.array(z.string()).default([]),
  pubDate: date, updatedDate: date.optional(),
  draft: z.boolean().default(true), featured: z.boolean().default(false),
  sourceRevision: z.string().optional()
});
export const publicationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['article', 'presentation', 'manuscript', 'thesis']),
  status: z.enum(['published', 'presented', 'under-review', 'completed']),
  year: z.number().int().min(1900).max(2200),
  title: z.string().min(1), authors: z.string().min(1), venue: z.string().min(1),
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/).optional(),
  date: date.optional(), endDate: date.optional(), statusAsOf: date.optional(),
  volume: z.string().optional(), issue: z.string().optional(), pages: z.string().optional(), location: z.string().optional(),
  format: z.enum(['oral', 'poster']).optional(),
  featured: z.boolean().optional(), order: z.number().optional(), equalContribution: z.boolean().optional(),
  summary: bilingual.optional()
}).superRefine((v, ctx) => {
  const expected = { article: 'published', presentation: 'presented', manuscript: 'under-review', thesis: 'completed' };
  if (expected[v.type] !== v.status) ctx.addIssue({ code: 'custom', message: 'Publication type and status do not agree' });
  if (v.type === 'presentation' && (!v.date || !v.format)) ctx.addIssue({ code: 'custom', message: 'Presentations need date and format' });
});
export const activitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), year: z.number().int(),
  date: date.optional(), endDate: date.optional(),
  status: z.enum(['planned', 'completed']),
  category: z.enum(['fieldwork', 'training', 'exchange', 'seminar']),
  featured: z.boolean().optional(), order: z.number().optional(),
  location: bilingual, title: bilingual, summary: bilingual, body: bilingual,
  publicationIds: z.array(z.string()).optional(),
  cover: activityPhoto.optional(),
  sections: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: bilingual,
    paragraphs: z.array(bilingual).default([]),
    photos: z.array(activityPhoto).default([])
  })).optional(),
  relatedActivityIds: z.array(z.string()).optional(),
  links: z.array(z.object({ label: bilingual, href: z.url() })).optional()
});
